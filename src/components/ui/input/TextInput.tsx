"use client";

import React, { ReactNode, useState } from "react";

type InputType = "text" | "email" | "password" | "number" | "url" | "search";

interface TextInputProps {
  type?: InputType;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  label?: string;
  hint?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  /** Aktifkan validasi bawaan (email regex untuk type=email) */
  validate?: boolean;
  /** Override state error/success dari luar */
  error?: boolean;
  success?: boolean;
  errorText?: string;
  successText?: string;
  name?: string;
  id?: string;
  className?: string;
  onChange?: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TextInput: React.FC<TextInputProps> = ({
  type = "text",
  value,
  defaultValue,
  placeholder,
  label,
  hint,
  startIcon,
  endIcon,
  disabled = false,
  required = false,
  validate = false,
  error,
  success,
  errorText,
  successText,
  name,
  id,
  className = "",
  onChange,
  onValidChange,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const currentValue = value !== undefined ? value : internalValue;

  // ── Built-in validation ──
  let autoError = false;
  let autoMessage = "";
  if (validate && touched && currentValue.length > 0) {
    if (type === "email" && !EMAIL_REGEX.test(currentValue)) {
      autoError = true;
      autoMessage = errorText || "Format email tidak valid";
    }
  }
  if (validate && touched && required && currentValue.length === 0) {
    autoError = true;
    autoMessage = "Field ini wajib diisi";
  }

  const isError = error ?? autoError;
  const isSuccess = success ?? (validate && touched && currentValue.length > 0 && !autoError && type === "email");
  const message = isError ? (errorText || autoMessage) : isSuccess ? successText : hint;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (value === undefined) setInternalValue(v);
    onChange?.(v);
    if (validate && type === "email") {
      onValidChange?.(EMAIL_REGEX.test(v));
    }
  };

  const resolvedType = type === "password" ? (showPassword ? "text" : "password") : type;

  const stateRing = isError
    ? "border-[var(--color-error,#ef4444)] focus:ring-[rgba(239,68,68,0.15)]"
    : isSuccess
    ? "border-[var(--color-emerald)] focus:ring-[rgba(16,185,129,0.15)]"
    : "border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[rgba(37,99,235,0.12)]";

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-error,#ef4444)]">*</span>}
        </label>
      )}
      <div className="relative">
        {startIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            {startIcon}
          </span>
        )}
        <input
          id={id}
          name={name}
          type={resolvedType}
          value={currentValue}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          className={[
            "h-11 w-full rounded-lg border bg-transparent text-sm shadow-theme-xs transition",
            "text-[var(--text-heading)] placeholder:text-[var(--text-muted)]",
            "focus:outline-none focus:ring-3",
            startIcon ? "pl-10" : "pl-4",
            endIcon || type === "password" ? "pr-10" : "pr-4",
            "py-2.5",
            disabled ? "cursor-not-allowed bg-[var(--color-disabled-bg)] text-[var(--color-disabled-text)]" : "",
            stateRing,
          ].join(" ")}
        />
        {type === "password" ? (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-body)]"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            )}
          </button>
        ) : (
          endIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {endIcon}
            </span>
          )
        )}
      </div>
      {message && (
        <p
          className={[
            "mt-1.5 text-xs",
            isError ? "text-[var(--color-error,#ef4444)]" : isSuccess ? "text-[var(--color-emerald)]" : "text-[var(--text-caption)]",
          ].join(" ")}
        >
          {message}
        </p>
      )}
    </div>
  );
};

export default TextInput;
