"use client";

// Master ▸ Membership Plan — CRUD for membership plans (benefits + court-booking
// quota). Owner-configurable. Persisted via MembershipContext (localStorage).

import React, { useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useMembership } from "@/context/MembershipContext";
import { formatIDR } from "@/components/club-core/format";
import type { MembershipPlan } from "@/data/padel/club/membershipPlans";

type Draft = Omit<MembershipPlan, "perks"> & { perksText: string };

const toDraft = (p: MembershipPlan): Draft => ({
  ...p,
  perksText: p.perks.join("\n"),
});

const fromDraft = (d: Draft): MembershipPlan => {
  const { perksText, ...rest } = d;
  return {
    ...rest,
    perks: perksText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  };
};

export default function MembershipPlansPage() {
  const toast = useToast();
  const { plans, updatePlan, addPlan, deletePlan, resetPlans } = useMembership();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);

  const openEdit = (p: MembershipPlan) => {
    setEditing(toDraft(p));
    setIsNew(false);
  };

  const openNew = () => {
    setEditing({
      id: `plan-${Date.now().toString(36)}` as MembershipPlan["id"],
      name: "",
      color: "#6D5BFF",
      priceMonthly: 0,
      joinFee: 0,
      includedCourtBookings: 0,
      resetPeriodDays: 30,
      freeCoaching: 0,
      courtDiscountPct: 0,
      active: true,
      perksText: "",
    });
    setIsNew(true);
  };

  const save = () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) {
      toast.error("Nama plan minimal 2 karakter.", "Form belum lengkap");
      return;
    }
    const plan = fromDraft(editing);
    if (isNew) {
      addPlan(plan);
      toast.success(`Plan ${plan.name} ditambahkan.`, "Tersimpan");
    } else {
      updatePlan(plan.id, plan);
      toast.success(`Plan ${plan.name} diperbarui.`, "Tersimpan");
    }
    setEditing(null);
  };

  const remove = (p: MembershipPlan) => {
    deletePlan(p.id);
    toast.success(`Plan ${p.name} dihapus.`, "Terhapus");
  };

  const num = (v: string) => Math.max(0, Number(v.replace(/\D/g, "")) || 0);

  return (
    <PageScaffold
      title="Membership Plan"
      subtitle="Atur benefit tiap plan: harga, kuota booking lapangan gratis, periode reset, dan jatah coaching."
      requireAny={["settings.view"]}
      actions={
        <>
          <Button variant="outline" onClick={() => { resetPlans(); toast.info("Plan dikembalikan ke default."); }}>
            Reset default
          </Button>
          <Button variant="primary" sheen onClick={openNew}>
            + Tambah Plan
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <Card key={p.id} padding="md" className="flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
                <h5 className="text-base font-bold text-[var(--text-heading)]">{p.name}</h5>
              </div>
              {p.highlighted && (
                <Badge size="sm" color="primary" variant="light">Popular</Badge>
              )}
            </div>

            <p className="mt-2">
              <span className="text-xl font-bold text-[var(--text-heading)]">
                {p.priceMonthly === 0 ? "Gratis" : formatIDR(p.priceMonthly)}
              </span>
              {p.priceMonthly > 0 && (
                <span className="text-xs text-[var(--text-muted)]">/bulan</span>
              )}
            </p>

            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-[var(--text-caption)]">Join fee</dt>
                <dd className="font-medium text-[var(--text-body)]">
                  {p.joinFee === 0 ? "—" : formatIDR(p.joinFee)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-caption)]">Kuota lapangan</dt>
                <dd className="font-medium text-[var(--text-body)]">
                  {p.includedCourtBookings > 0 ? `${p.includedCourtBookings}x / siklus` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-caption)]">Reset tiap</dt>
                <dd className="font-medium text-[var(--text-body)]">
                  {p.resetPeriodDays > 0 ? `${p.resetPeriodDays} hari` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-caption)]">Coaching gratis</dt>
                <dd className="font-medium text-[var(--text-body)]">
                  {p.freeCoaching > 0 ? `${p.freeCoaching}x / siklus` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-caption)]">Diskon booking</dt>
                <dd className="font-medium text-[var(--text-body)]">
                  {p.courtDiscountPct > 0 ? `${p.courtDiscountPct}%` : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-3">
              <Badge size="sm" color={p.active ? "success" : "neutral"} variant="light">
                {p.active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>

            <div className="mt-4 flex gap-2 border-t border-[var(--border-light)] pt-3">
              <Button size="sm" variant="outline" fullWidth onClick={() => openEdit(p)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(p)}
                aria-label={`Hapus ${p.name}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m-7 0v12a1 1 0 001 1h6a1 1 0 001-1V7" />
                </svg>
              </Button>
            </div>
          </Card>
        ))}
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
            <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
            <Button variant="primary" sheen onClick={save}>Simpan</Button>
          </div>
        }
      >
        {editing && (
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
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
                Warna aksen
              </label>
              <input
                type="color"
                value={editing.color}
                onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                className="h-11 w-full cursor-pointer rounded-lg border border-[var(--border-default)] bg-transparent"
              />
            </div>

            <TextInput
              label="Harga / bulan (IDR)"
              labelInfo="Biaya keanggotaan berulang. Isi 0 untuk plan gratis."
              value={String(editing.priceMonthly)}
              onChange={(v) => setEditing({ ...editing, priceMonthly: num(v) })}
              startIcon={<span className="text-xs">Rp</span>}
            />
            <TextInput
              label="Join fee (IDR)"
              labelInfo="Biaya pendaftaran sekali bayar saat member bergabung."
              value={String(editing.joinFee)}
              onChange={(v) => setEditing({ ...editing, joinFee: num(v) })}
              startIcon={<span className="text-xs">Rp</span>}
            />

            <TextInput
              label="Kuota booking lapangan"
              labelInfo="Jumlah booking lapangan GRATIS per siklus. Berlaku untuk semua lapangan & jam (termasuk peak). Isi 0 jika tidak ada."
              value={String(editing.includedCourtBookings)}
              onChange={(v) => setEditing({ ...editing, includedCourtBookings: num(v) })}
            />
            <TextInput
              label="Reset kuota tiap (hari)"
              labelInfo="Periode siklus kuota. cth. 30 = kuota di-reset tiap 30 hari. Isi 0 jika kuota tidak pernah reset."
              value={String(editing.resetPeriodDays)}
              onChange={(v) => setEditing({ ...editing, resetPeriodDays: num(v) })}
            />

            <TextInput
              label="Coaching gratis / siklus"
              labelInfo="Jumlah sesi coaching yang coach fee-nya digratiskan per siklus."
              value={String(editing.freeCoaching)}
              onChange={(v) => setEditing({ ...editing, freeCoaching: num(v) })}
            />
            <TextInput
              label="Diskon booking setelah kuota (%)"
              labelInfo="Diskon tarif lapangan untuk booking SETELAH kuota gratis habis."
              value={String(editing.courtDiscountPct)}
              onChange={(v) =>
                setEditing({ ...editing, courtDiscountPct: Math.min(100, num(v)) })
              }
            />

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
                Benefit (satu per baris)
              </label>
              <textarea
                value={editing.perksText}
                onChange={(e) => setEditing({ ...editing, perksText: e.target.value })}
                rows={4}
                placeholder={"4x booking lapangan gratis / siklus\n15% off setelah kuota habis"}
                className="w-full rounded-lg border border-[var(--border-default)] bg-transparent px-3 py-2.5 text-sm text-[var(--text-heading)] placeholder:text-[var(--text-muted)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-3 focus:ring-[rgba(37,99,235,0.12)]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={editing.active}
                  onChange={(v) => setEditing({ ...editing, active: v })}
                />
                <span className="text-sm text-[var(--text-body)]">Plan aktif (bisa dipilih)</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={!!editing.highlighted}
                  onChange={(v) => setEditing({ ...editing, highlighted: v })}
                />
                <span className="text-sm text-[var(--text-body)]">Tandai &quot;Popular&quot;</span>
              </div>
            </div>
          </div>
        )}
      </ModalDialog>
    </PageScaffold>
  );
}
