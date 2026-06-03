"use client";

import React, { ReactNode, useState } from "react";

export type AccordionItem = {
  value: string;
  title: string;
  content: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

interface AccordionProps {
  items: AccordionItem[];
  type?: "single" | "multiple";
  defaultOpen?: string[];
  className?: string;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`h-5 w-5 shrink-0 transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const Accordion: React.FC<AccordionProps> = ({
  items,
  type = "single",
  defaultOpen = [],
  className = "",
}) => {
  const [openItems, setOpenItems] = useState<string[]>(defaultOpen);

  const toggle = (value: string) => {
    setOpenItems((prev) => {
      const isOpen = prev.includes(value);
      if (type === "single") {
        return isOpen ? [] : [value];
      }
      return isOpen ? prev.filter((v) => v !== value) : [...prev, value];
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item) => {
        const isOpen = openItems.includes(item.value);
        return (
          <div
            key={item.value}
            className={[
              "relative overflow-hidden rounded-xl border transition-all duration-300",
              isOpen
                ? "surface-premium border-[var(--color-primary)]/40 shadow-theme-sm"
                : "border-[var(--border-default)] bg-[var(--surface-card)]",
            ].join(" ")}
          >
            {/* Aksen kiri gradient primary → accent saat aktif */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-y-0 left-0 w-1 transition-opacity duration-300 ${
                isOpen ? "opacity-100" : "opacity-0"
              }`}
              style={{ backgroundImage: "linear-gradient(to bottom, var(--color-primary), var(--color-accent))" }}
            />
            <button
              type="button"
              disabled={item.disabled}
              onClick={() => !item.disabled && toggle(item.value)}
              aria-expanded={isOpen}
              className={[
                "flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors",
                item.disabled
                  ? "cursor-not-allowed opacity-50"
                  : "hover:bg-[var(--surface-muted)]",
                isOpen ? "text-[var(--color-primary)]" : "text-[var(--text-heading)]",
              ].join(" ")}
            >
              <span className="flex items-center gap-2.5 text-sm font-medium">
                {item.icon && (
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                      isOpen
                        ? "bg-[var(--color-primary)] text-[var(--color-primary-text)] shadow-theme-xs"
                        : "bg-[var(--surface-muted)] text-[var(--text-caption)]",
                    ].join(" ")}
                  >
                    {item.icon}
                  </span>
                )}
                {item.title}
              </span>
              <span className={isOpen ? "text-[var(--color-primary)]" : "text-[var(--text-caption)]"}>
                <ChevronIcon open={isOpen} />
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pt-0 text-sm text-[var(--text-body)]">
                  {isOpen ? <div className="animate-pop-in">{item.content}</div> : item.content}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;
