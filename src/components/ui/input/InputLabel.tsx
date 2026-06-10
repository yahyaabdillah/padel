"use client";

import React, { ReactNode } from "react";
import { Info } from "lucide-react";
import Tooltip from "@/components/ui/tooltip/Tooltip";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface InputLabelProps {
  label: ReactNode;
  htmlFor?: string;
  required?: boolean;
  tooltip?: ReactNode;
  tooltipPlacement?: TooltipPlacement;
  className?: string;
}

const InputLabel: React.FC<InputLabelProps> = ({
  label,
  htmlFor,
  required = false,
  tooltip,
  tooltipPlacement = "top",
  className = "",
}) => {
  return (
    <div className={`mb-1.5 flex items-center gap-1.5 ${className}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--text-body)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-error,#ef4444)]">*</span>}
      </label>
      {tooltip && (
        <Tooltip content={tooltip} placement={tooltipPlacement}>
          <button
            type="button"
            aria-label={`Info ${typeof label === "string" ? label : "input"}`}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(37,99,235,0.18)]"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default InputLabel;
