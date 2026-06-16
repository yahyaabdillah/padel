"use client";

// Coaching ▸ Coach Packages — manage coaching packages (N sessions for a flat
// fee). DB-backed (m_coach_package). Consumed by the schedule builder.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Package as PackageIcon } from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import CurrencyInput from "@/components/ui/input/CurrencyInput";
import InputLabel from "@/components/ui/input/InputLabel";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { formatIDR } from "@/components/club-core/format";
import {
  getCoachPackagesAction,
  createCoachPackageAction,
  updateCoachPackageAction,
  deleteCoachPackageAction,
  type PackageRecord,
} from "@/app/(admin)/coaching/actions";

const PALETTE = ["#14B8A6", "#6D5BFF", "#F59E0B", "#EC4899", "#0EA5E9", "#94A3B8"];

type Draft = Omit<PackageRecord, "id"> & { id?: string };

const emptyDraft = (sortOrder: number): Draft => ({
  name: "",
  sessions: 4,
  durationMin: 60,
  price: 0,
  color: PALETTE[0],
  note: "",
  active: true,
  sortOrder,
});

export default function CoachPackagesPage() {
  const toast = useToast();
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PackageRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPackages(await getCoachPackagesAction());
    } catch {
      toast.error("Gagal memuat paket.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(emptyDraft(packages.length));
    setIsNew(true);
  };
  const openEdit = (p: PackageRecord) => {
    setEditing({ ...p });
    setIsNew(false);
  };

  const save = async () => {
    if (!editing || saving) return;
    if (editing.name.trim().length < 2) {
      toast.error("Nama paket minimal 2 karakter.", "Form belum lengkap");
      return;
    }
    if (editing.sessions < 1) {
      toast.error("Jumlah sesi minimal 1.", "Form belum lengkap");
      return;
    }
    setSaving(true);
    const { id, ...input } = editing;
    const res = isNew
      ? await createCoachPackageAction(input)
      : await updateCoachPackageAction(id!, input);
    setSaving(false);
    if (!("success" in res) || !res.success) {
      toast.error("Gagal menyimpan paket.");
      return;
    }
    toast.success(`Paket ${editing.name} ${isNew ? "ditambahkan" : "diperbarui"}.`, "Tersimpan");
    setEditing(null);
    void load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteCoachPackageAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error("Gagal menghapus paket.");
      return;
    }
    toast.info(`Paket ${confirmDelete.name} dihapus.`, "Terhapus");
    void load();
  };

  const stats = useMemo(() => {
    const active = packages.filter((p) => p.active).length;
    return { total: packages.length, active };
  }, [packages]);

  const perSession = (p: { price: number; sessions: number }) =>
    p.sessions > 0 ? Math.round(p.price / p.sessions) : 0;

  return (
    <PageScaffold
      title="Coach Packages"
      subtitle="Kelola paket coaching. Tiap paket berisi sejumlah sesi (x pertemuan) dengan biaya paket."
      requireAny={["coaching.view"]}
      actions={
        <Button variant="primary" sheen glow startIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
          Tambah Paket
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="rounded-lg bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-caption)]">
          {stats.total} paket
        </span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {stats.active} aktif
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[240px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
            ))
          : packages.map((p) => (
              <Card key={p.id} variant="accent-top" accentColor={p.color} padding="none" className="flex flex-col">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: p.color }}>
                        <PackageIcon className="h-5 w-5" />
                      </span>
                      <div>
                        <h5 className="text-base font-bold leading-tight text-[var(--text-heading)]">{p.name}</h5>
                        <Badge size="sm" color={p.active ? "success" : "neutral"} variant="light">
                          {p.active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-2xl font-extrabold text-[var(--text-heading)]">
                      {formatIDR(p.price)}
                    </span>
                    <span className="text-sm text-[var(--text-muted)]"> / paket</span>
                    <p className="mt-0.5 text-xs text-[var(--text-caption)]">
                      ≈ {formatIDR(perSession(p))} / sesi
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Sesi</p>
                      <p className="mt-0.5 text-sm font-bold text-[var(--text-heading)]">{p.sessions}x</p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Durasi</p>
                      <p className="mt-0.5 text-sm font-bold text-[var(--text-heading)]">{p.durationMin}m</p>
                    </div>
                  </div>

                  {p.note && (
                    <p className="mt-3 text-xs text-[var(--text-caption)]">{p.note}</p>
                  )}
                </div>

                <div className="mt-auto flex gap-2 border-t border-[var(--border-light)] p-4">
                  <Button size="sm" variant="outline" fullWidth startIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(p)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                    onClick={() => setConfirmDelete(p)}
                    aria-label={`Hapus ${p.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}

        {!loading && (
          <button
            type="button"
            onClick={openNew}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-caption)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
          >
            <Plus className="h-7 w-7" />
            <span className="text-sm font-medium">Tambah Paket Baru</span>
          </button>
        )}
      </div>

      <ModalDialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Tambah Paket" : `Edit ${editing?.name || "Paket"}`}
        description="Paket berisi sejumlah sesi dengan biaya paket."
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" sheen onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-5">
            <TextInput
              label="Nama paket"
              value={editing.name}
              onChange={(v) => setEditing({ ...editing, name: v })}
              placeholder="cth. Starter · 4 Sesi"
              required
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextInput
                label="Jumlah sesi"
                labelInfo="Berapa kali pertemuan dalam paket ini."
                type="number"
                value={String(editing.sessions)}
                onChange={(v) => setEditing({ ...editing, sessions: Math.max(1, Number(v) || 1) })}
              />
              <TextInput
                label="Durasi / sesi (menit)"
                type="number"
                value={String(editing.durationMin)}
                onChange={(v) => setEditing({ ...editing, durationMin: Math.max(30, Number(v) || 60) })}
              />
            </div>
            <CurrencyInput
              label="Biaya paket"
              labelInfo="Total biaya untuk seluruh sesi dalam paket."
              value={editing.price}
              onChange={(v) => setEditing({ ...editing, price: v })}
            />
            <div>
              <InputLabel label="Warna" tooltip="Warna penanda paket." />
              <div className="flex items-center gap-2">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setEditing({ ...editing, color: c })}
                    className={[
                      "h-7 w-7 rounded-full transition-transform",
                      editing.color === c
                        ? "ring-2 ring-offset-2 ring-[var(--color-primary)] ring-offset-[var(--surface-card)]"
                        : "hover:scale-110",
                    ].join(" ")}
                    style={{ background: c }}
                    aria-label={`Warna ${c}`}
                  />
                ))}
              </div>
            </div>
            <Textarea
              label="Catatan (opsional)"
              value={editing.note ?? ""}
              onChange={(v) => setEditing({ ...editing, note: v })}
              rows={2}
            />
            <label className="flex items-center gap-3">
              <Switch checked={editing.active} onChange={(v) => setEditing({ ...editing, active: v })} />
              <span className="text-sm text-[var(--text-body)]">Paket aktif (bisa dipilih saat buat jadwal)</span>
            </label>
          </div>
        )}
      </ModalDialog>

      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus paket?"
        description={confirmDelete ? `Paket "${confirmDelete.name}" akan dihapus.` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button variant="primary" className="!bg-rose-500 hover:!bg-rose-600" onClick={doDelete}>
              Hapus
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Jadwal yang sudah memakai paket ini tidak otomatis berubah.
        </p>
      </ModalDialog>
    </PageScaffold>
  );
}
