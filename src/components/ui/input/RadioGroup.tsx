"use client";

import React, { useState } from "react";

export type RadioOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  name?: string;
  direction?: "vertical" | "horizontal";
  onChange?: (value: string) => void;
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  defaultValue,
  name,
  direction = "vertical",
  onChange,
  className = "",
}) => {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : internal;

  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  };

  return (
    <div className={`flex gap-3 ${direction === "vertical" ? "flex-col" : "flex-row flex-wrap"} ${className}`}>
      {options.map((opt) => {
        const checked = current === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex cursor-pointer items-start gap-2.5 ${opt.disabled ? "cursor-not-allowed opacity-50" : ""}`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={checked}
              name={name}
              disabled={opt.disabled}
              onClick={() => !opt.disabled && select(opt.value)}
              className={[
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                checked ? "border-[var(--color-primary)]" : "border-[var(--border-strong)]",
              ].join(" ")}
            >
              {checked && <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-primary)]" />}
            </button>
            <span className="select-none" onClick={() => !opt.disabled && select(opt.value)}>
              <span className="block text-sm font-medium text-[var(--text-heading)]">{opt.label}</span>
              {opt.description && <span className="block text-xs text-[var(--text-caption)]">{opt.description}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
};

export default RadioGroup;
