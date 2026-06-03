"use client";

import React, { useEffect, useMemo, useState } from "react";
import Drawer from "@/components/ui/drawer/Drawer";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import Select from "@/components/ui/select/Select";
import Switch from "@/components/ui/switch/Switch";
import {
  allPromoScopes,
  promoScopeLabels,
  type EnginePromo,
  type PromoKind,
  type PromoScope,
} from "@/data/padel/engage/promo-engine";
import {
  memberTierMeta,
  type MemberTier,
} from "@/data/padel/club/members";

const ALL_TIERS: MemberTier[] = ["daily", "casual", "pro", "elite"];
const TODAY_ISO = "2026-06-02";

export type PromoDraft = Omit<EnginePromo, "id">;

type FormState = {
  code: string;
  name: string;
  type: PromoKind;
  value: string;
  appliesTo: PromoScope[];
  audienceAll: boolean;
  tiers: MemberTier[];
  active: boolean;
  notify: boolean;
  validFrom: string;
  validTo: string;
  minSpend: string;
  maxDiscount: string;
};

const emptyForm = (): FormState => ({
  code: "",
  name: "",
  type: "percent",
  value: "",
  appliesTo: [],
  audienceAll: true,
  tiers: [],
  active: true,
  notify: true,
  validFrom: TODAY_ISO,
  validTo: "",
  minSpend: "",
  maxDiscount: "",
});

const fromPromo = (p: EnginePromo): FormState => ({
  code: p.code,
  name: p.name,
  type: p.type,
  value: String(p.value),
  appliesTo: [...p.appliesTo],
  audienceAll: p.audience === "all",
  tiers: p.audience === "all" ? [] : [...p.audience],
  active: p.active,
  notify: p.notify,
  validFrom: p.validFrom,
  validTo: p.validTo,
  minSpend: p.minSpend != null ? String(p.minSpend) : "",
  maxDiscount: p.maxDiscount != null ? String(p.maxDiscount) : "",
});

const scopeOptions = allPromoScopes.map((s) => ({
  value: s,
  label: promoScopeLabels[s],
}));

const tierOptions = ALL_TIERS.map((t) => ({
  value: t,
  label: memberTierMeta[t].label,
  desc: memberTierMeta[t].perk,
}));

interface PromoBuilderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** When set, drawer edits this promo; otherwise it creates a new one. */
  editing?: EnginePromo | null;
  onSubmit: (draft: PromoDraft, id?: string) => void;
}

