"use client";

import React, { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import InputLabel from "@/components/ui/input/InputLabel";

export type SelectOption = {
  value: string;
  label: string;
  desc?: string;
  disabled?: boolean;
};

interface SelectProps {
  options: SelectOption[];
  /** single: string | multiple: string[] */
  value?: string | string[];
  defaultValue?: string | string[];
  onChange?: (value: string | string[]) => void;
  placeholder?: string;
  label?: string;
  labelInfo?: ReactNode;
  labelInfoPlacement?: "top" | "bottom" | "left" | "right";
  hint?: string;
  multiple?: boolean;
  searchable?: boolean;
  /** izinkan tambah opsi baru yang belum ada */
  addable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  error?: boolean;
  size?: "sm" | "md";
  maxResults?: number;
  className?: string;
  onAddOption?: (label: string) => void;
  /** Jika diisi, klik "Tambah" akan memanggil handler ini (mis. buka modal) alih-alih langsung menambah opsi */
  onAddClick?: (label: string) => void;
  /** Prefix kata untuk tombol tambah (default "Tambah", mis. "Register") */
  addLabelPrefix?: string;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ className = "h-3.5 w-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Select: React.FC<SelectProps> = ({
  options: initialOptions,
  value,
  defaultValue,
  onChange,
  placeholder = "Pilih...",
  label,
  labelInfo,
  labelInfoPlacement,
  hint,
  multiple = false,
  searchable = false,
  addable = false,
  clearable = true,
  disabled = false,
  error = false,
  size = "md",
  maxResults = 50,
  className = "",
  onAddOption,
  onAddClick,
  addLabelPrefix = "Tambah",
}) => {
  const [options, setOptions] = useState<SelectOption[]>(initialOptions);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [internal, setInternal] = useState<string | string[]>(
    defaultValue ?? (multiple ? [] : "")
  );
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // portal-positioned dropdown rect (relative to viewport / fixed)
  const [menuRect, setMenuRect] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  useEffect(() => setOptions(initialOptions), [initialOptions]);

  const updateMenuPosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuRect({ left: r.left, top: r.bottom + 4, width: r.width });
  };

  // recompute position when opening + on scroll/resize while open
  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    const handler = () => updateMenuPosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [open]);

  const current = value !== undefined ? value : internal;
  const selectedArr = multiple
    ? (current as string[])
    : current
    ? [current as string]
    : [];

  // close on click outside (account for portaled menu)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(t) &&
        menuRef.current &&
        !menuRef.current.contains(t)
      ) {
        setOpen(false);
        setSearch("");
      } else if (ref.current && !ref.current.contains(t) && !menuRef.current) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (open && searchable && menuRect) searchRef.current?.focus();
  }, [open, searchable, menuRect]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? options.filter(
          (o) => o.label.toLowerCase().includes(q) || o.desc?.toLowerCase().includes(q)
        )
      : options;
    return list.slice(0, maxResults);
  }, [options, search, maxResults]);

  const exactMatch = options.some((o) => o.label.toLowerCase() === search.toLowerCase().trim());
  const showAdd = addable && search.trim().length > 0 && !exactMatch;

  const commit = (next: string | string[]) => {
    if (value === undefined) setInternal(next);
    onChange?.(next);
  };

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    if (multiple) {
      const arr = current as string[];
      const next = arr.includes(option.value)
        ? arr.filter((v) => v !== option.value)
        : [...arr, option.value];
      commit(next);
    } else {
      commit(option.value);
      setOpen(false);
      setSearch("");
    }
  };

  const handleAdd = () => {
    const label = search.trim();
    // Jika ada onAddClick, delegasikan (mis. buka modal) tanpa langsung menambah
    if (onAddClick) {
      onAddClick(label);
      setOpen(false);
      setSearch("");
      return;
    }
    const newOption: SelectOption = { value: `new-${Date.now()}`, label };
    setOptions((prev) => [newOption, ...prev]);
    onAddOption?.(label);
    handleSelect(newOption);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    commit(multiple ? [] : "");
  };

  const removeChip = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    commit((current as string[]).filter((v) => v !== val));
  };

  const labelOf = (val: string) => options.find((o) => o.value === val)?.label ?? val;
  const hasValue = selectedArr.length > 0;
  const heightCls = size === "sm" ? "min-h-9 text-xs" : "min-h-11 text-sm";

  return (
    <div className={`${open ? "relative z-[60]" : ""} ${className}`} ref={ref}>
      {label && (
        <InputLabel
          label={label}
          tooltip={labelInfo}
          tooltipPlacement={labelInfoPlacement}
        />
      )}
      <div className="relative">
        <button
          type="button"
          ref={triggerRef}
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          className={[
            "flex w-full items-center justify-between gap-2 rounded-lg border bg-transparent px-3 py-2 shadow-theme-xs transition",
            heightCls,
            disabled ? "cursor-not-allowed bg-[var(--color-disabled-bg)]" : "",
            error
              ? "border-[var(--color-error,#ef4444)]"
              : open
              ? "border-[var(--color-primary)] ring-3 ring-[rgba(37,99,235,0.12)]"
              : "border-[var(--border-default)] hover:border-[var(--border-strong)]",
          ].join(" ")}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1.5 overflow-hidden text-left">
            {!hasValue && <span className="text-[var(--text-muted)]">{placeholder}</span>}
            {multiple
              ? (current as string[]).map((val) => (
                  <span
                    key={val}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-light)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary)]"
                  >
                    {labelOf(val)}
                    <span onClick={(e) => removeChip(val, e)} className="cursor-pointer hover:opacity-70">
                      <XIcon className="h-3 w-3" />
                    </span>
                  </span>
                ))
              : hasValue && <span className="truncate text-[var(--text-heading)]">{labelOf(selectedArr[0])}</span>}
          </div>
          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            {clearable && hasValue && !disabled && (
              <span onClick={handleClear} className="cursor-pointer hover:text-[var(--text-body)]">
                <XIcon />
              </span>
            )}
            <ChevronIcon open={open} />
          </div>
        </button>

        {open && menuRect &&
          createPortal(
            <div
              ref={menuRef}
              style={{
                position: "fixed",
                left: menuRect.left,
                top: menuRect.top,
                width: menuRect.width,
                zIndex: 100000,
              }}
              className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-popover)] shadow-theme-xl"
            >
              {searchable && (
                <div className="border-b border-[var(--border-light)] p-2">
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        // Enter on a no-match query with addable → add new
                        if (showAdd) {
                          handleAdd();
                        } else if (filtered.length > 0) {
                          handleSelect(filtered[0]);
                        }
                      } else if (e.key === "Escape") {
                        setOpen(false);
                        setSearch("");
                      }
                    }}
                    placeholder="Cari..."
                    className="h-9 w-full rounded-lg bg-[var(--surface-muted)] px-3 text-sm text-[var(--text-heading)] outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              )}
              <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                {filtered.length === 0 && !showAdd && (
                  <p className="py-6 text-center text-xs text-[var(--text-muted)]">
                    Tidak ada hasil
                  </p>
                )}
                {showAdd && (
                  <button
                    type="button"
                    onClick={handleAdd}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-primary)] hover:bg-[var(--surface-muted)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    {addLabelPrefix} &quot;{search.trim()}&quot;
                  </button>
                )}
                {filtered.map((option) => {
                  const isSelected = selectedArr.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={option.disabled}
                      onClick={() => handleSelect(option)}
                      className={[
                        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                        option.disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[var(--surface-muted)]",
                        isSelected ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium" : "text-[var(--text-body)]",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <p className="truncate">{option.label}</p>
                        {option.desc && <p className="truncate text-[10px] text-[var(--text-muted)]">{option.desc}</p>}
                      </div>
                      {isSelected && <CheckIcon />}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )}
      </div>
      {hint && <p className={`mt-1.5 text-xs ${error ? "text-[var(--color-error,#ef4444)]" : "text-[var(--text-caption)]"}`}>{hint}</p>}
    </div>
  );
};

export default Select;
