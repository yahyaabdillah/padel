"use client";

// Coaching ▸ Coach List — all coaches with operational hours (availability) and
// status. CRUD via modal. DB-backed (m_coach).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Phone,
  Mail,
} from "lucide-react";
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
  getCoachesAction,
  createCoachAction,
  updateCoachAction,
  deleteCoachAction,
  type CoachRecord,
} from "@/app/(admin)/coaching/actions";
import {
  type CoachAvailability,
  makeDefaultAvailability,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
} from "@/lib/coaching";

const LEVELS = ["Head Coach", "Senior", "Pro", "Assistant"];
const PALETTE = ["#6D5BFF", "#14B8A6", "#F59E0B", "#EC4899", "#0EA5E9", "#94A3B8"];

type Draft = {
  id?: string;
  name: string;
  level: string;
  status: string;
  phone: string;
  email: string;
  color: string;
  ratePerHour: number;
  specialtiesText: string;
  bio: string;
  availability: CoachAvailability[];
};

const emptyDraft = (): Draft => ({
  name: "",
  level: "Pro",
  status: "active",
  phone: "",
  email: "",
  color: PALETTE[0],
  ratePerHour: 0,
  specialtiesText: "",
  bio: "",
  availability: makeDefaultAvailability(),
});

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

const availabilityLabel = (av: CoachAvailability[]): string => {
  const days = WEEKDAY_ORDER.filter((d) => av.find((a) => a.day === d)?.works);
  if (days.length === 0) return "Tidak ada hari kerja";
  if (days.length === 7) return "Setiap hari";
  return days.map((d) => WEEKDAY_SHORT[d]).join(", ");
};

