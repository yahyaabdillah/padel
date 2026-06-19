"use client";

// Company Settings — per-tenant company profile + check-in operational settings.
// Superadmin-only by default (governed by RBAC menu key "settings.company").

import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Building2, ScanLine, Clock, Trash2 } from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import Select from "@/components/ui/select/Select";
import InputLabel from "@/components/ui/input/InputLabel";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import Dropzone, { type DropzoneFile } from "@/components/ui/dropzone/Dropzone";
import ImageCropperModal from "@/components/ui/cropper/ImageCropperModal";
import type { CropResult } from "@/components/ui/cropper/ImageCropper";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import countriesData from "@/data/countries.json";
import { TIMEZONE_OPTIONS } from "@/data/padel/timezones";
import {
  getCompanyAction,
  saveCompanyAction,
  uploadLogoAction,
  type CompanyProfile,
} from "./actions";

const countries = countriesData as Country[];
const LOGO_ASPECT = 1; // 1:1

export default function CompanySettingsClient() {
  const toast = useToast();
  const { can, isSuper, refresh } = useAccess();
  const canUpdate = isSuper || can("settings.company", "update");

  const [form, setForm] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const cropObjUrl = useRef<string | null>(null);
  // mirror of `form` for use inside async callbacks without stale closures
  const formRef = useRef<CompanyProfile | null>(null);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setForm(await getCompanyAction());
    } catch {
      toast.error("Gagal memuat pengaturan perusahaan.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (p: Partial<CompanyProfile>) =>
    setForm((f) => (f ? { ...f, ...p } : f));

  /* ── logo upload → crop to 1:1 → persist ── */
  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const persistLogo = useCallback(
    async (dataUrl: string) => {
      setUploadingLogo(true);
      const res = await uploadLogoAction(dataUrl);
      if (!res.success || !res.path) {
        setUploadingLogo(false);
        toast.error(res.error || "Gagal mengunggah logo.", "Upload gagal");
        return;
      }

      // reflect in the form immediately
      patch({ logo: res.path });

      // persist to DB right away (so the logo survives without waiting for a
      // separate "Simpan"), then refresh sidebar/header branding.
      const current = formRef.current;
      if (current) {
        const saved = await saveCompanyAction({
          name: current.name,
          address: current.address,
          logo: res.path,
          phone: current.phone,
          email: current.email,
          timezone: current.timezone,
          scanStaffBooking: current.scanStaffBooking,
          strictWindow: current.strictWindow,
          checkinWindowMin: current.checkinWindowMin,
        });
        setUploadingLogo(false);
        if (!saved.success) {
          toast.error(saved.error || "Gagal menyimpan logo.", "Simpan gagal");
          return;
        }
        toast.success("Logo tersimpan.", "Logo siap");
        void refresh();
      } else {
        setUploadingLogo(false);
      }
    },
    [toast, refresh],
  );

  const handleLogoUpload = useCallback((files: DropzoneFile[]) => {
    const file = files[files.length - 1]?.file;
    if (!file) return;
    const url = URL.createObjectURL(file);
    cropObjUrl.current = url;
    // always open the cropper so the logo lands at a consistent 1:1 ratio
    setCropSrc(url);
  }, []);

  const handleCropConfirm = async (result: CropResult) => {
    setCropSrc(null);
    if (cropObjUrl.current) {
      URL.revokeObjectURL(cropObjUrl.current);
      cropObjUrl.current = null;
    }
    await persistLogo(result.dataUrl);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    if (cropObjUrl.current) {
      URL.revokeObjectURL(cropObjUrl.current);
      cropObjUrl.current = null;
    }
  };

  const save = async () => {
    if (!form || saving) return;
    if (!form.name.trim()) {
      toast.error("Nama perusahaan wajib diisi.", "Form belum lengkap");
      return;
    }
    setSaving(true);
    const res = await saveCompanyAction({
      name: form.name,
      address: form.address,
      logo: form.logo,
      phone: form.phone,
      email: form.email,
      timezone: form.timezone,
      scanStaffBooking: form.scanStaffBooking,
      strictWindow: form.strictWindow,
      checkinWindowMin: form.checkinWindowMin,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan.");
      return;
    }
    toast.success("Pengaturan perusahaan tersimpan.", "Tersimpan");
    void load();
    // refresh the sidebar/header branding (name + logo) immediately
    void refresh();
  };

  if (loading || !form) {
    return (
      <PageScaffold title="Company Settings" subtitle="Profil perusahaan & pengaturan check-in.">
        <div className="h-[400px] animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
      </PageScaffold>
    );
  }

  const disabled = !canUpdate;

  return (
    <PageScaffold
      title="Company Settings"
      subtitle="Atur identitas perusahaan, logo, zona waktu, dan perilaku check-in."
      actions={
        canUpdate ? (
          <Button variant="primary" sheen onClick={save} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan"}
          </Button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Profil perusahaan ── */}
        <Card className="lg:col-span-2" padding="lg">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <Building2 className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--text-heading)]">Profil Perusahaan</h3>
              <p className="text-xs text-[var(--text-muted)]">Identitas klub yang tampil di aplikasi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextInput
              label="Nama perusahaan"
              value={form.name}
              onChange={(v) => patch({ name: v })}
              placeholder="cth. SmashCourt Padel Club"
              required
              disabled={disabled}
            />
            <Select
              label="Zona waktu"
              searchable
              options={TIMEZONE_OPTIONS}
              value={form.timezone}
              onChange={(v) => patch({ timezone: v as string })}
              placeholder="Pilih zona waktu…"
              disabled={disabled}
            />
            <PhoneInput
              countries={countries}
              label="Telepon"
              value={form.phone ?? ""}
              onChange={(full) => patch({ phone: full })}
              disabled={disabled}
            />
            <TextInput
              label="Email"
              type="email"
              value={form.email ?? ""}
              onChange={(v) => patch({ email: v })}
              placeholder="info@klub.com"
              disabled={disabled}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Alamat"
                value={form.address ?? ""}
                onChange={(v) => patch({ address: v })}
                rows={3}
                placeholder="Alamat lengkap klub…"
                disabled={disabled}
              />
            </div>
          </div>
        </Card>

        {/* ── Logo ── */}
        <Card padding="lg">
          <h3 className="mb-1 text-base font-bold text-[var(--text-heading)]">Logo</h3>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Rasio 1:1. Tampil di sidebar & header.
          </p>

          {form.logo ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface-muted)]">
                <Image src={form.logo} alt="Logo" fill className="object-cover" sizes="128px" />
              </div>
              {canUpdate && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                  startIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => patch({ logo: null })}
                >
                  Hapus logo
                </Button>
              )}
            </div>
          ) : (
            canUpdate && (
              <Dropzone
                multiple={false}
                showPreview={false}
                validation={{ maxSizeMB: 8, accept: ["image/png", "image/jpeg", "image/webp"], maxFiles: 1 }}
                onFilesChange={handleLogoUpload}
                title={uploadingLogo ? "Mengunggah…" : "Unggah logo"}
                description="PNG / JPG / WebP, akan dipotong 1:1"
              />
            )
          )}
        </Card>

        {/* ── Pengaturan Check-in ── */}
        <Card className="lg:col-span-3" padding="lg">
          <div className="mb-5 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
              <ScanLine className="h-4.5 w-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-[var(--text-heading)]">Pengaturan Check-in</h3>
              <p className="text-xs text-[var(--text-muted)]">Atur arah scan QR & jendela check-in.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-[var(--text-heading)]">Staff scan booking</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {form.scanStaffBooking
                    ? "Aktif — member menampilkan QR booking, staff memindai dengan kamera."
                    : "Nonaktif — staff menampilkan QR statis, member memindai dari aplikasinya."}
                </p>
              </div>
              <Switch
                checked={form.scanStaffBooking}
                onChange={(v) => patch({ scanStaffBooking: v })}
                disabled={disabled}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl bg-[var(--surface-muted)] px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-[var(--text-heading)]">Jendela ketat</p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {form.strictWindow
                    ? `Aktif — check-in hanya diterima dalam ±${form.checkinWindowMin} menit dari jadwal booking.`
                    : "Nonaktif — booking apa pun hari ini bisa check-in."}
                </p>
              </div>
              <Switch
                checked={form.strictWindow}
                onChange={(v) => patch({ strictWindow: v })}
                disabled={disabled}
              />
            </div>

            <div className="max-w-xs">
              <InputLabel label="Toleransi jendela (menit)" tooltip="± menit dari jadwal booking yang dianggap tepat waktu (saat jendela ketat aktif)." />
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                <TextInput
                  type="number"
                  value={String(form.checkinWindowMin)}
                  onChange={(v) => patch({ checkinWindowMin: Math.max(0, Number(v) || 0) })}
                  disabled={disabled || !form.strictWindow}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <ImageCropperModal
        isOpen={cropSrc != null}
        src={cropSrc}
        aspect={LOGO_ASPECT}
        outputWidth={512}
        mimeType="image/png"
        title="Sesuaikan Logo"
        description="Atur posisi & zoom agar logo pas pada rasio 1:1."
        confirmLabel="Pakai Logo"
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />
    </PageScaffold>
  );
}
