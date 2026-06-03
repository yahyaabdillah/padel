"use client";

import React, { useEffect } from "react";

export type DrawerSide = "left" | "right" | "top" | "bottom";

export interface DrawerProps {
  /** Status terbuka/tertutup */
  isOpen: boolean;
  /** Callback untuk menutup drawer (klik overlay / tombol close / Escape) */
  onClose: () => void;
  /** Sisi munculnya panel */
  side?: DrawerSide;
  /** Ukuran panel (Tailwind width/height class), mis. "max-w-md" atau "h-80" */
  size?: string;
  /** Judul di header */
  title?: string;
  /** Konten body (scrollable) */
  children: React.ReactNode;
  /** Konten footer (sticky di bawah) */
  footer?: React.ReactNode;
  /** Sembunyikan tombol close di header */
  hideCloseButton?: boolean;
  /** Class tambahan untuk panel */
  className?: string;
}

const CloseIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

const isHorizontalSide = (side: DrawerSide) => side === "left" || side === "right";

/**
 * Drawer — panel geser (sheet) dari salah satu sisi layar.
 * Fitur: overlay backdrop blur, animasi slide, lock body scroll, tutup via Escape, body scrollable.
 */
const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  side = "right",
  size,
  title,
  children,
  footer,
  hideCloseButton = false,
  className = "",
}) => {
  // Tutup via tombol Escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Lock body scroll saat drawer terbuka
  useEffect(() => {
    if (isOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [isOpen]);

  const horizontal = isHorizontalSide(side);

  // ── Posisi panel relatif terhadap viewport ──
  const positionClasses: Record<DrawerSide, string> = {
    left: "left-0 top-0 h-full",
    right: "right-0 top-0 h-full",
    top: "left-0 top-0 w-full",
    bottom: "bottom-0 left-0 w-full",
  };

  // ── Default size per orientasi ──
  const defaultSize = horizontal ? "w-full max-w-md" : "h-1/2 max-h-[80vh]";

  // ── Transform untuk animasi slide ──
  const openTransform = "translate-x-0 translate-y-0";
  const closedTransform: Record<DrawerSide, string> = {
    left: "-translate-x-full",
    right: "translate-x-full",
    top: "-translate-y-full",
    bottom: "translate-y-full",
  };

  // ── Rounded sesuai sisi ──
  const roundedClasses: Record<DrawerSide, string> = {
    left: "rounded-r-2xl",
    right: "rounded-l-2xl",
    top: "rounded-b-2xl",
    bottom: "rounded-t-2xl",
  };

  return (
    <div
      className={[
        "fixed inset-0 z-99999",
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      ].join(" ")}
      aria-hidden={!isOpen}
    >
      {/* Overlay backdrop */}
      <div
        onClick={onClose}
        className={[
          "absolute inset-0 bg-gray-900/50 backdrop-blur-[2px] transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Drawer"}
        className={[
          "absolute flex flex-col bg-[var(--surface-popover)] shadow-theme-xl transition-transform duration-300 ease-out",
          positionClasses[side],
          roundedClasses[side],
          size ?? defaultSize,
          isOpen ? openTransform : closedTransform[side],
          className,
        ].join(" ")}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-light)] px-5 py-4">
            {title ? (
              <h3 className="text-base font-semibold text-[var(--text-heading)]">
                {title}
              </h3>
            ) : (
              <span />
            )}
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-caption)] transition-colors hover:text-[var(--text-heading)]"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        )}

        {/* Body scrollable */}
        <div className="custom-scrollbar flex-1 overflow-auto px-5 py-4 text-[var(--text-body)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="shrink-0 border-t border-[var(--border-light)] px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Drawer;
