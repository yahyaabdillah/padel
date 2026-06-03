"use client";

import React from "react";

export interface StepItem {
  /** Label utama step */
  label: string;
  /** Deskripsi opsional di bawah label */
  description?: string;
  /** Icon kustom (SVG/ReactNode). Default: nomor urut / checkmark saat selesai */
  icon?: React.ReactNode;
}

export interface StepperProps {
  /** Daftar step yang ditampilkan */
  steps: StepItem[];
  /** Index step aktif saat ini (0-based) */
  currentStep: number;
  /** Arah layout stepper */
  orientation?: "horizontal" | "vertical";
  /** Callback saat sebuah step diklik (mengirim index step) */
  onStepClick?: (index: number) => void;
  /** Class tambahan untuk container */
  className?: string;
}

type StepState = "complete" | "active" | "upcoming";

const CheckIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
    aria-hidden="true"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const getState = (index: number, currentStep: number): StepState => {
  if (index < currentStep) return "complete";
  if (index === currentStep) return "active";
  return "upcoming";
};

// Gradient primary → accent untuk lingkaran complete & connector terisi
const FILLED_GRADIENT = "linear-gradient(135deg, var(--color-primary), var(--color-accent))";

/**
 * Stepper — indikator progress untuk form multi-step / wizard.
 * Mendukung orientasi horizontal & vertical, klik antar step, dan dark mode otomatis (token-driven).
 */
const Stepper: React.FC<StepperProps> = ({
  steps,
  currentStep,
  orientation = "horizontal",
  onStepClick,
  className = "",
}) => {
  const isHorizontal = orientation === "horizontal";

  // ── Style indikator (lingkaran) per state ──
  const circleClasses: Record<StepState, string> = {
    complete:
      "text-[var(--color-primary-text)] border-transparent shadow-theme-sm",
    active:
      "bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)] ring-4 ring-[var(--color-primary-light)] scale-110",
    upcoming:
      "bg-[var(--surface-card)] text-[var(--text-muted)] border-[var(--border-strong)]",
  };

  const labelClasses: Record<StepState, string> = {
    complete: "text-[var(--text-heading)]",
    active: "text-[var(--color-primary)] font-semibold",
    upcoming: "text-[var(--text-muted)]",
  };

  return (
    <div
      className={[
        "flex w-full",
        isHorizontal ? "flex-row items-start" : "flex-col",
        className,
      ].join(" ")}
      role="list"
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const state = getState(index, currentStep);
        const isLast = index === steps.length - 1;
        const isClickable = Boolean(onStepClick);

        // Garis penghubung "terisi" jika step ini sudah selesai
        const connectorFilled = index < currentStep;
        const connectorStyle = connectorFilled
          ? { backgroundImage: FILLED_GRADIENT }
          : undefined;
        const connectorBase = connectorFilled
          ? ""
          : "bg-[var(--border-default)]";

        // Style tambahan lingkaran: gradient saat complete, glow saat active
        const circleStyle: React.CSSProperties = {};
        if (state === "complete") circleStyle.backgroundImage = FILLED_GRADIENT;
        if (state === "active") circleStyle.boxShadow = "var(--glow-primary)";

        return (
          <div
            key={index}
            role="listitem"
            className={[
              "flex",
              isHorizontal
                ? "flex-1 flex-col items-center"
                : "flex-row gap-3",
              isHorizontal && isLast ? "flex-none" : "",
            ].join(" ")}
          >
            {/* Baris indikator + connector */}
            <div
              className={[
                "flex",
                isHorizontal
                  ? "w-full items-center"
                  : "flex-col items-center self-stretch",
              ].join(" ")}
            >
              {/* Spacer kiri (horizontal) supaya connector simetris terhadap lingkaran */}
              {isHorizontal && (
                <div
                  className={[
                    "h-0.5 flex-1 rounded-full transition-all duration-300",
                    index === 0 ? "opacity-0" : connectorBase,
                  ].join(" ")}
                  style={index === 0 ? undefined : connectorStyle}
                />
              )}

              {/* Indikator lingkaran */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={isClickable ? () => onStepClick?.(index) : undefined}
                aria-current={state === "active" ? "step" : undefined}
                style={circleStyle}
                className={[
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300",
                  circleClasses[state],
                  isClickable
                    ? "cursor-pointer hover:scale-105"
                    : "cursor-default",
                ].join(" ")}
              >
                {state === "complete" ? (
                  <CheckIcon />
                ) : step.icon ? (
                  <span className="flex h-5 w-5 items-center justify-center">
                    {step.icon}
                  </span>
                ) : (
                  index + 1
                )}
              </button>

              {/* Connector kanan (horizontal) / bawah (vertical) */}
              {!isLast &&
                (isHorizontal ? (
                  <div
                    className={[
                      "h-0.5 flex-1 rounded-full transition-all duration-300",
                      connectorBase,
                    ].join(" ")}
                    style={connectorStyle}
                  />
                ) : (
                  <div
                    className={[
                      "my-1 w-0.5 flex-1 rounded-full transition-all duration-300",
                      connectorBase,
                    ].join(" ")}
                    style={connectorStyle}
                  />
                ))}
            </div>

            {/* Teks label + description */}
            <div
              className={[
                isHorizontal
                  ? "mt-2 px-1 text-center"
                  : "pb-6 pt-1.5",
              ].join(" ")}
            >
              <p
                className={[
                  "text-sm leading-tight transition-colors",
                  labelClasses[state],
                ].join(" ")}
              >
                {step.label}
              </p>
              {step.description && (
                <p className="mt-0.5 text-xs text-[var(--text-caption)]">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
