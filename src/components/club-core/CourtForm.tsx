"use client";

// PadelHub — court create/edit form (dedicated page, not a modal).
// Flow: nama → setting lapangan & tampilan → harga normal/peak → hari available
// (row list). Each available day has a "Atur Waktu" button opening a modal where
// every hour can be set to Reguler / Peak / Libur (maintenance). Persists via
// useClubData. Every input carries an info tooltip.

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, ImageIcon, Trash2 } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import CurrencyInput from "@/components/ui/input/CurrencyInput";
import InputLabel from "@/components/ui/input/InputLabel";
import Switch from "@/components/ui/switch/Switch";
import Dropzone, { type DropzoneFile } from "@/components/ui/dropzone/Dropzone";
import ImageCropperModal from "@/components/ui/cropper/ImageCropperModal";
import type { CropResult } from "@/components/ui/cropper/ImageCropper";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useClubData } from "@/components/club-core/ClubDataContext";
import { uploadCourtImageAction } from "@/app/(admin)/courts/actions";
import { useOperatingHours } from "@/context/OperatingHoursContext";
import { formatIDR } from "@/components/club-core/format";
import ToneBadge from "@/components/club-core/ToneBadge";
import DayScheduleModal from "./DayScheduleModal";
import {
  type Court,
  type CourtEnvironment,
  type CourtWall,
  type CourtFormat,
  type CourtStatus,
  type DaySchedule,
  courtColors,
  courtEnvironmentMeta,
  courtWallMeta,
  courtFormatMeta,
  courtStatusMeta,
  weekdayMeta,
  makeDefaultSchedule,
  makeDaySlots,
  normalizeDaySchedule,
  dayOpenRangeLabel,
  dayPeakCount,
} from "@/data/padel/club/courts";

type CourtDraft = Omit<Court, "id">;

/** The court hero image ratio (matches the card/preview banner — wide strip). */
const HERO_ASPECT = 16 / 6; // ≈ 2.67 : 1
/** Tolerance before we force the crop modal (≈ a few %). */
const ASPECT_TOLERANCE = 0.04;

const makeEmptyDraft = (): CourtDraft => ({
  name: "",
  environment: "indoor",
  wall: "glass",
  format: "double",
  status: "active",
  priceOffPeak: 150_000,
  pricePeak: 230_000,
  schedule: makeDefaultSchedule(),
  color: courtColors[0],
  note: "",
});

const hourLabel = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** Label + tooltip helper for segmented groups (re-uses InputLabel). */
const FieldLabel: React.FC<{ label: string; tip: string }> = ({ label, tip }) => (
  <InputLabel label={label} tooltip={tip} />
);

const Segmented = <T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) => (
  <div className="inline-flex flex-wrap rounded-lg bg-[var(--surface-muted)] p-0.5">
    {options.map((o) => (
      <button
        key={o.value}
        type="button"
        onClick={() => onChange(o.value)}
        className={[
          "rounded-md px-3 py-1.5 text-sm font-medium transition-all",
          value === o.value
            ? "bg-[var(--surface-card)] text-[var(--color-primary)] shadow-theme-xs"
            : "text-[var(--text-caption)] hover:text-[var(--text-heading)]",
        ].join(" ")}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const Section: React.FC<{
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ step, title, description, children }) => (
  <section className="border-b border-[var(--border-default)] pb-7 last:border-0 last:pb-0">
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
        {step}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-heading)]">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--text-caption)]">{description}</p>
        )}
      </div>
    </div>
    {children}
  </section>
);

interface CourtFormProps {
  /** court id to edit; omit for create mode */
  courtId?: string;
}

