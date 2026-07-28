"use client";

// Master ▸ Membership Plan — CRUD for membership plans (benefits + court-booking
// quota). Owner-configurable. Persisted via MembershipContext (localStorage).
// Benefits set here are consumed by the shared calcMembershipBenefit() helper
// across booking / registration / payment.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Pencil,
  Trash2,
  Plus,
  Star,
  Ticket,
  Percent,
  CalendarClock,
  GraduationCap,
} from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import CurrencyInput from "@/components/ui/input/CurrencyInput";
import Textarea from "@/components/ui/input/Textarea";
import InputLabel from "@/components/ui/input/InputLabel";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import { formatIDR } from "@/components/club-core/format";
import {
  getPlansAction,
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  type PlanRecord,
} from "@/app/(admin)/settings/plans/actions";

type Draft = Omit<PlanRecord, "id" | "perks"> & { id?: string; perksText: string };

const PALETTE = ["#6D5BFF", "#14B8A6", "#F59E0B", "#EC4899", "#0EA5E9", "#94A3B8"];

const toDraft = (p: PlanRecord): Draft => ({ ...p, perksText: p.perks.join("\n") });

const perksFromText = (t: string): string[] =>
  t.split("\n").map((s) => s.trim()).filter(Boolean);

export default function MembershipPlansPage() {
  const toast = useToast();
  const { can } = useAccess();
  const canCreate = can("master.plans", "create");
  const canUpdate = can("master.plans", "update");
  const canDelete = can("master.plans", "delete");
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PlanRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(await getPlansAction());
    } catch {
      toast.error("Gagal memuat plan.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (p: PlanRecord) => {
    setEditing(toDraft(p));
    setIsNew(false);
  };

  const openNew = () => {
    setEditing({
      name: "",
      color: PALETTE[0],
      joinFee: 0,
      includedCourtBookings: 0,
      resetPeriodDays: 30,
      freeCoaching: 0,
      courtDiscountPct: 0,
      active: true,
      highlighted: false,
      sortOrder: plans.length,
      perksText: "",
    });
    setIsNew(true);
  };

  const save = async () => {
    if (!editing || saving) return;
    if (editing.name.trim().length < 2) {
      toast.error("Nama plan minimal 2 karakter.", "Form belum lengkap");
      return;
    }
    setSaving(true);
    const { perksText, id, ...rest } = editing;
    const input = { ...rest, perks: perksFromText(perksText) };
    const res = isNew
      ? await createPlanAction(input)
      : await updatePlanAction(id!, input);
    setSaving(false);
    if (!("success" in res) || !res.success) {
      toast.error("Gagal menyimpan plan.");
      return;
    }
    toast.success(`Plan ${editing.name} ${isNew ? "ditambahkan" : "diperbarui"}.`, "Tersimpan");
    setEditing(null);
    void load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deletePlanAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error("Gagal menghapus plan.");
      return;
    }
    toast.info(`Plan ${confirmDelete.name} dihapus.`, "Terhapus");
    void load();
  };

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.active).length;
    const paid = plans.filter((p) => p.joinFee > 0).length;
    return { total: plans.length, active, paid };
  }, [plans]);

  return (
    <PageScaffold
      title="Membership Plan"
      subtitle="Atur benefit tiap plan: harga, kuota sesi 60 menit gratis, diskon, dan jatah coaching. Benefit langsung dipakai saat booking & registrasi member."
      requireAny={["settings.view"]}
      actions={
        canCreate ? (
          <Button variant="primary" sheen glow startIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
            Tambah Plan
          </Button>
        ) : undefined
      }
    >
      {/* summary chips */}
      <div className="mb-6 flex flex-wrap gap-2">
        <span className="rounded-lg bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--text-caption)]">
          {stats.total} plan
        </span>
        <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
          {stats.active} aktif
        </span>
        <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {stats.paid} berbayar
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[300px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
            ))
          : plans.map((p) => (
          <Card
            key={p.id}
            variant="accent-top"
            accentColor={p.color}
            padding="none"
            className={[
              "flex flex-col",
              p.highlighted ? "ring-1 ring-[var(--color-primary)]/40" : "",
            ].join(" ")}
          >
            <div className="p-5">
              {/* header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
                    style={{ background: p.color }}
                  >
                    <Star className="h-4 w-4" />
                  </span>
                  <div>
                    <h5 className="text-base font-bold leading-tight text-[var(--text-heading)]">
                      {p.name || "Tanpa nama"}
                    </h5>
                    <Badge size="sm" color={p.active ? "success" : "neutral"} variant="light">
                      {p.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                </div>
                {p.highlighted && (
                  <Badge size="sm" color="primary" variant="solid">
                    Popular
                  </Badge>
                )}
              </div>

              {/* price */}
              <div className="mt-4">
                <span className="text-2xl font-extrabold text-[var(--text-heading)]">
                  {p.joinFee === 0 ? "Gratis" : formatIDR(p.joinFee)}
                </span>
                {p.joinFee > 0 && (
                  <span className="text-sm text-[var(--text-muted)]"> join fee</span>
                )}
              </div>

              {/* benefit highlights */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <BenefitChip
                  icon={<Ticket className="h-3.5 w-3.5" />}
                  label="Sesi gratis"
                  value={
                    p.includedCourtBookings > 0
                      ? `${p.includedCourtBookings} jam`
                      : "—"
                  }
                />
                <BenefitChip
                  icon={<Percent className="h-3.5 w-3.5" />}
                  label="Diskon"
                  value={p.courtDiscountPct > 0 ? `${p.courtDiscountPct}%` : "—"}
                />
                <BenefitChip
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                  label="Coaching"
                  value={p.freeCoaching > 0 ? `${p.freeCoaching}x` : "—"}
                />
                <BenefitChip
                  icon={<CalendarClock className="h-3.5 w-3.5" />}
                  label="Reset"
                  value={p.resetPeriodDays > 0 ? `${p.resetPeriodDays} hr` : "—"}
                />
              </div>

              {/* perks */}
              {p.perks.length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {p.perks.slice(0, 4).map((perk, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-body)]">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* actions */}
            <div className="mt-auto flex gap-2 border-t border-[var(--border-light)] p-4">
              {canUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  fullWidth
                  startIcon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() => openEdit(p)}
                >
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                  onClick={() => setConfirmDelete(p)}
                  aria-label={`Hapus ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              {!canUpdate && !canDelete && (
                <span className="px-1 text-xs text-[var(--text-muted)]">Hanya lihat</span>
              )}
            </div>
          </Card>
        ))}

        {/* add tile */}
        {!loading && canCreate && (
        <button
          type="button"
          onClick={openNew}
          className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-strong)] text-[var(--text-caption)] transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]"
        >
          <Plus className="h-7 w-7" />
          <span className="text-sm font-medium">Tambah Plan Baru</span>
        </button>
        )}
      </div>

      {/* Edit / create modal */}
      <ModalDialog
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={isNew ? "Tambah Plan" : `Edit ${editing?.name || "Plan"}`}
        description="Benefit yang diatur di sini langsung berlaku untuk booking & registrasi member."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button variant="primary" sheen onClick={save}>
              Simpan
            </Button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-6">
            {/* Identitas */}
            <section>
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                Identitas
              </h4>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput
                  label="Nama plan"
                  labelInfo="Nama plan yang tampil di kartu membership & pilihan tier."
                  value={editing.name}
                  onChange={(v) => setEditing({ ...editing, name: v })}
                  placeholder="cth. Pro"
                  required
                />
                <div>
                  <InputLabel label="Warna aksen" tooltip="Warna kartu & badge plan." />
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
            </section>

            {/* Harga */}
            <section className="border-t border-[var(--border-default)] pt-5">
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                Harga
              </h4>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <CurrencyInput
                  label="Join fee"
                  labelInfo="Biaya pendaftaran sekali bayar saat member bergabung. Kosongkan / 0 untuk plan gratis."
                  value={editing.joinFee}
                  onChange={(v) => setEditing({ ...editing, joinFee: v })}
                />
              </div>
            </section>

            {/* Benefit */}
            <section className="border-t border-[var(--border-default)] pt-5">
              <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                Benefit & Kuota
              </h4>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <TextInput
                  label="Kuota sesi lapangan"
                  labelInfo="Satu kuota berlaku untuk satu sesi lapangan selama 60 menit. Berlaku untuk semua lapangan dan jam, termasuk peak."
                  type="number"
                  value={String(editing.includedCourtBookings)}
                  onChange={(v) =>
                    setEditing({ ...editing, includedCourtBookings: Math.max(0, Number(v) || 0) })
                  }
                  hint="0 = tanpa sesi gratis"
                />
                <TextInput
                  label="Reset kuota tiap (hari)"
                  labelInfo="Periode siklus kuota. cth. 30 = reset tiap 30 hari. 0 = tidak pernah reset."
                  type="number"
                  value={String(editing.resetPeriodDays)}
                  onChange={(v) =>
                    setEditing({ ...editing, resetPeriodDays: Math.max(0, Number(v) || 0) })
                  }
                />
                <TextInput
                  label="Coaching gratis / siklus"
                  labelInfo="Jumlah sesi coaching yang coach fee-nya digratiskan per siklus."
                  type="number"
                  value={String(editing.freeCoaching)}
                  onChange={(v) =>
                    setEditing({ ...editing, freeCoaching: Math.max(0, Number(v) || 0) })
                  }
                />
                <TextInput
                  label="Diskon booking setelah kuota (%)"
                  labelInfo="Diskon tarif lapangan untuk booking SETELAH kuota gratis habis."
                  type="number"
                  value={String(editing.courtDiscountPct)}
                  onChange={(v) =>
                    setEditing({
                      ...editing,
                      courtDiscountPct: Math.min(100, Math.max(0, Number(v) || 0)),
                    })
                  }
                  hint="0–100%"
                />
              </div>
            </section>

            {/* Perks + flags */}
            <section className="border-t border-[var(--border-default)] pt-5">
              <Textarea
                label="Benefit (satu per baris)"
                value={editing.perksText}
                onChange={(v) => setEditing({ ...editing, perksText: v })}
                rows={4}
                placeholder={"4x booking lapangan gratis / siklus\n15% off setelah kuota habis"}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <label className="flex items-center gap-3">
                  <Switch
                    checked={editing.active}
                    onChange={(v) => setEditing({ ...editing, active: v })}
                  />
                  <span className="text-sm text-[var(--text-body)]">Plan aktif (bisa dipilih)</span>
                </label>
                <label className="flex items-center gap-3">
                  <Switch
                    checked={!!editing.highlighted}
                    onChange={(v) => setEditing({ ...editing, highlighted: v })}
                  />
                  <span className="text-sm text-[var(--text-body)]">Tandai &quot;Popular&quot;</span>
                </label>
              </div>
            </section>
          </div>
        )}
      </ModalDialog>

      {/* Delete confirm */}
      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus plan?"
        description={confirmDelete ? `Plan "${confirmDelete.name}" akan dihapus.` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Batal
            </Button>
            <Button
              variant="primary"
              className="!bg-rose-500 hover:!bg-rose-600"
              onClick={doDelete}
            >
              Hapus
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Member yang sudah memakai plan ini tidak otomatis berubah. Pastikan
          tidak ada member aktif pada plan ini sebelum menghapus.
        </p>
      </ModalDialog>
    </PageScaffold>
  );
}

const BenefitChip: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
}> = ({ icon, label, value }) => (
  <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2">
    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
      {icon}
      <span className="text-[10px] uppercase tracking-wide">{label}</span>
    </div>
    <p className="mt-0.5 text-sm font-bold text-[var(--text-heading)]">{value}</p>
  </div>
);
