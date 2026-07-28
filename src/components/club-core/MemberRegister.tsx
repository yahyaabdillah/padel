"use client";

// PadelHub — member registration (single-page grouped form, no stepper).
// All sections render top-to-bottom in grouped cards; every field label carries
// an info tooltip. Membership plans come from the DB (m_membership_plan) and the
// court-booking benefit (free quota + post-quota discount) is computed with the
// SHARED calcMembershipBenefit() helper — the same one the booking payment uses,
// so pricing stays consistent everywhere. Coaching/PT is deferred this session.

import React, { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import InputLabel from "@/components/ui/input/InputLabel";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useClubData } from "@/components/club-core/ClubDataContext";
import {
  registerMemberAction,
  getActivePlansAction,
  type BookingDraftInput,
  type PlanOption,
} from "@/app/(admin)/members/actions";
import { calcMembershipBenefit } from "@/lib/membership-benefit";
import { formatIDR } from "@/components/club-core/format";
import countriesData from "@/data/countries.json";
import { courtById } from "@/data/padel/club/courts";
import CourtBookingStep from "./register/CourtBookingStep";
import { type DraftBooking, pad } from "./register/types";

const countries = countriesData as Country[];

const emailValid = (e: string) =>
  e.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

let draftSeq = 0;
const nextId = (p: string) => `${p}-${++draftSeq}`;

/** Grouped section wrapper — numbered heading + optional info tooltip. */
const FormSection: React.FC<{
  step: number;
  title: string;
  description?: string;
  info?: ReactNode;
  children: ReactNode;
}> = ({ step, title, description, info, children }) => (
  <section className="border-b border-[var(--border-default)] pb-8 last:border-0 last:pb-0">
    <div className="mb-5 flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
        {step}
      </span>
      <div>
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold text-[var(--text-heading)]">
            {title}
          </h3>
          {info && <InputLabel label="" tooltip={info} className="mb-0" />}
        </div>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-caption)]">
            {description}
          </p>
        )}
      </div>
    </div>
    {children}
  </section>
);

