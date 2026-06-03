"use client";

import React, { useMemo, useState } from "react";
import type { FormDefinition, FormField } from "@/data/padel/forms";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import Select from "@/components/ui/select/Select";
import RadioGroup from "@/components/ui/input/RadioGroup";
import Checkbox from "@/components/ui/input/Checkbox";
import Switch from "@/components/ui/switch/Switch";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import Button from "@/components/ui/button/Button";

export type FormValues = Record<string, string | number | boolean>;

interface DynamicFormRendererProps {
  form: FormDefinition;
  /** controlled initial values; otherwise derived from field defaults */
  initialValues?: FormValues;
  /** hide the submit button (e.g. live preview) */
  hideSubmit?: boolean;
  submitLabel?: string;
  onSubmit?: (values: FormValues) => void;
  onChange?: (values: FormValues) => void;
  className?: string;
}

function defaultValueFor(field: FormField): string | number | boolean {
  if (field.defaultValue !== undefined) return field.defaultValue;
  if (field.type === "switch" || field.type === "checkbox") return false;
  if (field.type === "number" || field.type === "money") return "";
  return "";
}

const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  form,
  initialValues,
  hideSubmit = false,
  submitLabel,
  onSubmit,
  onChange,
  className = "",
}) => {
  const seeded = useMemo<FormValues>(() => {
    const base: FormValues = {};
    for (const f of form.fields) base[f.name] = defaultValueFor(f);
    return { ...base, ...(initialValues ?? {}) };
  }, [form, initialValues]);

  const [values, setValues] = useState<FormValues>(seeded);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const setValue = (name: string, value: string | number | boolean) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      onChange?.(next);
      return next;
    });
    if (errors[name]) setErrors((e) => ({ ...e, [name]: false }));
  };

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    for (const f of form.fields) {
      if (!f.required) continue;
      const v = values[f.name];
      const empty =
        v === "" ||
        v === undefined ||
        v === null ||
        (typeof v === "boolean" && f.type === "checkbox" && v === false);
      if (empty) next[f.name] = true;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit?.(values);
  };

  const renderField = (field: FormField) => {
    const { name, label, type, required, placeholder, hint } = field;
    const error = errors[name];
    const strVal = (values[name] ?? "") as string;

    switch (type) {
      case "textarea":
        return (
          <Textarea
            label={label}
            placeholder={placeholder}
            hint={hint}
            required={required}
            error={error}
            value={strVal}
            onChange={(v) => setValue(name, v)}
          />
        );
      case "select":
        return (
          <Select
            label={label}
            placeholder={placeholder ?? "Select..."}
            error={error}
            options={(field.options ?? []).map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={strVal}
            searchable={(field.options?.length ?? 0) > 6}
            onChange={(v) => setValue(name, Array.isArray(v) ? v[0] ?? "" : v)}
          />
        );
      case "radio":
        return (
          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--text-body)]">
              {label}
              {required && (
                <span className="ml-0.5 text-[var(--color-error,#ef4444)]">*</span>
              )}
            </p>
            <RadioGroup
              direction="horizontal"
              options={(field.options ?? []).map((o) => ({
                value: o.value,
                label: o.label,
              }))}
              value={strVal}
              onChange={(v) => setValue(name, v)}
            />
          </div>
        );
      case "checkbox":
        return (
          <Checkbox
            label={label}
            checked={Boolean(values[name])}
            onChange={(c) => setValue(name, c)}
          />
        );
      case "switch":
        return (
          <Switch
            label={label}
            checked={Boolean(values[name])}
            onChange={(c) => setValue(name, c)}
          />
        );
      case "date":
      case "datetime":
        return (
          <DatePicker
            label={label}
            mode="single"
            error={error}
            placeholder={placeholder ?? "Select date"}
            value={strVal || null}
            onChange={(v) =>
              setValue(
                name,
                v instanceof Date ? v.toISOString() : (v as string) ?? "",
              )
            }
          />
        );
      case "upload":
        return (
          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--text-body)]">
              {label}
              {required && (
                <span className="ml-0.5 text-[var(--color-error,#ef4444)]">*</span>
              )}
            </p>
            <label
              className={[
                "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
                error
                  ? "border-[var(--color-error,#ef4444)]"
                  : "border-[var(--border-strong)] hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-500/5",
              ].join(" ")}
            >
              <svg
                className="h-6 w-6 text-[var(--text-muted)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              <span className="text-sm text-[var(--text-body)]">
                {strVal ? strVal : "Click to upload a file"}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                PNG, JPG or PDF — dummy upload
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) =>
                  setValue(name, e.target.files?.[0]?.name ?? "")
                }
              />
            </label>
          </div>
        );
      case "phone":
        return (
          <TextInput
            type="text"
            label={label}
            placeholder={placeholder ?? "+62 812 3456 7890"}
            hint={hint}
            required={required}
            error={error}
            value={strVal}
            startIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h2.3a1 1 0 01.95.68l1 3a1 1 0 01-.25 1l-1.4 1.4a14 14 0 006.3 6.3l1.4-1.4a1 1 0 011-.25l3 1a1 1 0 01.68.95V19a2 2 0 01-2 2A16 16 0 013 5z" />
              </svg>
            }
            onChange={(v) => setValue(name, v)}
          />
        );
      case "email":
        return (
          <TextInput
            type="email"
            label={label}
            placeholder={placeholder ?? "name@email.com"}
            hint={hint}
            required={required}
            error={error}
            value={strVal}
            onChange={(v) => setValue(name, v)}
          />
        );
      case "money":
        return (
          <TextInput
            type="number"
            label={label}
            placeholder={placeholder ?? "0"}
            hint={hint}
            required={required}
            error={error}
            value={strVal}
            startIcon={<span className="text-xs font-semibold">Rp</span>}
            onChange={(v) => setValue(name, v)}
          />
        );
      case "number":
        return (
          <TextInput
            type="number"
            label={label}
            placeholder={placeholder}
            hint={hint}
            required={required}
            error={error}
            value={strVal}
            onChange={(v) => setValue(name, v)}
          />
        );
      case "text":
      default:
        return (
          <TextInput
            type="text"
            label={label}
            placeholder={placeholder}
            hint={hint}
            required={required}
            error={error}
            value={strVal}
            onChange={(v) => setValue(name, v)}
          />
        );
    }
  };

  const spanClass = (field: FormField) =>
    field.colSpan === 6 ? "sm:col-span-6" : "sm:col-span-12";

  return (
    <form onSubmit={handleSubmit} className={className} noValidate>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-12">
        {form.fields.map((field) => (
          <div key={field.name} className={spanClass(field)}>
            {renderField(field)}
          </div>
        ))}
      </div>
      {!hideSubmit && (
        <div className="mt-6 flex justify-end">
          <Button type="submit" variant="primary">
            {submitLabel ?? form.submitLabel ?? "Submit"}
          </Button>
        </div>
      )}
    </form>
  );
};

export default DynamicFormRenderer;