export default function CourtForm({ courtId }: CourtFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { courts, addCourt, updateCourt, isReady } = useClubData();
  const { getDay, isReady: hoursReady, slotMinutes } = useOperatingHours();

  const editing = courtId ? courts.find((c) => c.id === courtId) : undefined;
  const isEdit = Boolean(courtId);

  const [draft, setDraft] = useState<CourtDraft>(() => {
    if (editing) {
      const { id: _id, ...rest } = editing;
      void _id;
      // ensure a full, 30-min-resolution 7-day schedule (migrates old data)
      const base =
        rest.schedule?.length === 7 ? rest.schedule : makeDefaultSchedule();
      const schedule = base.map(normalizeDaySchedule);
      return { ...makeEmptyDraft(), ...rest, schedule };
    }
    return makeEmptyDraft();
  });
  const [submitted, setSubmitted] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);

  const set = <K extends keyof CourtDraft>(key: K, value: CourtDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  // ── court hero image (crop to a consistent ratio, then upload to disk) ──
  // On upload: if the ratio matches HERO_ASPECT we upload as-is, otherwise we
  // open the crop modal first. The cropped/normalized image is written to
  // /public/images/courts via a server action and only its PATH is stored.
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const persistImage = useCallback(
    async (dataUrl: string) => {
      setUploadingImage(true);
      const res = await uploadCourtImageAction(dataUrl);
      setUploadingImage(false);
      if (!res.success || !res.path) {
        toast.error(res.error || "Gagal mengunggah gambar.", "Upload gagal");
        return;
      }
      setDraft((d) => ({ ...d, image: res.path }));
    },
    [toast],
  );

  const handleImageUpload = useCallback(
    (files: DropzoneFile[]) => {
      const file = files[files.length - 1]?.file;
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        const matches =
          Math.abs(ratio - HERO_ASPECT) <= HERO_ASPECT * ASPECT_TOLERANCE;
        if (matches) {
          // already the right ratio → upload as-is
          try {
            const dataUrl = await fileToDataUrl(file);
            await persistImage(dataUrl);
          } finally {
            URL.revokeObjectURL(url);
          }
        } else {
          // ratio mismatch → let the user crop first
          setCropSrc(url);
        }
      };
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    },
    [persistImage],
  );

  const handleCropConfirm = async (result: CropResult) => {
    const src = cropSrc;
    setCropSrc(null);
    await persistImage(result.dataUrl);
    if (src) URL.revokeObjectURL(src);
  };

  const handleCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const removeImage = () => set("image", "");

  // Master operating window for a weekday (closed-day → empty window).
  const windowFor = (day: number) => {
    const oh = getDay(day);
    return oh.open
      ? { openStart: oh.openStart, openEnd: oh.openEnd }
      : { openStart: 0, openEnd: 0 };
  };

  const toggleDayAvailable = (day: number) =>
    setDraft((d) => ({
      ...d,
      schedule: d.schedule.map((s) => {
        if (s.day !== day) return s;
        const { openStart, openEnd } = windowFor(day);
        return {
          ...s,
          available: !s.available,
          // restore a sensible default slot-map (within master operating window)
          // when re-enabling an empty day
          slots:
            !s.available && s.slots.every((h) => h === "closed")
              ? makeDaySlots({ openStart, openEnd })
              : s.slots,
        };
      }),
    }));

  const saveDaySchedule = (next: DaySchedule) =>
    setDraft((d) => ({
      ...d,
      schedule: d.schedule.map((s) => (s.day === next.day ? next : s)),
    }));

  // ── validation ──
  const nameValid = draft.name.trim().length >= 2;
  const priceValid = draft.priceOffPeak > 0 && draft.pricePeak > 0;
  const anyDayOpen = draft.schedule.some((s) => s.available);
  const canSubmit = nameValid && priceValid && anyDayOpen;

  // ordered Mon→Sun for display
  const orderedSchedule = useMemo(
    () =>
      weekdayMeta
        .map((w) => draft.schedule.find((s) => s.day === w.value))
        .filter((s): s is DaySchedule => Boolean(s)),
    [draft.schedule],
  );

  const editingDaySchedule =
    editingDay != null
      ? draft.schedule.find((s) => s.day === editingDay) ?? null
      : null;
  const editingWindow = editingDay != null ? windowFor(editingDay) : { openStart: 0, openEnd: 0 };

  const save = () => {
    setSubmitted(true);
    if (!canSubmit) {
      toast.error("Lengkapi data wajib sebelum menyimpan.", "Form belum lengkap");
      return;
    }
    if (isEdit && editing) {
      updateCourt(editing.id, draft);
      toast.success("Lapangan diperbarui");
    } else {
      addCourt(draft);
      toast.success("Lapangan ditambahkan");
    }
    router.push("/courts");
  };

  // ── loading / not-found guards ──
  if (!isReady || !hoursReady) {
    return (
      <div>
        <PageBreadcrumb pageTitle={isEdit ? "Edit Lapangan" : "Tambah Lapangan"} />
        <Card padding="lg">
          <div className="space-y-4">
            <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
            <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          </div>
        </Card>
      </div>
    );
  }

  if (isEdit && !editing) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit Lapangan" />
        <Card padding="lg">
          <div className="py-10 text-center">
            <p className="text-sm text-[var(--text-caption)]">
              Lapangan tidak ditemukan.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.push("/courts")}>
                Kembali ke daftar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={isEdit ? "Edit Lapangan" : "Tambah Lapangan"} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Form ── */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <div className="space-y-7">
              {/* 1 · Nama */}
              <Section step={1} title="Nama Lapangan" description="Identitas lapangan">
                <TextInput
                  label="Nama Lapangan"
                  labelInfo="Nama lapangan yang tampil di kalender booking, grid, dan struk."
                  value={draft.name}
                  onChange={(v) => set("name", v)}
                  placeholder="cth. Center Court"
                  required
                  error={submitted && !nameValid}
                  errorText="Nama minimal 2 karakter"
                />
              </Section>

              {/* 2 · Setting & tampilan */}
              <Section
                step={2}
                title="Pengaturan & Tampilan"
                description="Karakteristik lapangan, status, dan warna aksen"
              >
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <FieldLabel
                        label="Lingkungan"
                        tip="Indoor = di dalam ruangan ber-atap; Outdoor = lapangan terbuka."
                      />
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
                      <FieldLabel
                        label="Jenis Dinding"
                        tip="Kaca = panoramic glass (pantulan bola); Jaring = steel mesh."
                      />
                      <Segmented<CourtWall>
                        options={[
                          { value: "glass", label: "Kaca" },
                          { value: "mesh", label: "Jaring" },
                        ]}
                        value={draft.wall}
                        onChange={(v) => set("wall", v)}
                      />
                    </div>
                    <div>
                      <FieldLabel
                        label="Format"
                        tip="Double = 2v2 (lapangan penuh); Single = 1v1 (lapangan sempit)."
                      />
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
                      <FieldLabel
                        label="Status"
                        tip="Aktif = bisa dibooking; Perbaikan = sedang maintenance; Nonaktif = disembunyikan."
                      />
                      <Segmented<CourtStatus>
                        options={[
                          { value: "active", label: "Aktif" },
                          { value: "maintenance", label: "Perbaikan" },
                          { value: "inactive", label: "Nonaktif" },
                        ]}
                        value={draft.status}
                        onChange={(v) => set("status", v)}
                      />
                    </div>
                  </div>

                  <div>
                    <FieldLabel
                      label="Warna Aksen"
                      tip="Warna yang dipakai untuk membedakan lapangan di kalender & grid. Juga dipakai sebagai latar hero bila tidak ada gambar."
                    />
                    <div className="flex flex-wrap gap-2">
                      {courtColors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => set("color", c)}
                          className={[
                            "h-8 w-8 rounded-full transition-transform",
                            draft.color === c
                              ? "ring-2 ring-offset-2 ring-[var(--color-primary)] ring-offset-[var(--surface-card)]"
                              : "hover:scale-110",
                          ].join(" ")}
                          style={{ background: c }}
                          aria-label={`Pilih warna ${c}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hero image (overrides the accent color background) */}
                  <div>
                    <FieldLabel
                      label="Gambar Hero (opsional)"
                      tip="Gambar latar pada bagian hero lapangan. Saat diunggah, gambar dengan rasio berbeda akan diminta dipotong agar konsisten (rasio lebar)."
                    />
                    {draft.image ? (
                      <div className="space-y-3">
                        <div
                          className="relative w-full overflow-hidden rounded-xl border border-[var(--border-default)]"
                          style={{ aspectRatio: String(HERO_ASPECT) }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={draft.image}
                            alt="Hero lapangan"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            startIcon={<ImageIcon className="h-4 w-4" />}
                            onClick={() => setCropSrc(draft.image ?? null)}
                          >
                            Sesuaikan ulang
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                            startIcon={<Trash2 className="h-4 w-4" />}
                            onClick={removeImage}
                          >
                            Hapus gambar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Dropzone
                        multiple={false}
                        showPreview={false}
                        disabled={uploadingImage}
                        icon={<ImageIcon className="h-7 w-7" />}
                        title={uploadingImage ? "Mengunggah…" : "Unggah gambar lapangan"}
                        description="atau klik untuk memilih (JPG / PNG)"
                        validation={{ accept: ["image/png", "image/jpeg"], maxSizeMB: 8, maxFiles: 1 }}
                        onFilesChange={handleImageUpload}
                        onReject={(_f, reason) => toast.error(reason, "Gambar ditolak")}
                      />
                    )}
                  </div>

                  <Textarea
                    label="Catatan (opsional)"
                    value={draft.note ?? ""}
                    onChange={(v) => set("note", v)}
                    rows={2}
                    placeholder="cth. Lapangan panoramic dengan lighting broadcast."
                    hint="Catatan singkat yang tampil di kartu lapangan."
                  />
                </div>
              </Section>

              {/* 3 · Harga */}
              <Section
                step={3}
                title="Harga Sewa per Jam"
                description="Harga normal & peak — dipakai berdasarkan tipe jam di jadwal"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <CurrencyInput
                    label="Harga Normal / jam"
                    labelInfo="Tarif untuk jam bertipe Reguler di jadwal."
                    value={draft.priceOffPeak}
                    onChange={(v) => set("priceOffPeak", v)}
                    required
                    error={submitted && draft.priceOffPeak <= 0}
                    errorText="Harga normal wajib diisi"
                  />
                  <CurrencyInput
                    label="Harga Peak / jam"
                    labelInfo="Tarif untuk jam bertipe Peak di jadwal (jam ramai)."
                    value={draft.pricePeak}
                    onChange={(v) => set("pricePeak", v)}
                    required
                    error={submitted && draft.pricePeak <= 0}
                    errorText="Harga peak wajib diisi"
                  />
                </div>
              </Section>

              {/* 4 · Hari available + per-day schedule */}
              <Section
                step={4}
                title="Hari Tersedia & Jadwal"
                description="Aktifkan hari operasional, lalu atur tipe tiap jam (reguler / peak / libur)"
              >
                {/* operating-hours source note */}
                <div className="mb-5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-muted)] px-4 py-3">
                  <div className="flex items-start gap-2">
                    <Clock className="mt-0.5 h-4 w-4 text-[var(--text-caption)]" />
                    <p className="text-xs text-[var(--text-caption)]">
                      Jam operasional mengikuti{" "}
                      <span className="font-medium text-[var(--text-heading)]">
                        Master · Jam Operasional
                      </span>
                      . Jam di luar jam buka otomatis terkunci sebagai libur.
                    </p>
                  </div>
                  <Link
                    href="/settings/hours"
                    className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Atur Jam Operasional →
                  </Link>
                </div>

                <div className="space-y-2.5">
                  {orderedSchedule.map((s) => {
                    const meta = weekdayMeta.find((w) => w.value === s.day)!;
                    const peakN = dayPeakCount(s);
                    const oh = getDay(s.day);
                    const masterClosed = !oh.open;
                    return (
                      <div
                        key={s.day}
                        className={[
                          "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors",
                          s.available && !masterClosed
                            ? "border-[var(--border-default)] bg-[var(--surface-card)]"
                            : "border-dashed border-[var(--border-default)] bg-[var(--surface-muted)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          {/* availability toggle */}
                          <Switch
                            checked={s.available && !masterClosed}
                            disabled={masterClosed}
                            onChange={() => toggleDayAvailable(s.day)}
                          />
                          <div>
                            <p className="text-sm font-semibold text-[var(--text-heading)]">
                              {meta.label}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {masterClosed ? (
                                <span className="text-xs text-[var(--color-error,#ef4444)]">
                                  Tutup (master)
                                </span>
                              ) : (
                                <>
                                  <span className="text-xs text-[var(--text-caption)]">
                                    {s.available
                                      ? dayOpenRangeLabel(s)
                                      : "Libur"}
                                  </span>
                                  <span className="text-[11px] text-[var(--text-muted)]">
                                    · operasional {hourLabel(oh.openStart)}–
                                    {hourLabel(oh.openEnd)}
                                  </span>
                                </>
                              )}
                              {s.available && !masterClosed && peakN > 0 && (
                                <ToneBadge tone="primary">{peakN} jam peak</ToneBadge>
                              )}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!s.available || masterClosed}
                          startIcon={<Clock className="h-4 w-4" />}
                          onClick={() => setEditingDay(s.day)}
                        >
                          Atur Waktu
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {submitted && !anyDayOpen && (
                  <p className="mt-3 text-xs text-[var(--color-error,#ef4444)]">
                    Minimal satu hari harus tersedia.
                  </p>
                )}
              </Section>
            </div>

            {/* Actions */}
            <div className="mt-7 flex items-center justify-end gap-2 border-t border-[var(--border-default)] pt-5">
              <Button variant="outline" onClick={() => router.push("/courts")}>
                Batal
              </Button>
              <Button variant="primary" sheen glow onClick={save}>
                {isEdit ? "Simpan Perubahan" : "Tambah Lapangan"}
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Live preview ── */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <Card padding="none">
              <div
                className="relative h-24 rounded-t-2xl bg-cover bg-center"
                style={
                  draft.image
                    ? { backgroundImage: `url(${draft.image})` }
                    : {
                        background: `linear-gradient(120deg, ${draft.color}, color-mix(in srgb, ${draft.color} 55%, #000))`,
                      }
                }
              >
                {draft.image && (
                  <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-black/60 to-transparent" />
                )}
                <div className="absolute right-3 top-3">
                  <ToneBadge tone={courtStatusMeta[draft.status].tone} variant="solid">
                    {courtStatusMeta[draft.status].label}
                  </ToneBadge>
                </div>
                <h3 className="absolute bottom-3 left-4 text-lg font-bold text-white drop-shadow">
                  {draft.name.trim() || "Nama Lapangan"}
                </h3>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  <ToneBadge tone={courtEnvironmentMeta[draft.environment].tone}>
                    {courtEnvironmentMeta[draft.environment].label}
                  </ToneBadge>
                  <ToneBadge tone="neutral">{courtWallMeta[draft.wall].label}</ToneBadge>
                  <ToneBadge tone="secondary">
                    {courtFormatMeta[draft.format].label}
                  </ToneBadge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                      Normal
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-heading)]">
                      {formatIDR(draft.priceOffPeak)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[var(--color-primary-light)] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-[var(--color-primary)]">
                      Peak
                    </p>
                    <p className="text-sm font-semibold text-[var(--color-primary)]">
                      {formatIDR(draft.pricePeak)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-[var(--border-default)] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                    Jadwal Mingguan
                  </p>
                  <div className="mt-2 space-y-1">
                    {orderedSchedule.map((s) => {
                      const meta = weekdayMeta.find((w) => w.value === s.day)!;
                      return (
                        <div
                          key={s.day}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-[var(--text-body)]">{meta.label}</span>
                          <span
                            className={
                              s.available
                                ? "text-[var(--text-caption)]"
                                : "text-[var(--color-error,#ef4444)]"
                            }
                          >
                            {dayOpenRangeLabel(s)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <DayScheduleModal
        isOpen={editingDay != null}
        onClose={() => setEditingDay(null)}
        schedule={editingDaySchedule}
        openStart={editingWindow.openStart}
        openEnd={editingWindow.openEnd}
        slotMinutes={slotMinutes}
        onSave={saveDaySchedule}
      />

      <ImageCropperModal
        isOpen={cropSrc != null}
        src={cropSrc}
        aspect={HERO_ASPECT}
        outputWidth={1280}
        title="Sesuaikan Gambar Lapangan"
        description="Atur posisi & zoom agar gambar pas dengan rasio hero lapangan."
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
