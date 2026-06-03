"use client";

import React, { useState } from "react";

interface CheckboxProps {
  label?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  description?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked,
  defaultChecked = false,
  disabled = false,
  description,
  onChange,
  className = "",
}) => {
  const [internal, setInternal] = useState(defaultChecked);
  const isChecked = checked !== undefined ? checked : internal;

  const toggle = () => {
    if (disabled) return;
    const next = !isChecked;
    if (checked === undefined) setInternal(next);
    onChange?.(next);
  };

  return (
    <label className={`flex cursor-pointer items-start gap-2.5 ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={toggle}
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          isChecked
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
            : "border-[var(--border-strong)] bg-transparent",
        ].join(" ")}
      >
        {isChecked && (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        )}
      </button>
      {(label || description) && (
        <span onClick={toggle} className="select-none">
          {label && <span className="block text-sm font-medium text-[var(--text-heading)]">{label}</span>}
          {description && <span className="block text-xs text-[var(--text-caption)]">{description}</span>}
        </span>
      )}
    </label>
  );
};

export default Checkbox;
