"use client";

// PadelHub — reusable image cropper (no external dependency).
// Renders a fixed-aspect crop frame over a pan/zoomable image. The user drags to
// reposition and uses the slider (or wheel) to zoom; on confirm the visible crop
// region is rendered to a canvas and returned as a data URL at the target output
// size. Designed to be opened inside a ModalDialog (see ImageCropperModal).
//
// Pure client component — works with any image source (object URL / data URL).

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

export interface CropResult {
  /** cropped image encoded as a data URL (image/jpeg or image/png) */
  dataUrl: string;
  width: number;
  height: number;
}

interface ImageCropperProps {
  /** source image (object URL or data URL) */
  src: string;
  /** target aspect ratio (width / height), e.g. 16/9 */
  aspect: number;
  /** output width in px (height derived from aspect). Default 1280. */
  outputWidth?: number;
  /** output mime. Default image/jpeg. */
  mimeType?: "image/jpeg" | "image/png";
  /** jpeg quality 0–1. Default 0.9. */
  quality?: number;
  /** called whenever the crop function is ready / re-created */
  onReady?: (getCrop: () => CropResult | null) => void;
}

interface Transform {
  /** zoom multiplier relative to the "cover" base scale */
  zoom: number;
  /** image offset (px) within the frame, from the centered cover position */
  offsetX: number;
  offsetY: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Interactive crop surface. Exposes the crop function via onReady so the parent
 * (modal) can trigger it from its footer button.
 */
const ImageCropper: React.FC<ImageCropperProps> = ({
  src,
  aspect,
  outputWidth = 1280,
  mimeType = "image/jpeg",
  quality = 0.9,
  onReady,
}) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [transform, setTransform] = useState<Transform>({
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  });

  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  }>({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  // ── measure the crop frame (width-driven, height from aspect) ──
  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      setFrameSize({ w, h: w / aspect });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  // ── load the source image to read natural dimensions ──
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setTransform({ zoom: 1, offsetX: 0, offsetY: 0 });
    };
    img.src = src;
  }, [src]);

  // base "cover" scale: smallest scale that fully covers the frame
  const baseScale =
    natural.w > 0 && frameSize.w > 0
      ? Math.max(frameSize.w / natural.w, frameSize.h / natural.h)
      : 1;

  // clamp offsets so the image always covers the frame at the current zoom
  const clampOffsets = useCallback(
    (t: Transform): Transform => {
      const scale = baseScale * t.zoom;
      const imgW = natural.w * scale;
      const imgH = natural.h * scale;
      const maxX = Math.max(0, (imgW - frameSize.w) / 2);
      const maxY = Math.max(0, (imgH - frameSize.h) / 2);
      return {
        ...t,
        offsetX: Math.min(maxX, Math.max(-maxX, t.offsetX)),
        offsetY: Math.min(maxY, Math.max(-maxY, t.offsetY)),
      };
    },
    [baseScale, natural.w, natural.h, frameSize.w, frameSize.h],
  );

  const setZoom = useCallback(
    (z: number) => {
      setTransform((t) =>
        clampOffsets({ ...t, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)) }),
      );
    },
    [clampOffsets],
  );

  // ── pointer drag to pan ──
  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: transform.offsetX,
      baseY: transform.offsetY,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTransform((t) =>
      clampOffsets({
        ...t,
        offsetX: dragRef.current.baseX + dx,
        offsetY: dragRef.current.baseY + dy,
      }),
    );
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.active = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    setZoom(transform.zoom - e.deltaY * 0.0015);
  };

  // ── produce the cropped data URL ──
  const getCrop = useCallback((): CropResult | null => {
    const img = imgRef.current;
    if (!img || natural.w === 0 || frameSize.w === 0) return null;

    const scale = baseScale * transform.zoom;
    // top-left of the (scaled) image relative to the frame's top-left
    const imgLeft = (frameSize.w - natural.w * scale) / 2 + transform.offsetX;
    const imgTop = (frameSize.h - natural.h * scale) / 2 + transform.offsetY;

    // source rect (in natural pixels) that maps onto the frame
    const sx = Math.max(0, -imgLeft / scale);
    const sy = Math.max(0, -imgTop / scale);
    const sWidth = frameSize.w / scale;
    const sHeight = frameSize.h / scale;

    const outW = outputWidth;
    const outH = Math.round(outputWidth / aspect);

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    if (mimeType === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);
    }
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      sx,
      sy,
      Math.min(sWidth, natural.w - sx),
      Math.min(sHeight, natural.h - sy),
      0,
      0,
      outW,
      outH,
    );

    return {
      dataUrl: canvas.toDataURL(mimeType, quality),
      width: outW,
      height: outH,
    };
  }, [
    natural.w,
    natural.h,
    frameSize.w,
    frameSize.h,
    baseScale,
    transform.zoom,
    transform.offsetX,
    transform.offsetY,
    outputWidth,
    aspect,
    mimeType,
    quality,
  ]);

  // expose the latest getCrop to the parent
  useEffect(() => {
    onReady?.(getCrop);
  }, [getCrop, onReady]);

  const scale = baseScale * transform.zoom;

  return (
    <div className="space-y-4">
      {/* Crop frame */}
      <div
        ref={frameRef}
        className="relative w-full select-none overflow-hidden rounded-xl bg-[var(--surface-muted)]"
        style={{ height: frameSize.h || undefined, touchAction: "none", cursor: "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {natural.w > 0 && frameSize.w > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt="Crop preview"
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            style={{
              width: natural.w * scale,
              height: natural.h * scale,
              transform: `translate(calc(-50% + ${transform.offsetX}px), calc(-50% + ${transform.offsetY}px))`,
            }}
          />
        )}

        {/* rule-of-thirds grid overlay */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 ring-1 ring-inset ring-white/40" />
          <div className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
          <div className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
          <div className="absolute left-0 top-1/3 h-px w-full bg-white/25" />
          <div className="absolute left-0 top-2/3 h-px w-full bg-white/25" />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setZoom(transform.zoom - 0.2)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-caption)] transition-colors hover:text-[var(--text-heading)]"
          aria-label="Perkecil"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={transform.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--surface-muted)] accent-[var(--color-primary)]"
          aria-label="Zoom"
        />
        <button
          type="button"
          onClick={() => setZoom(transform.zoom + 0.2)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-caption)] transition-colors hover:text-[var(--text-heading)]"
          aria-label="Perbesar"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTransform({ zoom: 1, offsetX: 0, offsetY: 0 })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-caption)] transition-colors hover:text-[var(--text-heading)]"
          aria-label="Reset"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <p className="text-center text-xs text-[var(--text-muted)]">
        Geser gambar untuk mengatur posisi, gunakan slider untuk zoom.
      </p>
    </div>
  );
};

export default ImageCropper;
