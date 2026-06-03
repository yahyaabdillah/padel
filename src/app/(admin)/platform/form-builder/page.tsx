"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import Select from "@/components/ui/select/Select";
import TextInput from "@/components/ui/input/TextInput";
import { ModalDialog } from "@/components/ui/modal";
import EmptyState from "@/components/ui/feedback/EmptyState";
import DynamicFormRenderer from "@/components/shared/DynamicFormRenderer";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useFormBuilder } from "@/context/FormBuilderContext";
import {
  fieldTypeLabels, type FieldType, type FormField,
} from "@/data/padel/forms";
import { IconPlus, IconEdit, IconTrash, IconReset } from "@/components/platform/icons";

const FIELD_TYPES = Object.keys(fieldTypeLabels) as FieldType[];
const NEEDS_OPTIONS: FieldType[] = ["select", "radio"];

interface FieldDraft {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder: string;
  hint: string;
  colSpan: 6 | 12;
  options: string; // newline separated label=value or label
}

const emptyField: FieldDraft = {
  name: "", label: "", type: "text", required: false, placeholder: "", hint: "", colSpan: 12, options: "",
};

export default function FormBuilderPage() {
  const toast = useToast();
  const { forms, addForm, addField, updateField, removeField, resetForms } = useFormBuilder();

  const [activeId, setActiveId] = useState<string>(forms[0]?.id ?? "");
  useEffect(() => { if (!forms.find((f) => f.id === activeId) && forms[0]) setActiveId(forms[0].id); }, [forms, activeId]);

  const active = useMemo(() => forms.find((f) => f.id === activeId), [forms, activeId]);

  const [fieldModal, setFieldModal] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [fdraft, setFdraft] = useState<FieldDraft>(emptyField);
  const [newFormModal, setNewFormModal] = useState(false);
  const [newForm, setNewForm] = useState({ title: "", table: "", description: "" });
  const [previewKey, setPreviewKey] = useState(0);

  const openAddField = () => { setEditingName(null); setFdraft(emptyField); setFieldModal(true); };
  const openEditField = (f: FormField) => {
    setEditingName(f.name);
    setFdraft({
      name: f.name, label: f.label, type: f.type, required: !!f.required,
      placeholder: f.placeholder ?? "", hint: f.hint ?? "", colSpan: f.colSpan ?? 12,
      options: (f.options ?? []).map((o) => (o.label === o.value ? o.label : `${o.label}=${o.value}`)).join("\n"),
    });
    setFieldModal(true);
  };

  const parseOptions = (raw: string) =>
    raw.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [label, value] = l.split("=");
      return { label: label.trim(), value: (value ?? label).trim().toLowerCase().replace(/\s+/g, "-") };
    });

  const saveField = () => {
    if (!active) return;
    if (!fdraft.label.trim()) { toast.error("Field label is required.", "Validation"); return; }
    const autoName = (fdraft.name.trim() || fdraft.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, ""));
    const name = editingName ?? autoName;
    const field: FormField = {
      name,
      label: fdraft.label.trim(),
      type: fdraft.type,
      required: fdraft.required || undefined,
      placeholder: fdraft.placeholder || undefined,
      hint: fdraft.hint || undefined,
      colSpan: fdraft.colSpan,
      options: NEEDS_OPTIONS.includes(fdraft.type) ? parseOptions(fdraft.options) : undefined,
    };
    if (editingName) {
      updateField(active.id, editingName, field);
      toast.success(`Field "${field.label}" updated.`, "Field saved");
    } else {
      if (active.fields.some((f) => f.name === name)) { toast.error("A field with that key already exists.", "Duplicate"); return; }
      addField(active.id, field);
      toast.success(`Field "${field.label}" added.`, "Field added");
    }
    setPreviewKey((k) => k + 1);
    setFieldModal(false);
  };

  const handleRemove = (f: FormField) => {
    if (!active) return;
    removeField(active.id, f.name);
    setPreviewKey((k) => k + 1);
    toast.warning(`Field "${f.label}" removed.`, "Field removed");
  };

  const createForm = () => {
    if (!newForm.title.trim()) { toast.error("Form title is required.", "Validation"); return; }
    const created = addForm({
      title: newForm.title.trim(),
      table: newForm.table.trim() || "custom",
      description: newForm.description.trim() || undefined,
      fields: [],
    });
    setActiveId(created.id);
    setNewFormModal(false);
    setNewForm({ title: "", table: "", description: "" });
    toast.success(`Form "${created.title}" created.`, "Form created");
  };

  return (
    <div>
      <PageBreadcrumb pageTitle="Form Builder" />
      <PlatformHeader
        eyebrow="Platform · Low-code"
        title="Form Builder"
        description="Design entity forms with 13 field types and preview them live through the shared dynamic renderer."
        actions={
          <>
            <Button size="sm" variant="outline" startIcon={<IconReset />} className="!text-white !ring-white/40 hover:!bg-white/10" onClick={() => { resetForms(); toast.success("Forms reset to seed.", "Reset"); }}>Reset</Button>
            <Button size="sm" variant="primary" sheen startIcon={<IconPlus />} onClick={() => setNewFormModal(true)}>New form</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Forms list */}
        <div className="lg:col-span-3">
          <ComponentCard title="Forms" desc={`${forms.length} definitions`}>
            <div className="space-y-2">
              {forms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveId(f.id)}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    activeId === f.id
                      ? "border-brand-400 bg-brand-50/60 dark:border-brand-500/40 dark:bg-brand-500/10"
                      : "border-gray-200 hover:border-brand-200 dark:border-gray-800"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">{f.title}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="light" color="secondary" size="sm">{f.table}</Badge>
                    <span className="text-xs text-gray-400">{f.fields.length} fields</span>
                  </div>
                </button>
              ))}
            </div>
          </ComponentCard>
        </div>

        {/* Field editor */}
        <div className="lg:col-span-5">
          {active ? (
            <ComponentCard title={active.title} desc={active.description || `Writes to "${active.table}"`}>
              <div className="mb-3 flex justify-end">
                <Button size="sm" variant="soft" startIcon={<IconPlus />} onClick={openAddField}>Add field</Button>
              </div>
              {active.fields.length === 0 ? (
                <EmptyState title="No fields yet" description="Add your first field to build this form." action={<Button variant="primary" startIcon={<IconPlus />} onClick={openAddField}>Add field</Button>} />
              ) : (
                <div className="space-y-2">
                  {active.fields.map((f) => (
                    <div key={f.name} className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 dark:border-gray-800">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{f.label}</p>
                          {f.required && <Badge variant="light" color="error" size="sm">required</Badge>}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <code className="text-[11px] text-gray-400">{f.name}</code>
                          <Badge variant="light" color="primary" size="sm">{fieldTypeLabels[f.type]}</Badge>
                          <span className="text-[11px] text-gray-400">{f.colSpan ?? 12}/12</span>
                        </div>
                      </div>
                      <button onClick={() => openEditField(f)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-brand-500 dark:hover:bg-white/10"><IconEdit /></button>
                      <button onClick={() => handleRemove(f)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-rose-500 dark:hover:bg-white/10"><IconTrash /></button>
                    </div>
                  ))}
                </div>
              )}
            </ComponentCard>
          ) : (
            <ComponentCard title="No form selected"><EmptyState title="Select a form" description="Pick a form from the list to edit its fields." /></ComponentCard>
          )}
        </div>

        {/* Live preview */}
        <div className="lg:col-span-4">
          <ComponentCard title="Live Preview" desc="Rendered with DynamicFormRenderer">
            {active && active.fields.length > 0 ? (
              <DynamicFormRenderer
                key={previewKey}
                form={active}
                submitLabel={active.submitLabel ?? "Submit"}
                onSubmit={(v) => toast.success(`Submitted ${Object.keys(v).length} values (dummy).`, "Preview submit")}
              />
            ) : (
              <EmptyState title="Nothing to preview" description="Add fields to see the live form." />
            )}
          </ComponentCard>
        </div>
      </div>

      {/* Field modal */}
      <ModalDialog
        isOpen={fieldModal}
        onClose={() => setFieldModal(false)}
        title={editingName ? "Edit field" : "Add field"}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setFieldModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={saveField}>{editingName ? "Save field" : "Add field"}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="Label" required value={fdraft.label} onChange={(v) => setFdraft((d) => ({ ...d, label: v }))} placeholder="e.g. Player Name" />
          <TextInput label="Field key" value={editingName ?? fdraft.name} disabled={!!editingName} onChange={(v) => setFdraft((d) => ({ ...d, name: v }))} hint={editingName ? "Key is immutable" : "Auto-generated if blank"} />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
            <Select options={FIELD_TYPES.map((t) => ({ value: t, label: fieldTypeLabels[t] }))} value={fdraft.type} searchable onChange={(v) => setFdraft((d) => ({ ...d, type: v as FieldType }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Width</label>
            <Select options={[{ value: "12", label: "Full (12/12)" }, { value: "6", label: "Half (6/12)" }]} value={String(fdraft.colSpan)} onChange={(v) => setFdraft((d) => ({ ...d, colSpan: Number(v) as 6 | 12 }))} />
          </div>
          <TextInput label="Placeholder" value={fdraft.placeholder} onChange={(v) => setFdraft((d) => ({ ...d, placeholder: v }))} />
          <TextInput label="Hint" value={fdraft.hint} onChange={(v) => setFdraft((d) => ({ ...d, hint: v }))} />
          {NEEDS_OPTIONS.includes(fdraft.type) && (
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Options (one per line, optional <code>label=value</code>)</label>
              <textarea
                rows={4}
                value={fdraft.options}
                onChange={(e) => setFdraft((d) => ({ ...d, options: e.target.value }))}
                placeholder={"Beginner\nIntermediate=intermediate\nAdvanced"}
                className="w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:border-brand-400 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-100"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Switch label="Required field" checked={fdraft.required} onChange={(c) => setFdraft((d) => ({ ...d, required: c }))} />
          </div>
        </div>
      </ModalDialog>

      {/* New form modal */}
      <ModalDialog
        isOpen={newFormModal}
        onClose={() => setNewFormModal(false)}
        title="New form"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNewFormModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={createForm}>Create form</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput label="Title" required value={newForm.title} onChange={(v) => setNewForm((f) => ({ ...f, title: v }))} placeholder="e.g. Tournament Registration" />
          <TextInput label="Entity / table" value={newForm.table} onChange={(v) => setNewForm((f) => ({ ...f, table: v }))} placeholder="tournaments" />
          <TextInput label="Description" value={newForm.description} onChange={(v) => setNewForm((f) => ({ ...f, description: v }))} />
        </div>
      </ModalDialog>
    </div>
  );
}
