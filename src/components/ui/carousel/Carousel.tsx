"use client";

import React, { ReactNode, useEffect, useRef, useState, useCallback } from "react";

interface CarouselProps {
  children: ReactNode[];
  autoPlay?: boolean;
  interval?: number;
  showDots?: boolean;
  showArrows?: boolean;
  loop?: boolean;
  slidesToShow?: number;
  gap?: number;
  /** aktifkan grab & drag (default true) */
  draggable?: boolean;
  /** pause autoplay saat hover (default true) */
  pauseOnHover?: boolean;
  className?: string;
}

const Carousel: React.FC<CarouselProps> = ({
  children,
  autoPlay = false,
  interval = 4000,
  showDots = true,
  showArrows = true,
  loop = true,
  slidesToShow = 1,
  gap = 16,
  draggable = true,
  pauseOnHover = true,
  className = "",
}) => {
  const [active, setActive] = useState(0);
  const total = children.length;
  const maxIndex = Math.max(0, total - slidesToShow);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // drag state
  const dragState = useRef({ dragging: false, startX: 0, deltaX: 0, moved: false });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0) setActive(loop ? maxIndex : 0);
      else if (index > maxIndex) setActive(loop ? 0 : maxIndex);
      else setActive(index);
    },
    [loop, maxIndex]
  );

  const next = useCallback(() => goTo(active + 1), [active, goTo]);
  const prev = useCallback(() => goTo(active - 1), [active, goTo]);

  // autoplay (pause saat hover / drag)
  useEffect(() => {
    if (!autoPlay) return;
    if (pauseOnHover && isHovered) return;
    if (isDragging) return;
    timerRef.current = setInterval(next, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoPlay, interval, next, isHovered, isDragging, pauseOnHover]);

  const slideBasis = `calc((100% - ${gap * (slidesToShow - 1)}px) / ${slidesToShow})`;

  // ── Drag handlers ──
  const onPointerDown = (e: React.PointerEvent) => {
    if (!draggable) return;
    dragState.current = { dragging: true, startX: e.clientX, deltaX: 0, moved: false };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current.dragging) return;
    const delta = e.clientX - dragState.current.startX;
    dragState.current.deltaX = delta;
    if (Math.abs(delta) > 5) dragState.current.moved = true;
    setDragOffset(delta);
  };

  const endDrag = () => {
    if (!dragState.current.dragging) return;
    const delta = dragState.current.deltaX;
    const trackWidth = trackRef.current?.offsetWidth ?? 0;
    const slideWidth = (trackWidth - gap * (slidesToShow - 1)) / slidesToShow + gap;
    const threshold = slideWidth * 0.25;

    if (delta < -threshold) next();
    else if (delta > threshold) prev();

    dragState.current.dragging = false;
    setIsDragging(false);
    setDragOffset(0);
  };

  return (
    <div
      className={`relative w-full ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerLeave={endDrag}
          className={[
            "flex",
            isDragging ? "cursor-grabbing select-none" : draggable ? "cursor-grab" : "",
            isDragging ? "" : "transition-transform duration-500 ease-out",
          ].join(" ")}
          style={{
            transform: `translateX(calc(-${active} * (${slideBasis} + ${gap}px) + ${dragOffset}px))`,
            gap: `${gap}px`,
            touchAction: "pan-y",
          }}
        >
          {children.map((child, i) => (
            <div
              key={i}
              className="shrink-0"
              style={{ width: slideBasis }}
              onClickCapture={(e) => {
                // cegah klik tak sengaja setelah drag
                if (dragState.current.moved) {
                  e.preventDefault();
                  e.stopPropagation();
                }
              }}
            >
              {child}
            </div>
          ))}
        </div>
      </div>

      {showArrows && total > slidesToShow && (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-card)]/90 text-[var(--text-body)] shadow-theme-sm backdrop-blur transition hover:bg-[var(--surface-muted)] hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-card)]/90 text-[var(--text-body)] shadow-theme-sm backdrop-blur transition hover:bg-[var(--surface-muted)] hover:scale-105"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}

      {showDots && maxIndex > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === active ? "w-6 bg-[var(--color-primary)]" : "w-2 bg-[var(--border-strong)] hover:bg-[var(--color-primary)]/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Carousel;
