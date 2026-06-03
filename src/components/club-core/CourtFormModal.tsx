"use client";

import React, { useEffect, useState } from "react";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import {
  type Court,
  type CourtEnvironment,
  type CourtWall,
  type CourtFormat,
  type CourtStatus,
  courtColors,
} from "@/data/padel/club/courts";
import { formatIDR } from "./format";

const inputCls =
  "h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800";
const labelCls = "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

type CourtDraft = Omit<Court, "id">;

const emptyDraft: CourtDraft = {
  name: "",
  environment: "indoor",
  wall: "glass",
  format: "double",
  status: "active",
  priceOffPeak: 150_000,
  pricePeak: 230_000,
  color: courtColors[0],
  note: "",
};

interface CourtFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing?: Court | null;
  onSave: (draft: CourtDraft, id?: string) => void;
}

const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <div className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-white/5">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={[
          "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          value === o.value
            ? "bg-white text-brand-600 shadow-theme-xs dark:bg-gray-800 dark:text-brand-400"
            : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
        ].join(" ")}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const CourtFormModal: React.FC<CourtFormModalProps> = ({ isOpen, onClose, editing, onSave }) => {
  const [draft, setDraft] = useState<CourtDraft>(emptyDraft);

  useEffect(() => {
    if (editing) {
      const { id: _id, ...rest } = editing;
      void _id;
      setDraft(rest);
    } else {
      setDraft(emptyDraft);
    }
  }, [editing, isOpen]);

  const set = <K extends keyof CourtDraft>(key: K, value: CourtDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? "Edit court" : "Add court"}
      description="Configure court type, surface and peak / off-peak pricing."
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            sheen
            disabled={!draft.name.trim()}
            onClick={() => {
              onSave(draft, editing?.id);
              onClose();
            }}
          >
            {editing ? "Save changes" : "Add court"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Court name</label>
            <input
              type="text"
              className={inputCls}
              placeholder="e.g. Center Court"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          <div>
            <span className={labelCls}>Environment</span>
            <Segmented<CourtEnvironment>
              options={[
                { value: "indoor", label: "Indoor" },
                { value: "outdoor", label: "Outdoor" },
              ]}
              value={draft.environment}
              onChange={(v) => set("environment", v)}
            />
          </div>

          <div>
            <span className={labelCls}>Wall type</span>
            <Segmented<CourtWall>
              options={[
                { value: "glass", label: "Glass" },
                { value: "mesh", label: "Mesh" },
              ]}
              value={draft.wall}
              onChange={(v) => set("wall", v)}
            />
          </div>

          <div>
            <span className={labelCls}>Format</span>
            <Segmented<CourtFormat>
              options={[
                { value: "double", label: "Double" },
                { value: "single", label: "Single" },
              ]}
              value={draft.format}
              onChange={(v) => set("format", v)}
            />
          </div>

          <div>
            <span className={labelCls}>Status</span>
            <Segmented<CourtStatus>
              options={[
                { value: "active", label: "Active" },
                { value: "maintenance", label: "Maint." },
                { value: "inactive", label: "Off" },
              ]}
              value={draft.status}
              onChange={(v) => set("status", v)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Off-peak price / hour</label>
            <input
              type="number"
              step={5000}
              className={inputCls}
              value={draft.priceOffPeak}
              onChange={(e) => set("priceOffPeak", Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-400">{formatIDR(draft.priceOffPeak)}</p>
          </div>
          <div>
            <label className={labelCls}>Peak price / hour</label>
            <input
              type="number"
              step={5000}
              className={inputCls}
              value={draft.pricePeak}
              onChange={(e) => set("pricePeak", Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-gray-400">{formatIDR(draft.pricePeak)}</p>
          </div>
        </div>

        <div>
          <span className={labelCls}>Accent color</span>
          <div className="flex flex-wrap gap-2">
            {courtColors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                className={[
                  "h-8 w-8 rounded-full transition-transform",
                  draft.color === c ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-900" : "hover:scale-110",
                ].join(" ")}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className={labelCls}>Note (optional)</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Short marketing note"
            value={draft.note ?? ""}
            onChange={(e) => set("note", e.target.value)}
          />
        </div>
      </div>
    </ModalDialog>
  );
};

export default CourtFormModal;
