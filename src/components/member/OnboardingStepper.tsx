"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/ui/card/Card";
import Stepper, { type StepItem } from "@/components/ui/stepper/Stepper";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import UiSelect from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import RadioGroup from "@/components/ui/input/RadioGroup";
import NumberSlider from "@/components/ui/slider/NumberSlider";
import Badge from "@/components/ui/badge/Badge";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useOnboarding, type OnboardingProfile } from "@/context/OnboardingContext";

/* ── option sets (mirror the registration profile vocabulary) ── */
const steps: StepItem[] = [
  { label: "Tentang Kamu", description: "Gender, lahir, kota" },
  { label: "Gaya Main", description: "Skill, tangan, posisi" },
  { label: "Aktivitas", description: "Frekuensi & darurat" },
  { label: "Review", description: "Cek & simpan" },
];

const genderOptions = [
  { value: "L", label: "Laki-laki" },
  { value: "P", label: "Perempuan" },
];

const skillOptions = [
  { value: "beginner", label: "Pemula", description: "Baru mulai / < 6 bulan" },
  { value: "intermediate", label: "Menengah", description: "Reli stabil, paham posisi" },
  { value: "advanced", label: "Mahir", description: "Kompetitif / turnamen" },
];

const handOptions = [
  { value: "right", label: "Kanan" },
  { value: "left", label: "Kidal" },
];

const positionOptions = [
  { value: "right", label: "Kanan (Drive)", desc: "Sisi forehand" },
  { value: "left", label: "Kiri (Reves)", desc: "Sisi backhand" },
  { value: "both", label: "Fleksibel", desc: "Bisa kedua sisi" },
];

const frequencyOptions = [
  { value: "1-2", label: "1–2x / minggu", description: "Kasual" },
  { value: "3-4", label: "3–4x / minggu", description: "Rutin" },
  { value: "5+", label: "5x+ / minggu", description: "Intensif" },
];

type FormState = {
  gender: "L" | "P";
  birthDate: Date | null;
  city: string;
  avatar: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  dominantHand: "left" | "right";
  position: "left" | "right" | "both";
  rating: number;
  playFrequency: "1-2" | "3-4" | "5+";
  emergencyName: string;
  emergencyPhone: string;
};