const PromoBuilderDrawer: React.FC<PromoBuilderDrawerProps> = ({
  isOpen,
  onClose,
  editing,
  onSubmit,
}) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [touched, setTouched] = useState(false);

  // Reset form whenever the drawer opens (fresh create or hydrate editing row).
  useEffect(() => {
    if (isOpen) {
      setForm(editing ? fromPromo(editing) : emptyForm());
      setTouched(false);
    }
  }, [isOpen, editing]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const numValue = Number(form.value);
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.code.trim()) e.code = "Kode wajib diisi.";
    if (!form.name.trim()) e.name = "Nama wajib diisi.";
    if (!form.value.trim() || Number.isNaN(numValue) || numValue <= 0)
      e.value = "Nilai harus lebih dari 0.";
    else if (form.type === "percent" && numValue > 100)
      e.value = "Persen maksimal 100.";
    if (form.appliesTo.length === 0)
      e.appliesTo = "Pilih minimal satu cakupan.";
    if (!form.audienceAll && form.tiers.length === 0)
      e.tiers = "Pilih minimal satu tier.";
    if (!form.validFrom) e.validFrom = "Tanggal mulai wajib diisi.";
    if (!form.validTo) e.validTo = "Tanggal berakhir wajib diisi.";
    if (form.validFrom && form.validTo && form.validTo < form.validFrom)
      e.validTo = "Tanggal berakhir sebelum tanggal mulai.";
    return e;
  }, [form, numValue]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = () => {
    setTouched(true);
    if (!isValid) return;
    const draft: PromoDraft = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      type: form.type,
      value: numValue,
      appliesTo: form.appliesTo,
      audience: form.audienceAll ? "all" : form.tiers,
      notify: form.notify,
      active: form.active,
      validFrom: form.validFrom,
      validTo: form.validTo,
      ...(form.minSpend.trim() && Number(form.minSpend) > 0
        ? { minSpend: Number(form.minSpend) }
        : {}),
      ...(form.maxDiscount.trim() && Number(form.maxDiscount) > 0
        ? { maxDiscount: Number(form.maxDiscount) }
        : {}),
    };
    onSubmit(draft, editing?.id);
    onClose();
  };

  const showErr = (k: keyof FormState) => (touched ? errors[k] : undefined);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      size="w-full max-w-lg"
      title={editing ? "Edit Promo" : "New Promo"}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            {form.notify && !editing
              ? "Notifikasi akan dikirim saat dibuat."
              : "Tersimpan lokal (dummy)."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              sheen
              onClick={handleSubmit}
              disabled={touched && !isValid}
            >
              {editing ? "Save changes" : "Create promo"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Identity */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Promo code"
            placeholder="WEEKDAY30"
            required
            value={form.code}
            onChange={(v) => set("code", v.toUpperCase())}
            error={!!showErr("code")}
            errorText={showErr("code")}
            className="font-mono"
            hint="Kode unik promo (huruf besar, tanpa spasi)"
          />
          <TextInput
            label="Display name"
            placeholder="Off-Peak Weekday 30%"
            required
            value={form.name}
            onChange={(v) => set("name", v)}
            error={!!showErr("name")}
            errorText={showErr("name")}
            hint="Nama tampilan promo untuk member"
          />
        </div>

        {/* Kind + value */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-[var(--text-body)]">
              Discount kind
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["percent", "flat"] as PromoKind[]).map((k) => {
                const sel = form.type === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set("type", k)}
                    className={[
                      "h-11 rounded-lg border text-sm font-medium transition",
                      sel
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : "border-[var(--border-default)] text-[var(--text-body)] hover:border-[var(--border-strong)]",
                    ].join(" ")}
                  >
                    {k === "percent" ? "Percent %" : "Flat Rp"}
                  </button>
                );
              })}
            </div>
          </div>
          <TextInput
            type="number"
            label={form.type === "percent" ? "Value (%)" : "Value (Rp)"}
            placeholder={form.type === "percent" ? "30" : "100000"}
            required
            value={form.value}
            onChange={(v) => set("value", v)}
            error={!!showErr("value")}
            errorText={showErr("value")}
            hint={form.type === "percent" ? "Persentase diskon (1–100)" : "Nominal potongan dalam Rupiah"}
          />
        </div>

        {/* Scopes */}
        <Select
          label="Applies to"
          multiple
          searchable
          placeholder="Pilih cakupan transaksi..."
          options={scopeOptions}
          value={form.appliesTo}
          onChange={(v) => set("appliesTo", v as PromoScope[])}
          error={!!showErr("appliesTo")}
          hint={showErr("appliesTo") ?? "Boleh lebih dari satu surface."}
        />

        {/* Audience */}
        <div className="rounded-xl border border-[var(--border-light)] p-4">
          <Switch
            label="Available to all members"
            checked={form.audienceAll}
            onChange={(c) => set("audienceAll", c)}
          />
          {!form.audienceAll && (
            <div className="mt-4">
              <Select
                label="Restrict to tiers"
                multiple
                searchable
                placeholder="Pilih tier member..."
                options={tierOptions}
                value={form.tiers}
                onChange={(v) => set("tiers", v as MemberTier[])}
                error={!!showErr("tiers")}
                hint={showErr("tiers")}
              />
            </div>
          )}
        </div>

        {/* Validity window */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            type="text"
            label="Valid from"
            placeholder="2026-06-02"
            required
            value={form.validFrom}
            onChange={(v) => set("validFrom", v)}
            error={!!showErr("validFrom")}
            errorText={showErr("validFrom")}
            hint="Format: YYYY-MM-DD"
          />
          <TextInput
            type="text"
            label="Valid to"
            placeholder="2026-06-30"
            required
            value={form.validTo}
            onChange={(v) => set("validTo", v)}
            error={!!showErr("validTo")}
            errorText={showErr("validTo")}
            hint="Format: YYYY-MM-DD"
          />
        </div>

        {/* Optional limits */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            type="number"
            label="Min spend (Rp)"
            placeholder="Opsional"
            value={form.minSpend}
            onChange={(v) => set("minSpend", v)}
            hint="Kosongkan jika tanpa minimum."
          />
          <TextInput
            type="number"
            label="Max discount (Rp)"
            placeholder="Opsional"
            value={form.maxDiscount}
            onChange={(v) => set("maxDiscount", v)}
            hint="Batas potongan untuk promo persen."
          />
        </div>

        {/* Flags */}
        <div className="flex flex-col gap-4 rounded-xl border border-[var(--border-light)] p-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Switch
              label="Active immediately"
              checked={form.active}
              onChange={(c) => set("active", c)}
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Promo langsung berlaku setelah dibuat</p>
          </div>
          <div>
            <Switch
              label="Push broadcast notification"
              color="emerald"
              checked={form.notify}
              onChange={(c) => set("notify", c)}
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Kirim notifikasi ke member yang memenuhi syarat</p>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default PromoBuilderDrawer;
