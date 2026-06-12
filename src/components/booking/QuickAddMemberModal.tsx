"use client";

// PadelHub — quick "add member" modal used inside the New Booking flow.
// Minimal fields (nama, telepon, email, tier) so front-desk can register a new
// member on the spot without leaving the booking screen. Returns the created
// Member to the caller.

import React, { useEffect, useState } from "react";
import { ModalDialog } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import InputLabel from "@/components/ui/input/InputLabel";
import countriesData from "@/data/countries.json";
import {
  type Member,
  type MemberTier,
  memberTierMeta,
} from "@/data/padel/club/members";

const countries = countriesData as Country[];

const registrableTiers: MemberTier[] = ["casual", "pro", "elite", "daily"];

interface QuickAddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** prefilled name typed in the member search */
  initialName?: string;
  onCreated: (member: Member) => void;
}

const QuickAddMemberModal: React.FC<QuickAddMemberModalProps> = ({
  isOpen,
  onClose,
  initialName = "",
  onCreated,
}) => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<MemberTier>("casual");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setPhone("");
      setEmail("");
      setTier("casual");
      setSubmitted(false);
    }
  }, [isOpen, initialName]);

  const nameValid = name.trim().length >= 2;
  const phoneValid = phone.replace(/\D/g, "").length >= 8;
  const canSubmit = nameValid && phoneValid;

  const create = () => {
    setSubmitted(true);
    if (!canSubmit) return;

    const id = `mbr-new-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();
    const member: Member = {
      id,
      name: name.trim(),
      email: email.trim(),
      phone,
      avatar: "/images/user/user-01.jpg",
      tier,
      status: "active",
      walletBalance: 0,
      rating: 1000,
      position: "both",
      joinedAt: nowIso.slice(0, 10),
      lastVisit: nowIso.slice(0, 10),
      totalBookings: 0,
      totalSpend: 0,
      matchesPlayed: 0,
      wins: 0,
      city: "",
      history: [],
      onboarded: false,
      isDaily: tier === "daily",
    };

    // persist to localStorage so the new member survives a refresh
    try {
      const KEY = "padelhub-club-members";
      const prev = JSON.parse(window.localStorage.getItem(KEY) || "[]");
      prev.push(member);
      window.localStorage.setItem(KEY, JSON.stringify(prev));
    } catch {
      /* ignore */
    }

    onCreated(member);
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Member Baru"
      description="Daftar cepat member untuk melanjutkan booking."
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button variant="primary" sheen onClick={create}>
            Simpan & Pilih
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <TextInput
          label="Nama Lengkap"
          labelInfo="Nama member yang tampil di booking, kalender & struk."
          value={name}
          onChange={setName}
          placeholder="cth. Andi Wijaya"
          required
          error={submitted && !nameValid}
          errorText="Nama minimal 2 karakter"
        />

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
          labelInfo="Untuk login member portal & notifikasi email. Boleh dikosongkan."
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="cth. andi@email.com"
          validate
        />

        <div>
          <InputLabel
            label="Tier Membership"
            tooltip="Daily = walk-in bayar per sesi. Casual/Pro/Elite untuk member terdaftar dengan benefit berbeda."
          />
          <div className="grid grid-cols-2 gap-2">
            {registrableTiers.map((t) => {
              const meta = memberTierMeta[t];
              const active = t === tier;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTier(t)}
                  className={[
                    "rounded-xl border px-3 py-2.5 text-left transition-all",
                    active
                      ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] ring-2 ring-[var(--color-primary)]/30"
                      : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--color-primary)]/40",
                  ].join(" ")}
                >
                  <span
                    className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ background: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <p className="mt-1.5 text-xs text-[var(--text-caption)]">
                    {meta.perk}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </ModalDialog>
  );
};

export default QuickAddMemberModal;
