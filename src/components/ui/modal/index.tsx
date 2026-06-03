"use client";
import React, { useRef, useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  isFullscreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  className,
  showCloseButton = true,
  isFullscreen = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const contentClasses = isFullscreen
    ? "w-full h-full"
    : "relative w-full rounded-3xl bg-[var(--surface-card)] max-h-[calc(100vh-2rem)] flex flex-col";

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4 modal sm:p-6">
      {!isFullscreen && (
        <div
          className="fixed inset-0 h-full w-full bg-gray-900/50 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}
      <div
        ref={modalRef}
        className={`${contentClasses}  ${className ?? ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-[var(--surface-muted)] text-[var(--text-caption)] transition-colors hover:text-[var(--text-heading)] sm:right-5 sm:top-5"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
        {/* Scroll area: vertikal + horizontal */}
        <div className={isFullscreen ? "h-full overflow-auto" : "overflow-auto custom-scrollbar"}>
          {children}
        </div>
      </div>
    </div>
  );
};

/**
 * ModalDialog — wrapper konvensi dengan header / body / footer.
 * Body otomatis scroll (vertikal & horizontal) saat konten besar.
 */
interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  footer,
  children,
  size = "md",
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className={sizeMap[size]}>
      <div className="flex max-h-[calc(100vh-2rem)] flex-col">
        {(title || description) && (
          <div className="shrink-0 border-b border-[var(--border-light)] px-6 py-4 pr-14">
            {title && <h3 className="text-lg font-semibold text-[var(--text-heading)]">{title}</h3>}
            {description && <p className="mt-1 text-sm text-[var(--text-caption)]">{description}</p>}
          </div>
        )}
        <div className="flex-1 overflow-auto custom-scrollbar px-6 py-5">{children}</div>
        {footer && (
          <div className="shrink-0 border-t border-[var(--border-light)] px-6 py-4">{footer}</div>
        )}
      </div>
    </Modal>
  );
};
