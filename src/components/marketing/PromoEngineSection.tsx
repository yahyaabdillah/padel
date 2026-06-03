"use client";

import React, { useMemo, useState } from "react";
import { Pencil, Trash2, Plus, Tag } from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Switch from "@/components/ui/switch/Switch";
import { ModalDialog } from "@/components/ui/modal";
import { formatIDR, formatDateShort } from "@/components/club-engage/format";
import { usePromos } from "@/context/PromoContext";
import {
  promoScopeLabels,
  type EnginePromo,
} from "@/data/padel/engage/promo-engine";
import { memberTierMeta } from "@/data/padel/club/members";
import PromoBuilderDrawer, {
  type PromoDraft,
} from "./PromoBuilderDrawer";

const TODAY_ISO = "2026-06-02";

type StatusKind = "active" | "scheduled" | "expired" | "paused";

const statusOf = (p: EnginePromo): StatusKind => {
  if (!p.active) return "paused";
  if (TODAY_ISO < p.validFrom) return "scheduled";
  if (TODAY_ISO > p.validTo) return "expired";
  return "active";
};

const statusMeta: Record<
  StatusKind,
  { label: string; color: "success" | "info" | "neutral" | "warning" }
> = {
  active: { label: "Active", color: "success" },
  scheduled: { label: "Scheduled", color: "info" },
  expired: { label: "Expired", color: "neutral" },
  paused: { label: "Paused", color: "warning" },
};

const PromoEngineSection: React.FC = () => {
  const { promos, createPromo, updatePromo, togglePromo, deletePromo } =
    usePromos();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<EnginePromo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<EnginePromo | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (p: EnginePromo) => {
    setEditing(p);
    setDrawerOpen(true);
  };

  const handleSubmit = (draft: PromoDraft, id?: string) => {
    if (id) updatePromo(id, draft);
    else createPromo(draft); // createPromo pushes a notification when notify=true
  };

  const sorted = useMemo(
    () =>
      [...promos].sort((a, b) => {
        const order: StatusKind[] = ["active", "scheduled", "paused", "expired"];
        return order.indexOf(statusOf(a)) - order.indexOf(statusOf(b));
      }),
    [promos],
  );

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-[var(--border-light)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)]">
            <Tag className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-heading)]">
              Discount Engine
            </h3>
            <p className="text-xs text-[var(--text-caption)]">
              Live codes consumed across every transaction surface.
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          size="sm"
          sheen
          startIcon={<Plus className="h-4 w-4" />}
          onClick={openCreate}
        >
          New Promo
        </Button>
      </div>

      <ul className="divide-y divide-[var(--border-light)]">
        {sorted.length === 0 && (
          <li className="p-8 text-center text-sm text-[var(--text-muted)]">
            Belum ada promo. Klik &quot;New Promo&quot; untuk membuat.
          </li>
        )}
        {sorted.map((p) => {
          const st = statusMeta[statusOf(p)];
          return (
            <li
              key={p.id}
              className="flex flex-col gap-3 p-5 transition-colors hover:bg-[var(--surface-muted)]/40 lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]">
                    {p.code}
                  </code>
                  <span className="font-medium text-[var(--text-heading)]">
                    {p.name}
                  </span>
                  <Badge size="sm" color={st.color} variant="light" dot>
                    {st.label}
                  </Badge>
                  <Badge size="sm" color="primary" variant="light">
                    {p.type === "percent"
                      ? `${p.value}% off`
                      : `${formatIDR(p.value, true)} off`}
                  </Badge>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {p.appliesTo.map((s) => (
                    <Badge key={s} size="sm" color="info" variant="light">
                      {promoScopeLabels[s]}
                    </Badge>
                  ))}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--text-caption)]">
                  <span>
                    Audience:{" "}
                    {p.audience === "all" ? (
                      <span className="font-medium text-[var(--text-body)]">
                        All members
                      </span>
                    ) : (
                      <span className="font-medium text-[var(--text-body)]">
                        {p.audience
                          .map((t) => memberTierMeta[t].label)
                          .join(", ")}
                      </span>
                    )}
                  </span>
                  <span>
                    {formatDateShort(p.validFrom)} – {formatDateShort(p.validTo)}
                  </span>
                  {p.minSpend != null && (
                    <span>Min {formatIDR(p.minSpend, true)}</span>
                  )}
                  {p.maxDiscount != null && (
                    <span>Max {formatIDR(p.maxDiscount, true)}</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3 lg:gap-4">
                <Switch
                  checked={p.active}
                  onChange={() => togglePromo(p.id)}
                  size="sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  startIcon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() => openEdit(p)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(p)}
                  startIcon={
                    <Trash2 className="h-3.5 w-3.5 text-[var(--color-error,#ef4444)]" />
                  }
                >
                  <span className="text-[var(--color-error,#ef4444)]">Delete</span>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <PromoBuilderDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editing={editing}
        onSubmit={handleSubmit}
      />

      <ModalDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete promo?"
        description={
          confirmDelete
            ? `Kode ${confirmDelete.code} akan dihapus permanen.`
            : ""
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (confirmDelete) deletePromo(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-body)]">
          Tindakan ini tidak bisa dibatalkan.
        </p>
      </ModalDialog>
    </Card>
  );
};

export default PromoEngineSection;
