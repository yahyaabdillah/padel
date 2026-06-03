"use client";

import React, { useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import Select from "@/components/ui/select/Select";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useRole } from "@/context/RoleContext";
import { planById } from "@/data/padel/tenant";

export default function ClubProfilePage() {
  const toast = useToast();
  const { club } = useRole();
  const plan = planById(club.plan);

  const [name, setName] = useState(club.name);
  const [tagline, setTagline] = useState(club.tagline);
  const [address, setAddress] = useState(club.address);
  const [phone, setPhone] = useState(club.phone);
  const [email, setEmail] = useState(club.email);
  const [timezone, setTimezone] = useState(club.timezone);
  const [currency, setCurrency] = useState(club.currency);
  const [dirty, setDirty] = useState(false);

  const mark = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setDirty(true);
  };

  const save = () => {
    toast.success("Club profile updated (dummy — not persisted).");
    setDirty(false);
  };

  return (
    <PageScaffold
      title="Club Profile"
      subtitle="Your club's public identity, contact details and localization settings."
      requireAny={["settings.view"]}
      actions={
        <Button variant="primary" sheen disabled={!dirty} onClick={save}>
          Save Changes
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Club Identity" padding="md">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-2xl">
                  🎾
                </div>
                <div>
                  <Button size="sm" variant="outline" onClick={() => toast.info("Logo upload (dummy).")}>Upload Logo</Button>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">PNG or SVG, square, min 256px.</p>
                </div>
              </div>
              <TextInput label="Club name" value={name} onChange={mark(setName)} />
              <TextInput label="Tagline" value={tagline} onChange={mark(setTagline)} />
              <Textarea label="Address" value={address} onChange={mark(setAddress)} rows={2} />
            </div>
          </Card>

          <Card title="Contact" padding="md">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput label="Phone" value={phone} onChange={mark(setPhone)} />
              <TextInput label="Email" type="email" value={email} onChange={mark(setEmail)} />
            </div>
          </Card>

          <Card title="Localization" padding="md">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select
                label="Timezone"
                value={timezone}
                searchable
                onChange={(v) => mark(setTimezone)(v as string)}
                options={[
                  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)" },
                  { value: "Asia/Makassar", label: "Asia/Makassar (WITA)" },
                  { value: "Asia/Jayapura", label: "Asia/Jayapura (WIT)" },
                ]}
              />
              <Select
                label="Currency"
                value={currency}
                searchable
                onChange={(v) => mark(setCurrency)(v as string)}
                options={[
                  { value: "IDR", label: "Indonesian Rupiah (IDR)" },
                  { value: "USD", label: "US Dollar (USD)" },
                  { value: "SGD", label: "Singapore Dollar (SGD)" },
                ]}
              />
            </div>
          </Card>
        </div>

        {/* Side: plan + summary */}
        <div className="space-y-6">
          <Card variant="accent-top" title="Subscription" padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-[var(--text-heading)]">{plan.name}</p>
                <p className="text-xs text-[var(--text-caption)]">{plan.blurb}</p>
              </div>
              <Badge color="primary" variant="light">Active</Badge>
            </div>
            <div className="mt-4 space-y-2">
              {plan.features.slice(0, 4).map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                  <span className="text-[var(--color-secondary)]">✓</span>{f}
                </div>
              ))}
            </div>
            <Button variant="soft" fullWidth className="mt-4" onClick={() => toast.info("Manage plan via platform billing.")}>
              Manage Plan
            </Button>
          </Card>

          <Card title="At a Glance" padding="md">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                <p className="text-xl font-bold text-[var(--text-heading)]">{club.courts}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Courts</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                <p className="text-xl font-bold text-[var(--text-heading)]">{club.openingTime}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Opens</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                <p className="text-xl font-bold text-[var(--text-heading)]">{club.closingTime}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Closes</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                <p className="text-xl font-bold text-[var(--text-heading)]">{club.slug}</p>
                <p className="text-[11px] text-[var(--text-muted)]">Slug</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </PageScaffold>
  );
}
