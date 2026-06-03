"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import Select from "@/components/ui/select/Select";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import {
  platformDefaults, brandPresets, currencyOptions, timezoneOptions, localeOptions,
  type PlatformDefaults,
} from "@/data/padel/platform/settings";
import { IconCheck } from "@/components/platform/icons";

export default function PlatformSettingsPage() {
  const toast = useToast();
  const { paletteId, setPalette } = useTheme();
  // Initialise the form's preset selection from the live palette so the page
  // reflects (and edits) the palette actually applied app-wide.
  const [s, setS] = useState<PlatformDefaults>({ ...platformDefaults, brandPresetId: paletteId });
  const set = <K extends keyof PlatformDefaults>(k: K, v: PlatformDefaults[K]) => setS((p) => ({ ...p, [k]: v }));

  // Picking a preset applies it live across the whole app + persists it.
  const choosePreset = (id: string) => {
    set("brandPresetId", id);
    setPalette(id);
    const p = brandPresets.find((b) => b.id === id);
    toast.success(`Palette "${p?.name ?? id}" applied across the app.`, "Theme updated");
  };

  const preset = brandPresets.find((b) => b.id === s.brandPresetId) ?? brandPresets[0];

  return (
    <div>
      <PageBreadcrumb pageTitle="Platform Settings" />
      <PlatformHeader
        eyebrow="Platform · Configuration"
        title="Platform Settings & Theme"
        description="Global defaults applied to every new club — branding, localisation and security policy."
        actions={<Button size="sm" variant="primary" sheen startIcon={<IconCheck className="h-4 w-4" />} onClick={() => toast.success("Platform settings saved (dummy).", "Saved")}>Save changes</Button>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Brand identity */}
        <ComponentCard title="Brand Identity" desc="Product name, logo wordmark and support contact">
          <div className="space-y-4">
            <TextInput label="Product name" value={s.productName} onChange={(v) => set("productName", v)} />
            <TextInput label="Logo wordmark" value={s.logoText} onChange={(v) => set("logoText", v)} hint="Displayed in the sidebar & header" />
            <Textarea label="Tagline" rows={2} value={s.tagline} onChange={(v) => set("tagline", v)} />
            <TextInput label="Support email" type="email" value={s.supportEmail} onChange={(v) => set("supportEmail", v)} />
          </div>

          {/* Logo preview */}
          <div className="mt-5 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-400">Logo preview</p>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white" style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: preset.accent, boxShadow: `0 0 10px ${preset.accent}` }} />
              </span>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                {s.logoText.replace(/Hub$/, "")}<span style={{ color: preset.primary }}>{s.logoText.endsWith("Hub") ? "Hub" : ""}</span>
              </span>
            </div>
          </div>
        </ComponentCard>

        {/* Theme presets */}
        <ComponentCard title="Theme Palette" desc="Default colour preset for new tenant workspaces">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {brandPresets.map((b) => {
              const selected = b.id === s.brandPresetId;
              return (
                <button
                  key={b.id}
                  onClick={() => choosePreset(b.id)}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-left transition-all ${
                    selected ? "border-brand-400 ring-1 ring-brand-300 dark:border-brand-500/40 dark:ring-brand-500/20" : "border-gray-200 hover:border-brand-200 dark:border-gray-800"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{b.name}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[b.primary, b.secondary, b.accent].map((c) => (
                        <span key={c} className="h-5 w-5 rounded-full ring-1 ring-black/5" style={{ background: c }} />
                      ))}
                    </div>
                  </div>
                  {selected && <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"><IconCheck /></span>}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})` }}>
            <p className="text-xs uppercase tracking-wider text-white/70">Preview</p>
            <p className="mt-1 text-lg font-semibold">{s.productName}</p>
            <div className="mt-3 flex gap-2">
              <span className="rounded-lg bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur">Primary</span>
              <span className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-900" style={{ background: preset.accent }}>Accent CTA</span>
            </div>
          </div>
        </ComponentCard>

        {/* Localisation */}
        <ComponentCard title="Localisation Defaults" desc="Currency, timezone and language for new clubs">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Default currency</label>
              <Select options={currencyOptions} value={s.defaultCurrency} onChange={(v) => set("defaultCurrency", v as string)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Default timezone</label>
              <Select options={timezoneOptions} value={s.defaultTimezone} searchable onChange={(v) => set("defaultTimezone", v as string)} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Default language</label>
              <Select options={localeOptions} value={s.defaultLocale} onChange={(v) => set("defaultLocale", v as string)} />
            </div>
            <TextInput label="Default trial length (days)" type="number" value={String(s.defaultTrialDays)} onChange={(v) => set("defaultTrialDays", Number(v) || 0)} />
          </div>
        </ComponentCard>

        {/* Policy */}
        <ComponentCard title="Signup & Security Policy" desc="Platform-wide guardrails">
          <div className="space-y-1">
            <ToggleRow title="Allow self sign-up" desc="Clubs can register without a sales call." checked={s.allowSelfSignup} onChange={(c) => set("allowSelfSignup", c)} />
            <ToggleRow title="Require card on trial" desc="Collect payment method before the trial starts." checked={s.requireCardOnTrial} onChange={(c) => set("requireCardOnTrial", c)} />
            <ToggleRow title="Enforce 2FA for owners" desc="Mandatory two-factor for club owner accounts." checked={s.enforce2fa} onChange={(c) => set("enforce2fa", c)} />
            <ToggleRow title="Maintenance mode" desc="Show a maintenance banner across all tenants." checked={s.maintenanceMode} onChange={(c) => { set("maintenanceMode", c); if (c) toast.warning("Maintenance mode is ON (dummy).", "Heads up"); }} danger />
          </div>
          {s.maintenanceMode && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
              Maintenance mode is active — tenant apps would display a banner.
            </div>
          )}
        </ComponentCard>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <Badge variant="light" color="success" dot>Auto-saved to session</Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">Changes are illustrative (no backend).</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setS(platformDefaults); toast.info("Reverted to defaults.", "Reset"); }}>Revert</Button>
          <Button variant="primary" onClick={() => toast.success("Platform settings saved (dummy).", "Saved")}>Save changes</Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ title, desc, checked, onChange, danger }: { title: string; desc: string; checked: boolean; onChange: (c: boolean) => void; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3.5 last:border-0 dark:border-gray-800/60">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${danger && checked ? "text-amber-600 dark:text-amber-400" : "text-gray-800 dark:text-gray-100"}`}>{title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      <Switch checked={checked} color={danger ? "primary" : "emerald"} onChange={onChange} />
    </div>
  );
}
