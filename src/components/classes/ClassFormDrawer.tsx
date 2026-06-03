"use client";

import React, { useEffect, useMemo, useState } from "react";
import Drawer from "@/components/ui/drawer/Drawer";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import Select from "@/components/ui/select/Select";
import { formatIDR } from "@/components/club-engage/format";
import {
  classTypes as seedClassTypes,
  classLevels,
  clubCourts,
  coaches,
  weekDays,
  dayFull,
  emptyClassDraft,
  validateDraft,
  type ClassDraft,
  type ClassType,
  type ClassLevel,
  type WeekDay,
} from "@/data/padel/engage/classes";

/* Create / edit a class. ~10 inputs → MEDIUM count → Drawer (per the project
 * UI/UX rule: FEW=Modal, MEDIUM=Drawer, MANY=Stepper page). Fully controlled
 * draft; validates on submit; the page owns persistence. */

interface ClassFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** undefined = create mode; a draft = edit mode (prefilled) */
  initial?: ClassDraft;
  mode: "create" | "edit";
  onSubmit: (draft: ClassDraft) => void;
}

const ClassFormDrawer: React.FC<ClassFormDrawerProps> = ({
  isOpen,
  onClose,
  initial,
  mode,
  onSubmit,
}) => {
  const [draft, setDraft] = useState<ClassDraft>(initial ?? emptyClassDraft());
  const [errors, setErrors] = useState<Partial<Record<keyof ClassDraft, string>>>({});
  const [classTypes, setClassTypes] = useState<string[]>([...seedClassTypes]);

  // Reset the form each time the drawer (re)opens with a different target.
  useEffect(() => {
    if (isOpen) {
      setDraft(initial ?? emptyClassDraft());
      setErrors({});
    }
  }, [isOpen, initial]);

  const set = <K extends keyof ClassDraft>(key: K, value: ClassDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const coachOptions = useMemo(
    () =>
      coaches.map((c) => ({
        value: c.id,
        label: c.name,
        desc: c.status === "on_leave" ? `${c.level} · on leave` : c.level,
        disabled: c.status === "on_leave",
      })),
    [],
  );

  const handleSubmit = () => {
    const e = validateDraft(draft);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSubmit({ ...draft, title: draft.title.trim(), court: draft.court.trim() });
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      size="w-full max-w-lg"
      title={mode === "create" ? "New Class" : "Edit Class"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" sheen onClick={handleSubmit}>
            {mode === "create" ? "Create Class" : "Save Changes"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <TextInput
          label="Class name"
          required
          placeholder="e.g. Beginner Fundamentals"
          value={draft.title}
          error={!!errors.title}
          errorText={errors.title}
          onChange={(v) => set("title", v)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={draft.type}
            options={classTypes.map((t) => ({ value: t, label: t }))}
            searchable
            addable
            onAddOption={(label) => {
              setClassTypes((prev) => [...prev, label]);
              set("type", label as ClassType);
            }}
            clearable={false}
            onChange={(v) => set("type", v as ClassType)}
          />
          <Select
            label="Level"
            value={draft.level}
            options={classLevels.map((l) => ({ value: l, label: l }))}
            searchable
            clearable={false}
            onChange={(v) => set("level", v as ClassLevel)}
          />
        </div>

        <Select
          label="Coach"
          placeholder="Pick a coach"
          searchable
          value={draft.coachId}
          options={coachOptions}
          clearable={false}
          error={!!errors.coachId}
          hint={errors.coachId}
          onChange={(v) => set("coachId", v as string)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Day"
            value={draft.day}
            options={weekDays.map((d) => ({ value: d, label: dayFull[d] }))}
            searchable
            clearable={false}
            onChange={(v) => set("day", v as WeekDay)}
          />
          <Select
            label="Court"
            value={draft.court}
            options={clubCourts.map((c) => ({ value: c, label: c }))}
            searchable
            clearable={false}
            error={!!errors.court}
            hint={errors.court}
            onChange={(v) => set("court", v as string)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
              Start time
            </label>
            <input
              type="time"
              value={draft.startTime}
              onChange={(e) => set("startTime", e.target.value)}
              className={[
                "h-11 w-full rounded-lg border bg-transparent px-3 text-sm text-[var(--text-heading)] shadow-theme-xs transition focus:outline-none focus:ring-3",
                errors.startTime
                  ? "border-[var(--color-error,#ef4444)] focus:ring-[rgba(239,68,68,0.15)]"
                  : "border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[rgba(37,99,235,0.12)]",
              ].join(" ")}
            />
            {errors.startTime && (
              <p className="mt-1.5 text-xs text-[var(--color-error,#ef4444)]">{errors.startTime}</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
              End time
            </label>
            <input
              type="time"
              value={draft.endTime}
              onChange={(e) => set("endTime", e.target.value)}
              className={[
                "h-11 w-full rounded-lg border bg-transparent px-3 text-sm text-[var(--text-heading)] shadow-theme-xs transition focus:outline-none focus:ring-3",
                errors.endTime
                  ? "border-[var(--color-error,#ef4444)] focus:ring-[rgba(239,68,68,0.15)]"
                  : "border-[var(--border-default)] focus:border-[var(--color-primary)] focus:ring-[rgba(37,99,235,0.12)]",
              ].join(" ")}
            />
            {errors.endTime && (
              <p className="mt-1.5 text-xs text-[var(--color-error,#ef4444)]">{errors.endTime}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Capacity (seats)"
            type="number"
            value={String(draft.capacity)}
            error={!!errors.capacity}
            errorText={errors.capacity}
            onChange={(v) => set("capacity", Number(v))}
          />
          <TextInput
            label="Price / session (IDR)"
            type="number"
            value={String(draft.pricePerSession)}
            hint={
              draft.pricePerSession > 0
                ? formatIDR(draft.pricePerSession)
                : undefined
            }
            error={!!errors.pricePerSession}
            errorText={errors.pricePerSession}
            onChange={(v) => set("pricePerSession", Number(v))}
          />
        </div>
      </div>
    </Drawer>
  );
};

export default ClassFormDrawer;
