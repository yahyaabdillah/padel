"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import Button from "./Button";

export type ExportActionKind = "excel" | "pdf" | "image" | "csv";

export interface ExportAction {
  id: string;
  label: string;
  description?: string;
  filename?: string;
  kind?: ExportActionKind;
  icon?: ReactNode;
  disabled?: boolean;
}

interface ExportActionsButtonProps {
  actions: ExportAction[];
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "outline" | "soft" | "ghost";
  align?: "left" | "right";
  className?: string;
  onExport: (action: ExportAction) => void;
}

const iconClassName = "h-4 w-4";

function getDefaultIcon(kind?: ExportActionKind) {
  switch (kind) {
    case "excel":
    case "csv":
      return <FileSpreadsheet className={iconClassName} />;
    case "pdf":
      return <FileText className={iconClassName} />;
    case "image":
      return <ImageIcon className={iconClassName} />;
    default:
      return <Download className={iconClassName} />;
  }
}

export default function ExportActionsButton({
  actions,
  label = "Export",
  size = "sm",
  variant = "outline",
  align = "left",
  className = "",
  onExport,
}: ExportActionsButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const shouldUseDropdown = actions.length >= 3;

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleExport = (action: ExportAction) => {
    if (action.disabled) return;

    onExport(action);
    setOpen(false);
  };

  if (actions.length === 0) return null;

  if (!shouldUseDropdown) {
    return (
      <div className={["flex flex-wrap items-center gap-2", className].join(" ")}>
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={variant}
            size={size}
            startIcon={action.icon ?? getDefaultIcon(action.kind)}
            disabled={action.disabled}
            onClick={() => handleExport(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={["relative inline-flex", className].join(" ")}>
      <Button
        variant={variant}
        size={size}
        startIcon={<Download className={iconClassName} />}
        endIcon={<ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
      </Button>

      {open && (
        <div
          role="menu"
          className={[
            "absolute top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg",
            "dark:border-gray-800 dark:bg-gray-dark",
            align === "right" ? "right-0" : "left-0",
          ].join(" ")}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={() => handleExport(action)}
              className={[
                "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
                "hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50",
                "dark:hover:bg-white/[0.04]",
              ].join(" ")}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                {action.icon ?? getDefaultIcon(action.kind)}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-800 dark:text-white/90">
                  {action.label}
                </span>
                {action.description && (
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {action.description}
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
