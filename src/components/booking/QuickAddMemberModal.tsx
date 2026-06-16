"use client";

// PadelHub — quick "register member" modal used inside the New Booking flow.
// Minimal fields (nama, username, password, telepon, email) so front-desk can
// register a login-capable member on the spot without leaving the booking
// screen. Persists to the tenant DB via registerMemberAction. No membership
// tier — tier economics are deferred. Returns the created Member to the caller.

import React, { useEffect, useState } from "react";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import { useToast } from "@/components/ui/toast/ToastContext";
import countriesData from "@/data/countries.json";
import { registerMemberAction } from "@/app/(admin)/members/actions";

const countries = countriesData as Country[];

/** Lightweight member returned to the caller after a successful register. */
export interface CreatedMember {
  id: string;
  name: string;
  phone: string;
  tier: string;
}

interface QuickAddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** prefilled name typed in the member search */
  initialName?: string;
  onCreated: (member: CreatedMember) => void;
}

const QuickAddMemberModal: React.FC<QuickAddMemberModalProps> = ({
  isOpen,
  onClose,
  initialName = "",
  onCreated,
}) => {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // suggest a username from the typed name
  const suggestUsername = (n: string) =>
    n.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setUsername(suggestUsername(initialName));
      setPassword("");
      setPhone("");
      setEmail("");
      setSubmitted(false);
      setSaving(false);
    }
  }, [isOpen, initialName]);

  const nameValid = name.trim().length >= 2;
  const usernameValid = username.trim().length >= 3;
  const passwordValid = password.length >= 6;
  const phoneValid = phone.replace(/\D/g, "").length >= 8;
  const canSubmit = nameValid && usernameValid && passwordValid && phoneValid;

  const create = async () => {
    setSubmitted(true);
    if (!canSubmit || saving) return;
    setSaving(true);

    const res = await registerMemberAction({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      password,
      phone,
      email: email.trim() || undefined,
    });

    if (!res.success || !res.memberNo || !res.id) {
      toast.error(res.error || "Gagal mendaftarkan member.", "Registrasi gagal");
      setSaving(false);
      return;
    }

    toast.success(`${name.trim()} terdaftar (${res.memberNo}).`, "Member baru");
    onCreated({
      id: res.id,
      name: name.trim(),
      phone,
      tier: "daily",
    });
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Register Member Baru"
      description="Daftar cepat member (bisa login) untuk melanjutkan booking."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button variant="primary" sheen onClick={create} disabled={saving}>
            {saving ? "Menyimpan…" : "Simpan & Pilih"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextInput
          label="Nama Lengkap"
          labelInfo="Nama member yang tampil di booking, kalender & struk."
          value={name}
          onChange={(v) => {
            setName(v);
            if (!username || username === suggestUsername(name)) {
              setUsername(suggestUsername(v));
            }
          }}
          placeholder="cth. Andi Wijaya"
          required
          error={submitted && !nameValid}
          errorText="Nama minimal 2 karakter"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextInput
            label="Username"
            labelInfo="Username untuk login member. Huruf kecil tanpa spasi."
            value={username}
            onChange={(v) => setUsername(v.toLowerCase().replace(/\s+/g, ""))}
            placeholder="cth. andiwijaya"
            required
            error={submitted && !usernameValid}
            errorText="Username minimal 3 karakter"
          />
          <TextInput
            label="Password"
            labelInfo="Password awal untuk login member. Minimal 6 karakter."
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Minimal 6 karakter"
            required
            error={submitted && !passwordValid}
            errorText="Password minimal 6 karakter"
          />
        </div>

        <PhoneInput
          label="Nomor Telepon"
          labelInfo="Nomor aktif untuk konfirmasi & notifikasi booking."
          required
          countries={countries}
          value={phone}
          onChange={(full) => setPhone(full)}
          error={submitted && !phoneValid}
          hint={
            submitted && !phoneValid
              ? "Nomor telepon belum valid"
              : "Format: +62 8xx xxxx xxxx"
          }
        />

        <TextInput
          label="Email (opsional)"
          labelInfo="Untuk notifikasi email. Boleh dikosongkan."
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="cth. andi@email.com"
          validate
        />
      </div>
    </ModalDialog>
  );
};

export default QuickAddMemberModal;