export default function MemberRegister() {
  const toast = useToast();
  const { courts, bookings, maintenance, addBooking, isReady } = useClubData();

  // Resolve a court from the LIVE store (DB) first, falling back to mock data
  // so format/partySize lookups work whether ids are UUID (DB) or mock slugs.
  const findCourt = (id: string) =>
    courts.find((c) => c.id === id) ?? courtById(id);

  // ── membership plans (from DB) ──
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const rows = await getActivePlansAction();
      setPlans(rows);
      // default to the highlighted plan, else the first, else none
      const def = rows.find((p) => p.highlighted) ?? rows[0] ?? null;
      setPlanId(def ? def.id : null);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const plan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId],
  );
  const quota = plan?.includedCourtBookings ?? 0;

  // ── identity ──
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // ── court booking (optional) ──
  const [courtEnabled, setCourtEnabled] = useState(false);
  const [courtDrafts, setCourtDrafts] = useState<DraftBooking[]>([]);

  const [submitted, setSubmitted] = useState(false);
  const [done, setDone] = useState<null | { memberNo: string; username: string; tempPassword: string }>(null);
  const [saving, setSaving] = useState(false);

  // ── benefit / cost (shared helper) ──
  // Court sessions are priced through calcMembershipBenefit: quota covers the
  // costliest sessions, the rest get the plan's post-quota discount. The plan's
  // one-time join fee is handed to the same helper so the grand total is one
  // source of truth (court payable + join fee).
  const joinFee = plan?.joinFee ?? 0;
  const benefit = useMemo(
    () =>
      calcMembershipBenefit({
        plan: plan
          ? {
              includedCourtBookings: plan.includedCourtBookings,
              courtDiscountPct: plan.courtDiscountPct,
            }
          : null,
        quotaRemaining: quota,
        sessions: courtDrafts.map((d) => ({ basePrice: d.price })),
        joinFee,
      }),
    [plan, quota, courtDrafts, joinFee],
  );

  const grandTotal = benefit.grandTotal;

  // ── validation ──
  const identityValid =
    name.trim().length >= 2 &&
    username.trim().length >= 3 &&
    phone.replace(/\D/g, "").length >= 8 &&
    emailValid(email);
  const canSubmit = identityValid;

  // ── persistence ──
  const finalize = async () => {
    setSubmitted(true);
    if (!canSubmit || saving) {
      if (!canSubmit)
        toast.error("Lengkapi data wajib sebelum menyimpan.", "Form belum lengkap");
      return;
    }
    setSaving(true);

    const customerLabel = name.trim();

    // Assemble court bookings to persist. Each draft's charged price comes from
    // the shared benefit result (quota → Rp0, otherwise discounted).
    const draftBookings: BookingDraftInput[] = courtDrafts.map((d, idx) => {
      const court = findCourt(d.courtId);
      const startMin = d.minute ?? 0;
      const startIso = `${d.dateKey}T${pad(d.hour)}:${pad(startMin)}:00`;
      const totalEndMin = d.hour * 60 + startMin + d.duration;
      const endH = Math.floor(totalEndMin / 60);
      const endM = totalEndMin % 60;
      const endIso = `${d.dateKey}T${pad(endH)}:${pad(endM)}:00`;
      const line = benefit.sessions[idx];
      const charged = line?.payable ?? d.price;
      return {
        courtId: d.courtId,
        start: startIso,
        end: endIso,
        type: "member",
        status: "confirmed",
        customer: customerLabel,
        partySize: court?.format === "single" ? 2 : 4,
        price: charged,
        note: line?.coveredByQuota
          ? "Gratis kuota membership"
          : line && line.discountPct > 0
            ? `Diskon ${line.discountPct}%`
            : undefined,
        createdBy: "Registration desk",
      };
    });

    const res = await registerMemberAction({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      phone,
      email: email.trim() || undefined,
      planId,
      collectJoinFee: true,
      bookings: draftBookings,
    });

    setSaving(false);

    if (!res.success || !res.memberNo) {
      toast.error(res.error || "Gagal menyimpan member.", "Registrasi gagal");
      return;
    }

    // mirror new booking(s) into the in-memory club store so the calendar updates
    draftBookings.forEach((b) => {
      const court = findCourt(b.courtId);
      addBooking({
        courtId: b.courtId,
        start: b.start,
        end: b.end,
        type: b.type,
        status: b.status,
        customer: b.customer,
        partySize: court?.format === "single" ? 2 : 4,
        price: b.price,
        note: b.note,
        createdBy: "Registration desk",
      });
    });

    setDone({
      memberNo: res.memberNo,
      username: res.username || username.trim().toLowerCase(),
      tempPassword: res.tempPassword ?? "",
    });
    toast.success(
      `${name.trim()} terdaftar${plan ? ` · ${plan.name}` : ""}.`,
      "Registrasi berhasil",
    );
  };

  const reset = () => {
    setName("");
    setUsername("");
    setPhone("");
    setEmail("");
    const def = plans.find((p) => p.highlighted) ?? plans[0] ?? null;
    setPlanId(def ? def.id : null);
    setCourtEnabled(false);
    setCourtDrafts([]);
    setSubmitted(false);
    setDone(null);
  };

  // ── loading skeleton ──
  if (!isReady || !plansLoaded) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Registrasi Member" />
        <Card padding="lg">
          <div className="space-y-4">
            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          </div>
        </Card>
      </div>
    );
  }

  let sectionNo = 0;

  return (
    <div>
      <PageBreadcrumb pageTitle="Registrasi Member" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Form ── */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <div className="space-y-8">
              {/* Identitas */}
              <FormSection
                step={++sectionNo}
                title="Identitas"
                description="Data diri member"
                info="Informasi dasar untuk membuat akun member dan menghubungi mereka."
              >
                <div className="grid grid-cols-1 gap-5">
                  <TextInput
                    label="Nama Lengkap"
                    labelInfo="Nama lengkap sesuai kartu identitas. Akan tampil di profil & invoice."
                    value={name}
                    onChange={setName}
                    placeholder="cth. Andi Wijaya"
                    required
                    error={submitted && name.trim().length < 2}
                    errorText="Nama minimal 2 karakter"
                  />
                  <TextInput
                    label="Username"
                    labelInfo="Username untuk login member ke portal. Huruf kecil tanpa spasi, unik per klub."
                    value={username}
                    onChange={(v) => setUsername(v.toLowerCase().replace(/\s+/g, ""))}
                    placeholder="cth. andiwijaya"
                    required
                    error={submitted && username.trim().length < 3}
                    errorText="Username minimal 3 karakter"
                    hint="Password login dibuat otomatis oleh sistem & ditampilkan setelah simpan"
                  />
                  <PhoneInput
                    label="Nomor Telepon"
                    labelInfo="Nomor aktif untuk notifikasi booking & WhatsApp. Format: +62 8xx xxxx xxxx."
                    required
                    countries={countries}
                    value={phone}
                    onChange={(full) => setPhone(full)}
                    error={submitted && phone.replace(/\D/g, "").length < 8}
                    hint={
                      submitted && phone.replace(/\D/g, "").length < 8
                        ? "Nomor telepon belum valid"
                        : "Format: +62 8xx xxxx xxxx"
                    }
                  />
                  <TextInput
                    label="Email (opsional)"
                    labelInfo="Digunakan untuk notifikasi email. Boleh dikosongkan."
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="cth. andi@email.com"
                    validate
                    hint="Untuk notifikasi (opsional)"
                  />
                </div>
              </FormSection>

              {/* Membership plan */}
              <FormSection
                step={++sectionNo}
                title="Membership"
                description="Pilih plan keanggotaan"
                info="Plan menentukan join fee (sekali bayar), kuota booking lapangan gratis per siklus, dan diskon setelah kuota habis. Benefit ini langsung dipakai saat booking."
              >
                {plans.length === 0 ? (
                  <p className="rounded-lg bg-[var(--surface-muted)] px-4 py-5 text-sm text-[var(--text-caption)]">
                    Belum ada plan membership aktif. Member tetap bisa didaftarkan
                    tanpa plan (bayar penuh per booking).
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {plans.map((p) => {
                      const active = p.id === planId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlanId(p.id)}
                          className={[
                            "rounded-2xl border p-4 text-left transition-all",
                            active
                              ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                              : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                              style={{ background: p.color }}
                            >
                              {p.name}
                            </span>
                            <span className="text-sm font-bold text-[var(--text-heading)]">
                              {p.joinFee === 0 ? "Gratis" : formatIDR(p.joinFee)}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {p.includedCourtBookings > 0 && (
                              <Badge size="sm" color="info" variant="light">
                                {p.includedCourtBookings} sesi 60 menit gratis
                              </Badge>
                            )}
                            {p.courtDiscountPct > 0 && (
                              <Badge size="sm" color="success" variant="light">
                                {p.courtDiscountPct}% off
                              </Badge>
                            )}
                            {p.joinFee === 0 && p.includedCourtBookings === 0 && (
                              <Badge size="sm" color="warning" variant="light">
                                Bayar per main
                              </Badge>
                            )}
                            {p.highlighted && (
                              <Badge size="sm" color="primary" variant="solid">
                                Popular
                              </Badge>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </FormSection>

              {/* Court booking */}
              <FormSection
                step={++sectionNo}
                title="Booking Court"
                description="Opsional — aktifkan untuk booking court saat registrasi"
                info="Aktifkan jika member ingin langsung booking court. Slot dalam kuota plan dihitung gratis, sisanya kena tarif (dengan diskon plan jika ada)."
              >
                <div className="mb-5 flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-heading)]">
                      Booking court sekarang?
                    </p>
                    <p className="text-xs text-[var(--text-caption)]">
                      Aktifkan untuk menambahkan booking court ke registrasi ini.
                    </p>
                  </div>
                  <Switch
                    checked={courtEnabled}
                    onChange={(v) => {
                      setCourtEnabled(v);
                      if (!v) setCourtDrafts([]);
                    }}
                  />
                </div>

                {courtEnabled && (
                  <CourtBookingStep
                    quota={quota}
                    courts={courts}
                    bookings={bookings}
                    maintenance={maintenance}
                    drafts={courtDrafts}
                    onAdd={(b) =>
                      setCourtDrafts((prev) => [...prev, { ...b, id: nextId("cb") }])
                    }
                    onRemove={(id) =>
                      setCourtDrafts((prev) => prev.filter((d) => d.id !== id))
                    }
                  />
                )}
              </FormSection>

              {/* Ringkasan */}
              <FormSection
                step={++sectionNo}
                title="Ringkasan"
                description="Periksa kembali sebelum menyimpan"
                info="Pastikan semua data sudah benar. Klik konfirmasi untuk menyimpan member & memproses pembayaran."
              >
                <div className="space-y-5">
                  <div>
                    <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                      Member
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <ReviewRow label="Nama" value={name.trim() || "—"} />
                      <ReviewRow label="Telepon" value={phone || "—"} />
                      <ReviewRow label="Email" value={email.trim() || "—"} />
                      <ReviewRow label="Plan" value={plan?.name ?? "Tanpa plan"} />
                    </dl>
                  </div>

                  {courtDrafts.length > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-semibold text-[var(--text-heading)]">
                        Court bookings
                      </h4>
                      <div className="space-y-2">
                        {courtDrafts.map((d, i) => {
                          const c = findCourt(d.courtId);
                          const line = benefit.sessions[i];
                          return (
                            <div
                              key={d.id}
                              className="flex items-center justify-between gap-3 text-sm"
                            >
                              <span className="text-[var(--text-body)]">
                                {c?.name} · {d.dateKey} · {pad(d.hour)}:{pad(d.minute ?? 0)} · {d.duration}m
                              </span>
                              {line?.coveredByQuota ? (
                                <span className="font-medium text-emerald-500">
                                  Gratis kuota
                                </span>
                              ) : line && line.discountPct > 0 ? (
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-[var(--text-muted)] line-through">
                                    {formatIDR(d.price)}
                                  </span>
                                  <span className="font-semibold text-[var(--text-heading)]">
                                    {formatIDR(line.payable)}
                                  </span>
                                </span>
                              ) : (
                                <span className="font-semibold text-[var(--text-heading)]">
                                  {formatIDR(d.price)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </FormSection>
            </div>

            {/* Submit */}
            <div className="mt-8 flex items-center justify-end border-t border-[var(--border-default)] pt-5">
              <Button
                variant="primary"
                sheen
                glow
                disabled={(submitted && !canSubmit) || saving}
                onClick={finalize}
              >
                {saving ? "Menyimpan…" : `Konfirmasi & Bayar · ${formatIDR(grandTotal)}`}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Sticky summary ── */}
        <div className="lg:col-span-1">
          <RegisterSummary
            name={name}
            planName={plan?.name ?? "Tanpa plan"}
            planColor={plan?.color ?? "#94A3B8"}
            joinFee={joinFee}
            courtCount={courtDrafts.length}
            quotaCovered={benefit.quotaCoveredCount}
            courtSubtotal={benefit.subtotal}
            courtSavings={benefit.totalSavings}
            courtPayable={benefit.payable}
            grandTotal={grandTotal}
          />
        </div>
      </div>

      {/* ── Success modal ── */}
      <Modal
        isOpen={!!done}
        onClose={reset}
        showCloseButton={false}
        className="max-w-md p-6 sm:p-8"
      >
        {done && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-7 w-7">
                <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">
              Registrasi berhasil
            </h3>
            <p className="mt-1 text-sm text-[var(--text-caption)]">
              {name.trim()} terdaftar{plan ? ` sebagai member ${plan.name}` : ""}.
            </p>
            <div className="mx-auto mt-5 max-w-xs rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 text-left text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-caption)]">No. Member</span>
                <span className="font-mono font-semibold text-[var(--text-heading)]">
                  {done.memberNo}
                </span>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span className="text-[var(--text-caption)]">Username</span>
                <span className="font-semibold text-[var(--text-heading)]">
                  {done.username}
                </span>
              </div>
              {done.tempPassword && (
                <div className="mt-1.5 flex justify-between">
                  <span className="text-[var(--text-caption)]">Password</span>
                  <span className="font-mono font-semibold text-[var(--text-heading)]">
                    {done.tempPassword}
                  </span>
                </div>
              )}
            </div>
            {done.tempPassword && (
              <p className="mx-auto mt-3 max-w-xs text-xs text-[var(--text-caption)]">
                Password dibuat otomatis. Berikan ke member — mereka bisa
                menggantinya nanti dari akun member.
              </p>
            )}
            <div className="mt-6">
              <Button variant="primary" sheen fullWidth onClick={reset}>
                Daftar member lain
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className="text-[var(--text-caption)]">{label}</dt>
    <dd className="text-right font-medium text-[var(--text-heading)]">{value}</dd>
  </div>
);

/* ── Sticky price summary (plan-driven, uses shared benefit numbers) ── */
const RegisterSummary: React.FC<{
  name: string;
  planName: string;
  planColor: string;
  joinFee: number;
  courtCount: number;
  quotaCovered: number;
  courtSubtotal: number;
  courtSavings: number;
  courtPayable: number;
  grandTotal: number;
}> = ({
  name,
  planName,
  planColor,
  joinFee,
  courtCount,
  quotaCovered,
  courtSubtotal,
  courtSavings,
  courtPayable,
  grandTotal,
}) => (
  <div className="lg:sticky lg:top-24">
    <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)]">
      <div
        className="flex items-center gap-3 px-5 py-4"
        style={{ background: `${planColor}14` }}
      >
        <span
          className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
          style={{ background: planColor }}
        >
          {(name.trim()[0] ?? "?").toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-heading)]">
            {name.trim() || "Member baru"}
          </p>
          <p className="text-xs text-[var(--text-caption)]">{planName}</p>
        </div>
      </div>

      <div className="space-y-2.5 px-5 py-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[var(--text-caption)]">Join fee</span>
          <span className="font-medium text-[var(--text-body)]">
            {joinFee === 0 ? "Gratis" : formatIDR(joinFee)}
          </span>
        </div>

        {courtCount > 0 && (
          <>
            <div className="pt-1 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
              Court bookings · {courtCount}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-caption)]">Subtotal court</span>
              <span className="font-medium text-[var(--text-body)]">
                {formatIDR(courtSubtotal)}
              </span>
            </div>
            {courtSavings > 0 && (
              <div className="flex items-center justify-between gap-3 text-emerald-500">
                <span>
                  Hemat membership
                  {quotaCovered > 0 ? ` (${quotaCovered}x kuota)` : ""}
                </span>
                <span className="font-medium">−{formatIDR(courtSavings)}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-caption)]">Bayar court</span>
              <span className="font-medium text-[var(--text-body)]">
                {formatIDR(courtPayable)}
              </span>
            </div>
          </>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-[var(--border-default)] pt-3">
          <span className="text-sm font-semibold text-[var(--text-heading)]">
            Total bayar
          </span>
          <span className="text-xl font-bold text-[var(--color-primary)]">
            {formatIDR(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  </div>
);