export default function OnboardingStepper() {
  const router = useRouter();
  const toast = useToast();
  const { complete, skip, member, isReady } = useOnboarding();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    gender: member?.gender ?? "L",
    birthDate: member?.birthDate ? new Date(member.birthDate) : null,
    city: member?.city ?? "",
    avatar: member?.avatar ?? "",
    skillLevel: member?.skillLevel ?? "intermediate",
    dominantHand: member?.dominantHand ?? "right",
    position: member?.position ?? "right",
    rating: member?.rating ?? 1200,
    playFrequency: member?.playFrequency ?? "1-2",
    emergencyName: member?.emergencyName ?? "",
    emergencyPhone: member?.emergencyPhone ?? "",
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const isLast = step === steps.length - 1;

  const toProfile = (): OnboardingProfile => ({
    gender: form.gender,
    birthDate: form.birthDate ? form.birthDate.toISOString() : null,
    city: form.city.trim() || undefined,
    avatar: form.avatar.trim() || undefined,
    skillLevel: form.skillLevel,
    dominantHand: form.dominantHand,
    position: form.position,
    rating: form.rating,
    playFrequency: form.playFrequency,
    emergencyName: form.emergencyName.trim() || undefined,
    emergencyPhone: form.emergencyPhone.trim() || undefined,
  });

  const finish = () => {
    complete(toProfile());
    toast.success("Profil padel tersimpan. Selamat bermain!", "Onboarding selesai");
    router.push("/me");
  };

  const handleSkip = () => {
    skip();
    toast.info("Kamu bisa melengkapi profil kapan saja dari Pengaturan.", "Dilewati");
    router.push("/me");
  };

  const goNext = () => (isLast ? finish() : setStep((s) => s + 1));

  const review = useMemo(
    () => [
      { label: "Gender", value: genderOptions.find((g) => g.value === form.gender)?.label ?? "—" },
      {
        label: "Tanggal lahir",
        value: form.birthDate
          ? form.birthDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
          : "—",
      },
      { label: "Kota", value: form.city || "—" },
      { label: "Skill", value: skillOptions.find((s) => s.value === form.skillLevel)?.label ?? "—" },
      { label: "Tangan dominan", value: handOptions.find((h) => h.value === form.dominantHand)?.label ?? "—" },
      { label: "Posisi", value: positionOptions.find((p) => p.value === form.position)?.label ?? "—" },
      { label: "Rating", value: `${form.rating} pts` },
      { label: "Frekuensi", value: frequencyOptions.find((f) => f.value === form.playFrequency)?.label ?? "—" },
      { label: "Kontak darurat", value: form.emergencyName ? `${form.emergencyName} · ${form.emergencyPhone || "—"}` : "—" },
    ],
    [form],
  );

  const initials = (member?.name ?? "P")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card padding="lg">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-heading)]">
            Lengkapi profil padel
          </h3>
          <p className="mt-1 text-sm text-[var(--text-caption)]">
            Semua bersifat opsional — isi yang kamu mau, lewati sisanya kapan saja.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkip}>
          Lewati untuk sekarang
        </Button>
      </div>

      <Stepper steps={steps} currentStep={step} onStepClick={(i) => i < step && setStep(i)} />

      <div className="mt-8 max-w-3xl">
        {/* ── Step 0: Tentang Kamu ── */}
        {step === 0 && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-primary-light)] text-lg font-bold text-[var(--color-primary)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {form.avatar ? (
                  <img src={form.avatar} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1">
                <TextInput
                  label="URL Foto Profil (opsional)"
                  value={form.avatar}
                  onChange={(v) => set("avatar", v)}
                  placeholder="https://… atau biarkan kosong"
                  hint="Tempel link foto; default pakai inisial."
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
                Jenis Kelamin
              </label>
              <RadioGroup
                options={genderOptions}
                value={form.gender}
                onChange={(v) => set("gender", v as FormState["gender"])}
                direction="horizontal"
              />
            </div>

            <DatePicker
              label="Tanggal Lahir"
              mode="single"
              value={form.birthDate}
              maxDate={new Date()}
              onChange={(v) => set("birthDate", (v as Date) ?? null)}
            />

            <div className="sm:col-span-2">
              <TextInput
                label="Kota"
                value={form.city}
                onChange={(v) => set("city", v)}
                placeholder="cth. Jakarta Selatan"
              />
            </div>
          </div>
        )}

        {/* ── Step 1: Gaya Main ── */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
                Level Permainan
              </label>
              <RadioGroup
                options={skillOptions}
                value={form.skillLevel}
                onChange={(v) => set("skillLevel", v as FormState["skillLevel"])}
                direction="horizontal"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
                Tangan Dominan
              </label>
              <RadioGroup
                options={handOptions}
                value={form.dominantHand}
                onChange={(v) => set("dominantHand", v as FormState["dominantHand"])}
                direction="horizontal"
              />
            </div>
            <UiSelect
              label="Posisi Favorit"
              options={positionOptions}
              value={form.position}
              onChange={(v) => set("position", v as FormState["position"])}
            />
            <div className="sm:col-span-2">
              <NumberSlider
                label="Rating (estimasi)"
                value={form.rating}
                min={1000}
                max={2200}
                step={20}
                unit="pts"
                color="accent"
                onChange={(v) => set("rating", v)}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Aktivitas ── */}
        {step === 2 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-[var(--text-body)]">
                Frekuensi Bermain
              </label>
              <RadioGroup
                options={frequencyOptions}
                value={form.playFrequency}
                onChange={(v) => set("playFrequency", v as FormState["playFrequency"])}
                direction="horizontal"
              />
            </div>
            <TextInput
              label="Kontak Darurat (Nama)"
              value={form.emergencyName}
              onChange={(v) => set("emergencyName", v)}
              placeholder="Nama kerabat"
            />
            <TextInput
              label="Kontak Darurat (Telepon)"
              value={form.emergencyPhone}
              onChange={(v) => set("emergencyPhone", v)}
              placeholder="08xx xxxx xxxx"
            />
          </div>
        )}

        {/* ── Step 3: Review ── */}
        {step === 3 && (
          <Card variant="accent-top" padding="md">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-heading)]">
                Ringkasan Profil
              </span>
              <Badge color="primary" variant="light">
                Opsional
              </Badge>
            </div>
            <dl className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
              {review.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3">
                  <dt className="text-[var(--text-caption)]">{r.label}</dt>
                  <dd className="truncate font-medium text-[var(--text-heading)]">{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 rounded-lg bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-muted)]">
              Data ini hanya untuk match-making & rekomendasi sesi. Bisa diubah
              kapan saja dari Profil.
            </p>
          </Card>
        )}
      </div>

      {/* ── Footer nav ── */}
      <div className="mt-8 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || !isReady}
        >
          Kembali
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Lewati
          </Button>
          <Button variant="primary" onClick={goNext} glow disabled={!isReady}>
            {isLast ? "Simpan Profil" : "Lanjut"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
