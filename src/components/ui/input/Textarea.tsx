"use client";

import React, { useState } from "react";

interface TextareaProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  hint?: string;
  rows?: number;
  maxLength?: number;
  showCount?: boolean;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  resize?: "none" | "vertical" | "horizontal" | "both";
  name?: string;
  id?: string;
  className?: string;
  onChange?: (value: string) => void;
}

const resizeMap = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

const Textarea: React.FC<TextareaProps> = ({
  value,
  defaultValue,
  placeholder,
  label,
  hint,
  rows = 4,
  maxLength,
  showCount = false,
  disabled = false,
  error = false,
  required = false,
  resize = "vertical",
  name,
  id,
  className = "",
  onChange,
}) => {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : internal;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    if (value === undefined) setInternal(v);
    onChange?.(v);
  };

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-error,#ef4444)]">*</span>}
        </label>
      )}
      <textarea
        id={id}
        name={name}
        value={current}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
        required={required}
        onChange={handleChange}
        className={[
          "w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs transition",
          "text-[var(--text-heading)] placeholder:text-[var(--text-muted)]",
          "focus:outline-none focus:ring-3",
          resizeMap[resize],
          disabled ? "cursor-not-allowed bg-[var(--color-disabled-bg)] text-[var(--color-disabled-text)]" : "",
          error
            ? "border-[var(--color-error,#ef4444)] focus:ring-[rgba(239,68,68,0.15)]"
            : "border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[rgba(37,99,235,0.12)]",
        ].join(" ")}
      />
      <div className="mt-1.5 flex items-center justify-between">
        {hint ? (
          <p className={`text-xs ${error ? "text-[var(--color-error,#ef4444)]" : "text-[var(--text-caption)]"}`}>{hint}</p>
        ) : <span />}
        {showCount && maxLength && (
          <span className="text-xs text-[var(--text-muted)]">{current.length}/{maxLength}</span>
        )}
      </div>
    </div>
  );
};

export default Textarea;
