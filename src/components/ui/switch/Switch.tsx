"use client";

import React, { ReactNode, useState } from "react";

type SwitchVariant = "default" | "icon" | "labeled" | "theme";
type SwitchSize = "sm" | "md" | "lg";
type SwitchColor = "primary" | "emerald" | "accent";

interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  label?: string;
  variant?: SwitchVariant;
  size?: SwitchSize;
  color?: SwitchColor;
  /** untuk variant "icon": ikon saat ON & OFF (di handle) */
  onIcon?: ReactNode;
  offIcon?: ReactNode;
  /** untuk variant "labeled": teks dalam track */
  onLabel?: string;
  offLabel?: string;
  onChange?: (checked: boolean) => void;
  className?: string;
}

const sizeConfig = {
  sm: { track: "h-5 w-9", knob: "h-4 w-4", translate: "translate-x-4", icon: "h-2.5 w-2.5" },
  md: { track: "h-6 w-11", knob: "h-5 w-5", translate: "translate-x-5", icon: "h-3 w-3" },
  lg: { track: "h-7 w-[52px]", knob: "h-6 w-6", translate: "translate-x-6", icon: "h-3.5 w-3.5" },
};

const colorOn: Record<SwitchColor, string> = {
  primary: "bg-[var(--color-primary)]",
  emerald: "bg-emerald-500",
  accent: "bg-cyan-500",
};

// Track khusus untuk variant theme (gradient langit siang/malam)
const themeTrackOn = "bg-gradient-to-r from-amber-400 to-amber-500";
const themeTrackOff = "bg-gradient-to-r from-slate-700 to-indigo-900";

const SunIcon = ({ cls }: { cls: string }) => (
  <svg className={cls} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" /></svg>
);
const MoonIcon = ({ cls }: { cls: string }) => (
  <svg className={cls} fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
);
const CheckIcon = ({ cls }: { cls: string }) => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
);
const XIcon = ({ cls }: { cls: string }) => (
  <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
);

const Switch: React.FC<SwitchProps> = ({
  checked,
  defaultChecked = false,
  disabled = false,
  label,
  variant = "default",
  size = "md",
  color = "primary",
  onIcon,
  offIcon,
  onLabel,
  offLabel,
  onChange,
  className = "",
}) => {
  const [internal, setInternal] = useState(defaultChecked);
  const isOn = checked !== undefined ? checked : internal;
  const cfg = sizeConfig[size];

  const toggle = () => {
    if (disabled) return;
    const next = !isOn;
    if (checked === undefined) setInternal(next);
    onChange?.(next);
  };

  // ikon default untuk variant theme
  const resolvedOnIcon =
    variant === "theme" ? <SunIcon cls={cfg.icon} /> : onIcon ?? <CheckIcon cls={cfg.icon} />;
  const resolvedOffIcon =
    variant === "theme" ? <MoonIcon cls={cfg.icon} /> : offIcon ?? <XIcon cls={cfg.icon} />;

  const showHandleIcon = variant === "icon" || variant === "theme";

  return (
    <label className={`inline-flex cursor-pointer select-none items-center gap-2.5 ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        disabled={disabled}
        onClick={toggle}
        className={[
          "relative inline-flex shrink-0 items-center rounded-full transition-all duration-300",
          cfg.track,
          variant === "theme"
            ? isOn
              ? themeTrackOn
              : themeTrackOff
            : isOn
            ? colorOn[color]
            : "bg-[var(--border-strong)]",
        ].join(" ")}
      >
        {/* dekorasi variant theme: bintang saat malam */}
        {variant === "theme" && !isOn && (
          <>
            <span className="absolute left-1.5 top-1.5 h-0.5 w-0.5 rounded-full bg-white/80" />
            <span className="absolute left-3 top-3 h-0.5 w-0.5 rounded-full bg-white/60" />
            <span className="absolute left-2 top-4 h-px w-px rounded-full bg-white/50" />
          </>
        )}
        {/* labeled variant: teks dalam track */}
        {variant === "labeled" && (
          <>
            <span className={`absolute left-1.5 text-[9px] font-bold text-white transition-opacity ${isOn ? "opacity-100" : "opacity-0"}`}>{onLabel ?? "ON"}</span>
            <span className={`absolute right-1.5 text-[9px] font-bold text-[var(--text-caption)] transition-opacity ${isOn ? "opacity-0" : "opacity-100"}`}>{offLabel ?? "OFF"}</span>
          </>
        )}
        <span
          className={[
            "inline-flex items-center justify-center rounded-full bg-white shadow-theme-sm transition-transform duration-200",
            cfg.knob,
            isOn ? cfg.translate : "translate-x-0.5",
          ].join(" ")}
        >
          {showHandleIcon && (
            <span className={isOn ? "text-amber-500" : "text-slate-500"}>
              {isOn ? resolvedOnIcon : resolvedOffIcon}
            </span>
          )}
        </span>
      </button>
      {label && <span className="text-sm font-medium text-[var(--text-body)]">{label}</span>}
    </label>
  );
};

export default Switch;