export default function CoachListPage() {
  const toast = useToast();
  const [coaches, setCoaches] = useState<CoachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CoachRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCoaches(await getCoachesAction());
    } catch {
      toast.error("Gagal memuat coach.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(emptyDraft());
    setIsNew(true);
  };

  const openEdit = (c: CoachRecord) => {
    setEditing({
      id: c.id,
      name: c.name,
      level: c.level,
      status: c.status,
      phone: c.phone ?? "",
      email: c.email ?? "",
      color: c.color,
      ratePerHour: c.ratePerHour,
      specialtiesText: c.specialties.join(", "),
      bio: c.bio ?? "",
      availability: c.availability,
    });
    setIsNew(false);
  };

  const setAvail = (day: number, patch: Partial<CoachAvailability>) =>
    setEditing((d) =>
      d
        ? {
            ...d,
            availability: d.availability.map((a) =>
              a.day === day ? { ...a, ...patch } : a,
            ),
          }
        : d,
    );

  const save = async () => {
    if (!editing || saving) return;
    if (editing.name.trim().length < 2) {
      toast.error("Nama coach minimal 2 karakter.", "Form belum lengkap");
      return;
    }
    setSaving(true);
    const input = {
      name: editing.name,
      level: editing.level,
      status: editing.status,
      phone: editing.phone,
      email: editing.email,
      color: editing.color,
      ratePerHour: editing.ratePerHour,
      specialties: editing.specialtiesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      bio: editing.bio,
      availability: editing.availability,
    };
    const res = isNew
      ? await createCoachAction(input)
      : await updateCoachAction(editing.id!, input);
    setSaving(false);
    if (!("success" in res) || !res.success) {
      toast.error("Gagal menyimpan coach.");
      return;
    }
    toast.success(`Coach ${editing.name} ${isNew ? "ditambahkan" : "diperbarui"}.`, "Tersimpan");
    setEditing(null);
    void load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteCoachAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error("Gagal menghapus coach.");
      return;
    }
    toast.info(`Coach ${confirmDelete.name} dihapus.`, "Terhapus");
    void load();
  };

  const stats = useMemo(() => {
    const active = coaches.filter((c) => c.status === "active").length;
    return { total: coaches.length, active };
  }, [coaches]);

  return (
    <PageScaffold
      title="Coach"
      subtitle="Daftar coach beserta jam operasional & ketersediaan. Ketersediaan dipakai saat menyusun jadwal coaching."
      requireAny={["coaching.view"]}
      actions={
        <Button variant="primary" sheen glow startIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
          Tambah Coach
        </Button>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="rounded-lg bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-caption)]">
          {stats.total} coach
        </span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {stats.active} aktif
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[280px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
            ))
          : coaches.map((c) => (
              <Card key={c.id} variant="accent-top" accentColor={c.color} padding="none" className="flex flex-col">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                        style={{ background: c.color }}
                      >
                        <GraduationCap className="h-5 w-5" />
                      </span>
                      <div>
                        <h5 className="text-base font-bold leading-tight text-[var(--text-heading)]">
                          {c.name}
                        </h5>
                        <p className="text-xs text-[var(--text-caption)]">{c.level}</p>
                      </div>
                    </div>
                    <Badge size="sm" color={c.status === "active" ? "success" : "neutral"} variant="light">
                      {c.status === "active" ? "Aktif" : c.status === "on_leave" ? "Cuti" : "Nonaktif"}
                    </Badge>
                  </div>

                  {c.specialties.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {c.specialties.slice(0, 4).map((s) => (
                        <Badge key={s} size="sm" color="primary" variant="light">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 space-y-2 text-xs text-[var(--text-caption)]">
                    <div className="flex items-center justify-between">
                      <span>Hari kerja</span>
                      <span className="font-medium text-[var(--text-heading)]">
                        {availabilityLabel(c.availability)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tarif / jam</span>
                      <span className="font-medium text-[var(--text-heading)]">
                        {c.ratePerHour > 0 ? formatIDR(c.ratePerHour) : "—"}
                      </span>
                    </div>
                    {c.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> {c.phone}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" /> {c.email}
                      </div>
                    )}
                  </div>

                  {/* mini availability grid */}
                  <div className="mt-4 grid grid-cols-7 gap-1">
                    {WEEKDAY_ORDER.map((d) => {
                      const a = c.availability.find((x) => x.day === d);
                      const works = a?.works;
                      return (
                        <div key={d} className="text-center">
                          <p className="text-[9px] uppercase text-[var(--text-muted)]">
                            {WEEKDAY_SHORT[d]}
                          </p>
                          <div
                            className={[
                              "mt-1 rounded-md py-1 text-[9px] font-medium",
                              works
                                ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                                : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                            ].join(" ")}
                          >
                            {works ? `${hh(a!.start)}` : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto flex gap-2 border-t border-[var(--border-light)] p-4">
                  <Button size="sm" variant="outline" fullWidth startIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(c)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                    onClick={() => setConfirmDelete(c)}
                    aria-label={`Hapus ${c.name}`}
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
            className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-caption)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
          >
            <Plus className="h-7 w-7" />
            <span className="text-sm font-medium">Tambah Coach Baru</span>
          </button>
        )}
      </div>

      {/* Edit / create modal */}
      <ModalDialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Tambah Coach" : `Edit ${editing?.name || "Coach"}`}
        description="Atur profil & jam operasional coach."
        size="lg"
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
          <div className="space-y-6">
            <section>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput
                  label="Nama coach"
                  value={editing.name}
                  onChange={(v) => setEditing({ ...editing, name: v })}
                  placeholder="cth. Dimas Pratama"
                  required
                />
                <div>
                  <InputLabel label="Level" tooltip="Tingkat senioritas coach." />
                  <div className="flex flex-wrap gap-1.5">
                    {LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setEditing({ ...editing, level: l })}
                        className={[
                          "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                          editing.level === l
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--surface-muted)] text-[var(--text-caption)] hover:text-[var(--text-heading)]",
                        ].join(" ")}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <TextInput
                  label="Telepon"
                  value={editing.phone}
                  onChange={(v) => setEditing({ ...editing, phone: v })}
                  placeholder="+62 8xx"
                />
                <TextInput
                  label="Email"
                  type="email"
                  value={editing.email}
                  onChange={(v) => setEditing({ ...editing, email: v })}
                  placeholder="coach@email.com"
                />
                <CurrencyInput
                  label="Tarif / jam"
                  labelInfo="Tarif PT per jam (informasi)."
                  value={editing.ratePerHour}
                  onChange={(v) => setEditing({ ...editing, ratePerHour: v })}
                />
                <div>
                  <InputLabel label="Warna" tooltip="Warna penanda coach di kalender." />
                  <div className="flex h-11 items-center gap-2">
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
              </div>
              <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <InputLabel label="Status" tooltip="Aktif = bisa menerima sesi." />
                  <label className="flex items-center gap-3">
                    <Switch
                      checked={editing.status === "active"}
                      onChange={(v) => setEditing({ ...editing, status: v ? "active" : "on_leave" })}
                    />
                    <span className="text-sm text-[var(--text-body)]">
                      {editing.status === "active" ? "Aktif" : "Cuti / nonaktif"}
                    </span>
                  </label>
                </div>
              </div>
              <div className="mt-5">
                <TextInput
                  label="Spesialisasi (pisahkan dengan koma)"
                  value={editing.specialtiesText}
                  onChange={(v) => setEditing({ ...editing, specialtiesText: v })}
                  placeholder="Bandeja, Strategy, Match Play"
                />
              </div>
              <div className="mt-5">
                <Textarea
                  label="Bio (opsional)"
                  value={editing.bio}
                  onChange={(v) => setEditing({ ...editing, bio: v })}
                  rows={2}
                />
              </div>
            </section>

            {/* Availability */}
            <section className="border-t border-[var(--border-default)] pt-5">
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                Jam Operasional
              </h4>
              <div className="space-y-2">
                {WEEKDAY_ORDER.map((d) => {
                  const a = editing.availability.find((x) => x.day === d)!;
                  return (
                    <div
                      key={d}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-default)] px-3 py-2"
                    >
                      <div className="flex w-28 items-center gap-2">
                        <Switch checked={a.works} onChange={(v) => setAvail(d, { works: v })} />
                        <span className="text-sm font-medium text-[var(--text-heading)]">
                          {WEEKDAY_SHORT[d]}
                        </span>
                      </div>
                      {a.works ? (
                        <div className="flex items-center gap-2 text-sm">
                          <select
                            value={a.start}
                            onChange={(e) => setAvail(d, { start: Number(e.target.value) })}
                            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-1 text-sm"
                          >
                            {Array.from({ length: 24 }, (_, h) => (
                              <option key={h} value={h}>{hh(h)}</option>
                            ))}
                          </select>
                          <span className="text-[var(--text-muted)]">—</span>
                          <select
                            value={a.end}
                            onChange={(e) => setAvail(d, { end: Number(e.target.value) })}
                            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-2 py-1 text-sm"
                          >
                            {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                              <option key={h} value={h}>{hh(h)}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-muted)]">Libur</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </ModalDialog>

      {/* Delete confirm */}
      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus coach?"
        description={confirmDelete ? `Coach "${confirmDelete.name}" akan dihapus.` : undefined}
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
          Sesi coaching yang sudah terjadwal dengan coach ini tidak otomatis berubah.
        </p>
      </ModalDialog>
    </PageScaffold>
  );
}
