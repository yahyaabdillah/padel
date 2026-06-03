"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";

export type TabItem = {
  value: string;
  label: string;
  icon?: ReactNode;
  badge?: string | number;
  disabled?: boolean;
};

type TabsVariant = "underline" | "pill" | "segment";
type TabsSize = "sm" | "md";

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  fullWidth?: boolean;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  items,
  value,
  onChange,
  variant = "underline",
  size = "md",
  fullWidth = false,
  className = "",
}) => {
  const sizeClasses: Record<TabsSize, string> = {
    sm: "text-xs py-2 px-3 gap-1.5",
    md: "text-sm py-2.5 px-4 gap-2",
  };

  const listRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, top: 0, height: 0 });

  // Hitung posisi indikator yang meluncur
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (activeEl) {
      setIndicator({
        left: activeEl.offsetLeft,
        width: activeEl.offsetWidth,
        top: activeEl.offsetTop,
        height: activeEl.offsetHeight,
      });
    }
  }, [value, items, variant, size, fullWidth]);

  const renderContent = (item: TabItem, isActive: boolean) => (
    <>
      {item.icon && <span className="flex items-center shrink-0">{item.icon}</span>}
      {item.label}
      {item.badge !== undefined && (
        <span
          className={`ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold transition-colors ${
            isActive
              ? "bg-[var(--color-primary)] text-[var(--color-primary-text)]"
              : "bg-[var(--surface-muted)] text-[var(--text-caption)]"
          }`}
        >
          {item.badge}
        </span>
      )}
    </>
  );

  // ── UNDERLINE — indikator meluncur ──
  if (variant === "underline") {
    return (
      <div ref={listRef} className={`relative flex items-center border-b border-[var(--border-default)] ${fullWidth ? "w-full" : ""} ${className}`}>
        {items.map((item) => {
          const isActive = item.value === value;
          return (
            <button
              key={item.value}
              data-tab={item.value}
              type="button"
              disabled={item.disabled}
              onClick={() => !item.disabled && onChange(item.value)}
              className={[
                "relative z-1 inline-flex items-center justify-center font-medium transition-colors duration-200",
                sizeClasses[size],
                fullWidth ? "flex-1" : "",
                item.disabled ? "cursor-not-allowed opacity-50" : "",
                isActive ? "text-[var(--color-primary)]" : "text-[var(--text-caption)] hover:text-[var(--text-heading)]",
              ].join(" ")}
            >
              {renderContent(item, isActive)}
            </button>
          );
        })}
        {/* Indikator meluncur */}
        <span
          className="absolute bottom-0 h-0.5 rounded-full bg-[var(--color-primary)] transition-all duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width, boxShadow: "var(--glow-primary)" }}
        />
      </div>
    );
  }

  // ── SEGMENT — kotak dengan indikator meluncur ──
  if (variant === "segment") {
    return (
      <div ref={listRef} className={`relative inline-flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-1 ${fullWidth ? "w-full" : ""} ${className}`}>
        {/* Indikator meluncur */}
        <span
          className="absolute rounded-lg bg-[var(--color-primary)] shadow-theme-sm transition-all duration-300 ease-out"
          style={{ left: indicator.left, width: indicator.width, top: indicator.top, height: indicator.height }}
        />
        {items.map((item) => {
          const isActive = item.value === value;
          return (
            <button
              key={item.value}
              data-tab={item.value}
              type="button"
              disabled={item.disabled}
              onClick={() => !item.disabled && onChange(item.value)}
              className={[
                "relative z-1 inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200",
                sizeClasses[size],
                fullWidth ? "flex-1" : "",
                item.disabled ? "cursor-not-allowed opacity-50" : "",
                isActive ? "text-[var(--color-primary-text)]" : "text-[var(--text-caption)] hover:text-[var(--text-heading)]",
              ].join(" ")}
            >
              {item.icon && <span className="flex items-center shrink-0">{item.icon}</span>}
              {item.label}
              {item.badge !== undefined && (
                <span className={`ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? "bg-white/25 text-[var(--color-primary-text)]" : "bg-[var(--surface-card)] text-[var(--text-caption)]"}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ── PILL ──
  return (
    <div ref={listRef} className={`relative inline-flex items-center gap-1 rounded-xl bg-[var(--surface-muted)] p-1 ${fullWidth ? "w-full" : ""} ${className}`}>
      <span
        className="absolute rounded-lg bg-[var(--surface-card)] shadow-theme-xs transition-all duration-300 ease-out"
        style={{ left: indicator.left, width: indicator.width, top: indicator.top, height: indicator.height }}
      />
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <button
            key={item.value}
            data-tab={item.value}
            type="button"
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange(item.value)}
            className={[
              "relative z-1 inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200",
              sizeClasses[size],
              fullWidth ? "flex-1" : "",
              item.disabled ? "cursor-not-allowed opacity-50" : "",
              isActive ? "text-[var(--color-primary)]" : "text-[var(--text-caption)] hover:text-[var(--text-heading)]",
            ].join(" ")}
          >
            {renderContent(item, isActive)}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
