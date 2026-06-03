"use client";

import React, { useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import Alert from "@/components/ui/alert/Alert";
import { Modal, ModalDialog } from "@/components/ui/modal";
import Switch from "@/components/ui/switch/Switch";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/table";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import { useModal } from "@/hooks/useModal";
// New foundation components
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import UiSelect from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import Accordion from "@/components/ui/accordion/Accordion";
import Carousel from "@/components/ui/carousel/Carousel";
import Card from "@/components/ui/card/Card";
import ProductCard from "@/components/ui/card/ProductCard";
import BarChart from "@/components/ui/chart/BarChart";
import LineChart from "@/components/ui/chart/LineChart";
import RadarChart from "@/components/ui/chart/RadarChart";
import DonutChart from "@/components/ui/chart/DonutChart";
import Breadcrumb from "@/components/ui/breadcrumb/Breadcrumb";
import NotificationBell, { type NotificationItem } from "@/components/ui/notification/NotificationBell";
import { useToast } from "@/components/ui/toast/ToastContext";
import Sidebar from "@/components/ui/sidebar/Sidebar";
import Tooltip from "@/components/ui/tooltip/Tooltip";
import Pagination from "@/components/ui/pagination/Pagination";
import Avatar, { AvatarGroup } from "@/components/ui/avatar/Avatar";
import Skeleton from "@/components/ui/feedback/Skeleton";
import Spinner from "@/components/ui/feedback/Spinner";
import EmptyState from "@/components/ui/feedback/EmptyState";
import Checkbox from "@/components/ui/input/Checkbox";
import RadioGroup from "@/components/ui/input/RadioGroup";
import Dropzone from "@/components/ui/dropzone/Dropzone";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import Stepper from "@/components/ui/stepper/Stepper";
import Drawer from "@/components/ui/drawer/Drawer";
import { Progress, CircularProgress } from "@/components/ui/progress/Progress";
import Timeline from "@/components/ui/timeline/Timeline";
import Rating from "@/components/ui/rating/Rating";
import Slider from "@/components/ui/slider/Slider";
import countriesData from "@/data/countries.json";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function DemoIcon({ d }: { d: string }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
    </svg>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-12 h-12 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-xs" style={{ backgroundColor: hex }} />
      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{name}</span>
      <span className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">{hex}</span>
    </div>
  );
}

function TokenRow({ label, lightHex, darkHex, desc }: { label: string; lightHex: string; darkHex: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0" style={{ backgroundColor: lightHex }} />
      <div className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-700 shrink-0" style={{ backgroundColor: darkHex }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-gray-700 dark:text-gray-300">{label}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">{desc}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-mono text-gray-500 dark:text-gray-400">{lightHex}</p>
        <p className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{darkHex}</p>
      </div>
    </div>
  );
}

const sections = [
  { id: "design-tokens", label: "Design Tokens" },
  { id: "palette", label: "Color Palette" },
  { id: "status", label: "Status Colors" },
  { id: "typography", label: "Typography" },
  { id: "spacing", label: "Spacing & Radius" },
  { id: "buttons", label: "Buttons" },
  { id: "tabs", label: "Tabs" },
  { id: "badges", label: "Badges" },
  { id: "breadcrumb", label: "Breadcrumb" },
  { id: "alerts", label: "Alerts" },
  { id: "toast", label: "Toast" },
  { id: "notification", label: "Notification" },
  { id: "inputs", label: "Text Inputs" },
  { id: "checkradio", label: "Checkbox & Radio" },
  { id: "phone", label: "Phone Input" },
  { id: "selects", label: "Selects" },
  { id: "datepickers", label: "Date Pickers" },
  { id: "timepicker", label: "Time Picker" },
  { id: "textarea", label: "Textarea" },
  { id: "dropzone", label: "Dropzone" },
  { id: "switches", label: "Switches" },
  { id: "accordion", label: "Accordion" },
  { id: "stepper", label: "Stepper" },
  { id: "tables", label: "Tables" },
  { id: "datatable", label: "Data Table (Sort)" },
  { id: "pagination", label: "Pagination" },
  { id: "modals", label: "Modals" },
  { id: "drawer", label: "Drawer" },
  { id: "cards", label: "Cards" },
  { id: "products", label: "Product Cards" },
  { id: "carousel", label: "Carousel" },
  { id: "avatar", label: "Avatar" },
  { id: "tooltip", label: "Tooltip" },
  { id: "progress", label: "Progress" },
  { id: "slider", label: "Slider" },
  { id: "rating", label: "Rating" },
  { id: "timeline", label: "Timeline" },
  { id: "feedback", label: "Loading & Empty" },
  { id: "sidebar", label: "Sidebar" },
  { id: "charts", label: "Charts" },
];

export default function UIKitPage() {
  const { isOpen, openModal, closeModal } = useModal();
  const scrollModal = useModal();
  const dialogModal = useModal();
  const [activeTab, setActiveTab] = useState("data");
  const [activeTab2, setActiveTab2] = useState("all");
  const [activePill, setActivePill] = useState("bulanan");
  const [singleSelect, setSingleSelect] = useState<string | string[]>("");
  const [multiSelect, setMultiSelect] = useState<string | string[]>([]);
  const [tags, setTags] = useState<string | string[]>([]);
  const [page, setPage] = useState(1);
  const [ratingVal, setRatingVal] = useState(3.5);
  const [sliderVal, setSliderVal] = useState(40);
  const drawerRight = useModal();
  const drawerBottom = useModal();
  const addModal = useModal();
  const toast = useToast();
  const countries = countriesData as Country[];

  const notifications: NotificationItem[] = [
    { id: "1", title: "Booking baru", message: "Andi Wijaya memesan Center Court 19:00", time: "5 menit lalu", type: "success" },
    { id: "2", title: "Membership akan expired", message: "3 member akan expired dalam 7 hari", time: "1 jam lalu", type: "warning" },
    { id: "3", title: "Pembayaran diterima", message: "Invoice INV-001 telah dibayar", time: "2 jam lalu", type: "info", read: true },
  ];

  const sidebarGroups = [
    {
      title: "Menu Utama",
      items: [
        { label: "Dashboard", href: "/ui-kit-demo", icon: <DemoIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
        {
          label: "Member", icon: <DemoIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />, badge: 12,
          children: [
            { label: "Data Member", href: "/ui-kit-demo/members" },
            { label: "Membership", href: "/ui-kit-demo/membership", badge: 3 },
            {
              label: "Laporan", children: [
                { label: "Aktif", href: "/ui-kit-demo/report-active" },
                { label: "Expired", href: "/ui-kit-demo/report-expired" },
              ],
            },
          ],
        },
        {
          label: "Lapangan", icon: <DemoIcon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />,
          children: [
            { label: "Jadwal", href: "/ui-kit-demo/schedule" },
            { label: "Booking", href: "/ui-kit-demo/booking" },
          ],
        },
      ],
    },
    {
      title: "Lainnya",
      items: [
        { label: "Pengaturan", href: "/ui-kit-demo/settings", icon: <DemoIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> },
      ],
    },
  ];

  const selectOptions = [
    { value: "regular", label: "Casual", desc: "Bayar per main" },
    { value: "premium", label: "Pro", desc: "Diskon lapangan + open play" },
    { value: "vip", label: "Elite", desc: "Unlimited + PT" },
    { value: "student", label: "Student", desc: "Khusus pelajar" },
  ];

  return (
    <div className="flex min-h-[calc(100dvh-80px)]">
      <aside className="hidden lg:flex w-48 shrink-0 flex-col gap-0.5 sticky top-20 h-[calc(100dvh-80px)] overflow-y-auto py-4 pr-4 border-r border-gray-200 dark:border-gray-700">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Sections</p>
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 truncate">{s.label}</a>
        ))}
      </aside>

      <div className="flex-1 px-4 md:px-6 py-6 space-y-14 max-w-5xl">
        <PageBreadCrumb pageTitle="UI Kit" />

        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
            <h1 className="text-xl font-bold text-[var(--text-heading)]">PadelHub Design System</h1>
          </div>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--text-caption)]">
            Every component in the PadelHub UI kit, rendered on the Electric Indigo brand palette with
            Padel Lime accents. Dark mode and tokens drive all colors.
          </p>
        </div>

        {/* ═══ DESIGN TOKENS ═══ */}
        <Section id="design-tokens" title="Design Tokens">
          <ComponentCard title="Semantic Colors" desc="Light (kiri) vs Dark (kanan). Panggil via var(--token).">
            <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <span className="w-8 text-center">Light</span>
              <span className="w-8 text-center">Dark</span>
              <span>Token</span>
            </div>
            <TokenRow label="--color-primary" lightHex="#2563eb" darkHex="#3b82f6" desc="Brand utama — CTA, button, link" />
            <TokenRow label="--color-primary-hover" lightHex="#1d4ed8" darkHex="#60a5fa" desc="Hover state" />
            <TokenRow label="--color-primary-light" lightHex="#eff6ff" darkHex="rgba(59,130,246,0.12)" desc="Background ringan" />
            <TokenRow label="--color-secondary" lightHex="#334155" darkHex="#cbd5e1" desc="Body text, elemen pendukung" />
            <TokenRow label="--color-tertiary" lightHex="#64748b" darkHex="#94a3b8" desc="Caption, placeholder" />
            <TokenRow label="--color-accent" lightHex="#06b6d4" darkHex="#22d3ee" desc="Cyan — info, gradient" />
            <TokenRow label="--color-accent-light" lightHex="#ecfeff" darkHex="rgba(6,182,212,0.12)" desc="Background accent" />
            <TokenRow label="--color-disabled" lightHex="#cbd5e1" darkHex="#334155" desc="Disabled border/icon" />
            <TokenRow label="--color-disabled-text" lightHex="#94a3b8" darkHex="#475569" desc="Disabled text" />
            <TokenRow label="--color-emerald" lightHex="#10b981" darkHex="#34d399" desc="Hijau — success, konfirmasi" />
            <TokenRow label="--color-emerald-light" lightHex="#d1fae5" darkHex="rgba(16,185,129,0.12)" desc="Background emerald" />
          </ComponentCard>
          <ComponentCard title="Surface, Text & Border">
            <div className="mb-3 flex items-center gap-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              <span className="w-8 text-center">Light</span>
              <span className="w-8 text-center">Dark</span>
              <span>Token</span>
            </div>
            <TokenRow label="--surface-bg" lightHex="#f8fafc" darkHex="#0b1120" desc="Background halaman" />
            <TokenRow label="--surface-card" lightHex="#ffffff" darkHex="#1e293b" desc="Background card" />
            <TokenRow label="--surface-muted" lightHex="#f1f5f9" darkHex="#0f172a" desc="Background muted" />
            <TokenRow label="--text-heading" lightHex="#0f172a" darkHex="#f1f5f9" desc="Heading" />
            <TokenRow label="--text-body" lightHex="#334155" darkHex="#cbd5e1" desc="Body text" />
            <TokenRow label="--text-caption" lightHex="#64748b" darkHex="#94a3b8" desc="Caption" />
            <TokenRow label="--text-muted" lightHex="#94a3b8" darkHex="#475569" desc="Muted/placeholder" />
            <TokenRow label="--border-default" lightHex="#e2e8f0" darkHex="#1e293b" desc="Border default" />
            <TokenRow label="--border-strong" lightHex="#cbd5e1" darkHex="#334155" desc="Border strong" />
          </ComponentCard>
        </Section>

        {/* ═══ COLOR PALETTE ═══ */}
        <Section id="palette" title="Color Palette">
          <ComponentCard title="Primary — Blue" desc="Warna utama brand. Dipakai untuk CTA, link, active state.">
            <div className="flex flex-wrap gap-3">
              <Swatch name="50" hex="#eff6ff" /><Swatch name="100" hex="#dbeafe" /><Swatch name="200" hex="#bfdbfe" />
              <Swatch name="300" hex="#93c5fd" /><Swatch name="400" hex="#60a5fa" /><Swatch name="500" hex="#3b82f6" />
              <Swatch name="600" hex="#2563eb" /><Swatch name="700" hex="#1d4ed8" /><Swatch name="800" hex="#1e40af" />
              <Swatch name="900" hex="#1e3a8a" />
            </div>
          </ComponentCard>
          <ComponentCard title="Accent — Cyan" desc="Aksen sekunder. Gradient, info highlight, secondary CTA.">
            <div className="flex flex-wrap gap-3">
              <Swatch name="50" hex="#ecfeff" /><Swatch name="100" hex="#cffafe" /><Swatch name="200" hex="#a5f3fc" />
              <Swatch name="300" hex="#67e8f9" /><Swatch name="400" hex="#22d3ee" /><Swatch name="500" hex="#06b6d4" />
              <Swatch name="600" hex="#0891b2" /><Swatch name="700" hex="#0e7490" /><Swatch name="800" hex="#155e75" />
            </div>
          </ComponentCard>
          <ComponentCard title="Emerald — Green" desc="Warna hijau untuk success, konfirmasi booking, check-in.">
            <div className="flex flex-wrap gap-3">
              <Swatch name="50" hex="#ecfdf5" /><Swatch name="100" hex="#d1fae5" /><Swatch name="200" hex="#a7f3d0" />
              <Swatch name="300" hex="#6ee7b7" /><Swatch name="400" hex="#34d399" /><Swatch name="500" hex="#10b981" />
              <Swatch name="600" hex="#059669" /><Swatch name="700" hex="#047857" /><Swatch name="800" hex="#065f46" />
            </div>
          </ComponentCard>
          <ComponentCard title="Slate — Neutral" desc="Text, border, surface, background.">
            <div className="flex flex-wrap gap-3">
              <Swatch name="50" hex="#f8fafc" /><Swatch name="100" hex="#f1f5f9" /><Swatch name="200" hex="#e2e8f0" />
              <Swatch name="300" hex="#cbd5e1" /><Swatch name="400" hex="#94a3b8" /><Swatch name="500" hex="#64748b" />
              <Swatch name="600" hex="#475569" /><Swatch name="700" hex="#334155" /><Swatch name="800" hex="#1e293b" />
              <Swatch name="900" hex="#0f172a" /><Swatch name="950" hex="#020617" />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ STATUS ═══ */}
        <Section id="status" title="Status Colors">
          <ComponentCard title="Success / Error / Warning / Info">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-semibold text-emerald-600 mb-2">Success</p>
                <div className="flex gap-2">
                  <Swatch name="50" hex="#ecfdf5" /><Swatch name="500" hex="#10b981" /><Swatch name="700" hex="#047857" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-600 mb-2">Error</p>
                <div className="flex gap-2">
                  <Swatch name="50" hex="#fef2f2" /><Swatch name="500" hex="#ef4444" /><Swatch name="700" hex="#b91c1c" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-600 mb-2">Warning</p>
                <div className="flex gap-2">
                  <Swatch name="50" hex="#fffbeb" /><Swatch name="500" hex="#f59e0b" /><Swatch name="700" hex="#b45309" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-cyan-600 mb-2">Info</p>
                <div className="flex gap-2">
                  <Swatch name="50" hex="#ecfeff" /><Swatch name="500" hex="#06b6d4" /><Swatch name="700" hex="#0e7490" />
                </div>
              </div>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ TYPOGRAPHY ═══ */}
        <Section id="typography" title="Typography">
          <ComponentCard title="Font Scale (Outfit)">
            <div className="space-y-3">
              <p className="text-title-md font-bold text-gray-800 dark:text-white">Title MD — 36px</p>
              <p className="text-title-sm font-semibold text-gray-800 dark:text-white">Title SM — 30px</p>
              <p className="text-theme-xl font-medium text-gray-800 dark:text-white">Theme XL — 20px</p>
              <p className="text-base font-medium text-gray-700 dark:text-gray-300">Base — 16px</p>
              <p className="text-theme-sm text-gray-700 dark:text-gray-300">Theme SM — 14px (body)</p>
              <p className="text-theme-xs text-gray-500 dark:text-gray-400">Theme XS — 12px (caption)</p>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ SPACING ═══ */}
        <Section id="spacing" title="Spacing & Radius">
          <ComponentCard title="Border Radius">
            <div className="flex flex-wrap items-center gap-6">
              {[{ l: "lg", c: "rounded-lg" }, { l: "xl", c: "rounded-xl" }, { l: "2xl", c: "rounded-2xl" }, { l: "3xl", c: "rounded-3xl" }, { l: "full", c: "rounded-full" }].map((r) => (
                <div key={r.l} className="flex flex-col items-center gap-2">
                  <div className={`w-14 h-14 bg-blue-100 border-2 border-blue-300 dark:bg-blue-500/20 dark:border-blue-500/40 ${r.c}`} />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{r.l}</span>
                </div>
              ))}
            </div>
          </ComponentCard>
          <ComponentCard title="Shadows">
            <div className="flex flex-wrap gap-6">
              {["theme-xs", "theme-sm", "theme-md", "theme-lg", "theme-xl"].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <div className={`w-16 h-16 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-${s}`} />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">{s}</span>
                </div>
              ))}
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ BUTTONS ═══ */}
        <Section id="buttons" title="Buttons">
          <ComponentCard title="Variants" desc="4 variant: primary, outline, dashed, chip">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Semua button otomatis pakai warna dari design tokens (--color-primary, dll).</p>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="soft">Soft</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="dashed">Dashed</Button>
              <Button variant="chip">Chip</Button>
              <Button variant="chip" active>Chip Active</Button>
            </div>
          </ComponentCard>
          <ComponentCard title="Efek Spesial" desc="sheen (kilau diagonal saat hover) & glow (neon)">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" sheen>Sheen Effect</Button>
              <Button variant="primary" glow>Glow Effect</Button>
              <Button variant="primary" sheen glow size="lg">Sheen + Glow</Button>
              <Button variant="soft" sheen>Soft Sheen</Button>
            </div>
          </ComponentCard>
          <ComponentCard title="Sizes" desc="sm, md, lg">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
          </ComponentCard>
          <ComponentCard title="Border Radius (round)" desc="none, sm, md, lg, full">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" round="none">none</Button>
              <Button variant="primary" round="sm">sm</Button>
              <Button variant="primary" round="md">md</Button>
              <Button variant="primary" round="lg">lg</Button>
              <Button variant="primary" round="full">full</Button>
            </div>
          </ComponentCard>
          <ComponentCard title="States" desc="enabled vs disabled">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Enabled</Button>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="outline">Enabled</Button>
              <Button variant="outline" disabled>Disabled</Button>
              <Button variant="dashed">Enabled</Button>
              <Button variant="dashed" disabled>Disabled</Button>
            </div>
          </ComponentCard>
          <ComponentCard title="With Icon">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" startIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>Tambah</Button>
              <Button variant="outline" endIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}>Export</Button>
              <Button variant="dashed" startIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>Add Item</Button>
            </div>
          </ComponentCard>
          <ComponentCard title="Chips (Filter / Tags)" desc="variant=chip, round otomatis full">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="chip" size="sm" active>Semua</Button>
              <Button variant="chip" size="sm">Aktif</Button>
              <Button variant="chip" size="sm">Expired</Button>
              <Button variant="chip" size="sm">Frozen</Button>
              <Button variant="chip" size="sm" disabled>Disabled</Button>
            </div>
          </ComponentCard>
          <ComponentCard title="Cara Pakai" desc="Contoh pemanggilan di komponen lain">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 font-mono text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <p>{`<Button variant="primary" size="md" round="md">Simpan</Button>`}</p>
              <p>{`<Button variant="outline" size="sm">Batal</Button>`}</p>
              <p>{`<Button variant="dashed" startIcon={<PlusIcon />}>Tambah</Button>`}</p>
              <p>{`<Button variant="chip" size="sm" active>Filter</Button>`}</p>
              <p>{`<Button variant="primary" disabled>Loading...</Button>`}</p>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ TABS ═══ */}
        <Section id="tabs" title="Tabs">
          <ComponentCard title="Underline (default)" desc="Active state ditandai garis bawah biru + text primary">
            <Tabs
              items={[
                { value: "data", label: "Data Member" },
                { value: "membership", label: "Membership" },
                { value: "visits", label: "Histori Kunjungan" },
                { value: "progress", label: "Progress" },
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />
            <div className="mt-4 text-sm text-[var(--color-secondary)]">
              Tab aktif: <span className="font-semibold text-[var(--color-primary)]">{activeTab}</span>
            </div>
          </ComponentCard>

          <ComponentCard title="Underline + Badge" desc="Bisa pakai badge counter, dan support disabled tab">
            <Tabs
              items={[
                { value: "all", label: "Semua", badge: 124 },
                { value: "active", label: "Aktif", badge: 98 },
                { value: "expired", label: "Expired", badge: 21 },
                { value: "frozen", label: "Frozen", badge: 5, disabled: true },
              ]}
              value={activeTab2}
              onChange={setActiveTab2}
            />
            <div className="mt-4 text-sm text-[var(--color-secondary)]">
              Filter aktif: <span className="font-semibold text-[var(--color-primary)]">{activeTab2}</span>
            </div>
          </ComponentCard>

          <ComponentCard title="Pill Variant" desc="Alternatif: tab bentuk pill, background card saat active">
            <Tabs
              variant="pill"
              items={[
                { value: "harian", label: "Harian" },
                { value: "mingguan", label: "Mingguan" },
                { value: "bulanan", label: "Bulanan" },
                { value: "tahunan", label: "Tahunan" },
              ]}
              value={activePill}
              onChange={setActivePill}
            />
          </ComponentCard>

          <ComponentCard title="Segment Variant" desc="Indikator meluncur (sliding) dengan background primary">
            <Tabs
              variant="segment"
              items={[
                { value: "harian", label: "Harian" },
                { value: "mingguan", label: "Mingguan" },
                { value: "bulanan", label: "Bulanan" },
              ]}
              value={activePill}
              onChange={setActivePill}
            />
          </ComponentCard>

          <ComponentCard title="Dengan Icon + Badge" desc="Tab bisa pakai icon dan badge count">
            <Tabs
              value={activeTab}
              onChange={setActiveTab}
              items={[
                { value: "data", label: "Member", icon: <DemoIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />, badge: 124 },
                { value: "membership", label: "Kelas", icon: <DemoIcon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> },
                { value: "visits", label: "Pembayaran", icon: <DemoIcon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />, badge: 3 },
              ]}
            />
          </ComponentCard>

          <ComponentCard title="Sizes & Full Width">
            <div className="space-y-4">
              <Tabs
                size="sm"
                items={[
                  { value: "data", label: "Small Tab 1" },
                  { value: "membership", label: "Small Tab 2" },
                  { value: "visits", label: "Small Tab 3" },
                ]}
                value={activeTab}
                onChange={setActiveTab}
              />
              <Tabs
                fullWidth
                items={[
                  { value: "data", label: "Full" },
                  { value: "membership", label: "Width" },
                  { value: "visits", label: "Tabs" },
                ]}
                value={activeTab}
                onChange={setActiveTab}
              />
            </div>
          </ComponentCard>

          <ComponentCard title="Cara Pakai" desc="Contoh pemanggilan di komponen lain">
            <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 font-mono text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <p>{`const [tab, setTab] = useState("data");`}</p>
              <p>{`<Tabs`}</p>
              <p>{`  variant="underline"   // underline | pill`}</p>
              <p>{`  size="md"             // sm | md`}</p>
              <p>{`  items={[{ value: "data", label: "Data", badge: 12 }]}`}</p>
              <p>{`  value={tab}`}</p>
              <p>{`  onChange={setTab}`}</p>
              <p>{`/>`}</p>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ BADGES ═══ */}
        <Section id="badges" title="Badges">
          <ComponentCard title="Light Variant">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="light" color="primary">Primary</Badge>
              <Badge variant="light" color="secondary">Secondary</Badge>
              <Badge variant="light" color="success">Success</Badge>
              <Badge variant="light" color="error">Error</Badge>
              <Badge variant="light" color="warning">Warning</Badge>
              <Badge variant="light" color="info">Info</Badge>
              <Badge variant="light" color="emerald">Emerald</Badge>
              <Badge variant="light" color="neutral">Neutral</Badge>
            </div>
          </ComponentCard>
          <ComponentCard title="Solid & Outline">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <Badge variant="solid" color="primary">Primary</Badge>
              <Badge variant="solid" color="success">Success</Badge>
              <Badge variant="solid" color="error">Error</Badge>
              <Badge variant="solid" color="warning">Warning</Badge>
              <Badge variant="solid" color="info">Info</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" color="primary">Primary</Badge>
              <Badge variant="outline" color="success">Success</Badge>
              <Badge variant="outline" color="error">Error</Badge>
              <Badge variant="outline" color="neutral">Neutral</Badge>
            </div>
          </ComponentCard>
          <ComponentCard title="Dengan Dot Indicator & Size">
            <div className="flex flex-wrap items-center gap-3">
              <Badge dot color="success">Active</Badge>
              <Badge dot color="warning">Pending</Badge>
              <Badge dot color="error">Offline</Badge>
              <Badge size="sm" color="primary">Small</Badge>
              <Badge size="md" color="primary">Medium</Badge>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ BREADCRUMB ═══ */}
        <Section id="breadcrumb" title="Breadcrumb">
          <ComponentCard title="Separator Variants">
            <div className="space-y-4">
              <Breadcrumb items={[{ label: "Member", href: "/members" }, { label: "Data Member", href: "/members/data" }, { label: "Andi Wijaya" }]} />
              <Breadcrumb separator="slash" items={[{ label: "Kelas", href: "/classes" }, { label: "Yoga Pagi" }]} />
              <Breadcrumb separator="dot" showHome={false} items={[{ label: "Dashboard", href: "/" }, { label: "Laporan", href: "/reports" }, { label: "Pendapatan" }]} />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ ALERTS ═══ */}
        <Section id="alerts" title="Alerts">
          <ComponentCard title="Variants">
            <div className="space-y-3">
              <Alert variant="success" title="Berhasil!" message="Data tersimpan." />
              <Alert variant="error" title="Gagal!" message="Terjadi kesalahan." />
              <Alert variant="warning" title="Perhatian" message="Membership hampir habis." />
              <Alert variant="info" title="Info" message="Fitur baru tersedia." />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ TOAST ═══ */}
        <Section id="toast" title="Toast">
          <ComponentCard title="Trigger Toast" desc="Notifikasi sementara, muncul dari kanan atas, auto-dismiss">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm" onClick={() => toast.success("Member berhasil ditambahkan!", "Berhasil")}>Success</Button>
              <Button variant="outline" size="sm" onClick={() => toast.error("Gagal menyimpan data.", "Error")}>Error</Button>
              <Button variant="outline" size="sm" onClick={() => toast.warning("Membership hampir habis.", "Perhatian")}>Warning</Button>
              <Button variant="outline" size="sm" onClick={() => toast.info("Ada update sistem baru.")}>Info</Button>
            </div>
            <div className="mt-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 font-mono text-xs text-gray-700 dark:text-gray-300 space-y-1">
              <p>{`const toast = useToast();`}</p>
              <p>{`toast.success("Pesan", "Judul opsional");`}</p>
              <p>{`toast.error(...) / toast.warning(...) / toast.info(...)`}</p>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ NOTIFICATION ═══ */}
        <Section id="notification" title="Notification">
          <ComponentCard title="Notification Bell" desc="Icon dengan count unread + dropdown list">
            <div className="flex items-center gap-6">
              <NotificationBell
                items={notifications}
                onMarkAllRead={() => toast.success("Semua ditandai dibaca")}
                onViewAll={() => toast.info("Buka halaman notifikasi")}
                onItemClick={(n) => toast.info(n.title)}
              />
              <span className="text-sm text-[var(--text-caption)]">← Klik bel (ada {notifications.filter(n => !n.read).length} unread)</span>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ TEXT INPUTS ═══ */}
        <Section id="inputs" title="Text Inputs">
          <ComponentCard title="Tipe Input" desc="Text, email (validasi), password (toggle), number, search">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Text" placeholder="Nama member..." />
              <TextInput label="Email (validasi otomatis)" type="email" placeholder="email@padelhub.io" validate required errorText="Format email tidak valid" successText="Email valid" />
              <TextInput label="Password" type="password" placeholder="••••••••" />
              <TextInput label="Number" type="number" placeholder="0" />
              <TextInput label="Search" type="search" placeholder="Cari..." startIcon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>} />
              <TextInput label="Dengan hint" placeholder="Username" hint="Minimal 4 karakter" />
            </div>
          </ComponentCard>
          <ComponentCard title="States">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TextInput label="Success" defaultValue="Andi Wijaya" success successText="Data valid" />
              <TextInput label="Error" defaultValue="xx" error errorText="Tidak valid" />
              <TextInput label="Disabled" defaultValue="Tidak bisa diedit" disabled />
            </div>
          </ComponentCard>
        </Section>

        {/* CHECKBOX & RADIO */}
        <Section id="checkradio" title="Checkbox & Radio">
          <ComponentCard title="Checkbox">
            <div className="space-y-3">
              <Checkbox label="Aktifkan notifikasi email" defaultChecked />
              <Checkbox label="Kirim reminder WhatsApp" description="Member akan menerima pesan otomatis" />
              <Checkbox label="Disabled" disabled />
            </div>
          </ComponentCard>
          <ComponentCard title="Radio Group">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--text-body)]">Vertical</p>
                <RadioGroup
                  defaultValue="premium"
                  options={[
                    { value: "regular", label: "Casual", description: "Bayar per main" },
                    { value: "premium", label: "Pro", description: "Diskon + open play" },
                    { value: "vip", label: "Elite", description: "Unlimited + PT" },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--text-body)]">Horizontal</p>
                <RadioGroup
                  direction="horizontal"
                  defaultValue="m"
                  options={[
                    { value: "m", label: "Pria" },
                    { value: "f", label: "Wanita" },
                  ]}
                />
              </div>
            </div>
          </ComponentCard>
        </Section>

        {/* PHONE INPUT */}
        <Section id="phone" title="Phone Input">
          <ComponentCard title="No. Telepon + Kode Negara" desc="Select negara searchable + bendera. Leading 0 otomatis hilang, hanya digit.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PhoneInput label="Nomor HP" countries={countries} defaultCountry="id" />
              <PhoneInput label="Default Malaysia" countries={countries} defaultCountry="my" hint="Coba ketik '0812' — nol di depan otomatis hilang" />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ SELECTS ═══ */}
        <Section id="selects" title="Selects">
          <ComponentCard title="Single Select (searchable)" desc="searchable + clearable">
            <UiSelect label="Tipe Membership" options={selectOptions} value={singleSelect} onChange={setSingleSelect} searchable placeholder="Pilih membership..." />
            <p className="mt-2 text-xs text-[var(--text-caption)]">Value: {JSON.stringify(singleSelect)}</p>
          </ComponentCard>
          <ComponentCard title="Multi Select" desc="multiple + searchable, hasil berupa array (chips)">
            <UiSelect label="Akses Lapangan" options={[{ value: "center", label: "Center Court" }, { value: "rally", label: "Court 2 — Rally" }, { value: "sky", label: "Sky Court" }, { value: "smash", label: "Court 6 — Smash" }]} value={multiSelect} onChange={setMultiSelect} multiple searchable placeholder="Pilih lapangan..." />
            <p className="mt-2 text-xs text-[var(--text-caption)]">Value: {JSON.stringify(multiSelect)}</p>
          </ComponentCard>
          <ComponentCard title="Addable Select" desc="addable — bisa tambah opsi baru yang belum ada (mis. tag)">
            <UiSelect label="Tag Member" options={[{ value: "vip", label: "VIP" }, { value: "loyal", label: "Loyal" }, { value: "new", label: "New" }]} value={tags} onChange={setTags} multiple searchable addable placeholder="Pilih atau ketik tag baru..." />
            <p className="mt-2 text-xs text-[var(--text-caption)]">Value: {JSON.stringify(tags)}</p>
          </ComponentCard>
          <ComponentCard title="Addable + Modal" desc="onAddClick: klik 'Tambah' membuka modal (untuk form detail opsi baru)">
            <UiSelect
              label="Kategori Produk"
              options={[{ value: "supplement", label: "Suplemen" }, { value: "apparel", label: "Apparel" }]}
              searchable
              addable
              placeholder="Pilih atau ketik kategori baru..."
              onAddClick={(label) => { addModal.openModal(); toast.info(`Buka modal untuk tambah: "${label}"`); }}
            />
          </ComponentCard>
        </Section>

        {/* ═══ DATE PICKERS ═══ */}
        <Section id="datepickers" title="Date Pickers">
          <ComponentCard title="Single & Range" desc="Range: satu input, klik bisa maju/mundur, output otomatis urut start→end">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker mode="single" label="Tanggal" placeholder="Pilih tanggal" />
              <DatePicker mode="range" label="Rentang Tanggal" placeholder="Pilih rentang" />
            </div>
          </ComponentCard>
          <ComponentCard title="Month & Time">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker mode="month" label="Bulan" placeholder="Pilih bulan" />
              <DatePicker mode="time" label="Waktu (native)" placeholder="Pilih waktu" />
            </div>
          </ComponentCard>
        </Section>

        {/* TIME PICKER */}
        <Section id="timepicker" title="Time Picker">
          <ComponentCard title="Time Picker (custom UI)" desc="Kolom jam/menit scrollable, tombol 'Sekarang'">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TimePicker label="Jam Buka (24 jam)" placeholder="Pilih waktu" />
              <TimePicker label="Jadwal Kelas (12 jam AM/PM)" use12Hours minuteStep={5} placeholder="Pilih waktu" />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ TEXTAREA ═══ */}
        <Section id="textarea" title="Textarea">
          <ComponentCard title="Textarea" desc="Resizable, optional character counter">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Textarea label="Catatan" placeholder="Tulis catatan..." rows={4} />
              <Textarea label="Dengan counter" placeholder="Max 200 karakter..." rows={4} maxLength={200} showCount />
            </div>
          </ComponentCard>
        </Section>

        {/* DROPZONE */}
        <Section id="dropzone" title="Dropzone">
          <ComponentCard title="Upload File" desc="Icon di tengah bisa dikustomisasi + validasi file (tipe, ukuran, jumlah)">
            <Dropzone
              title="Tarik foto member ke sini"
              description="atau klik untuk pilih (PNG/JPG, maks 2MB)"
              validation={{ accept: ["image/png", "image/jpeg"], maxSizeMB: 2, maxFiles: 4 }}
              onReject={(file, reason) => toast.error(`${file.name}: ${reason}`)}
              onFilesChange={(files) => { if (files.length) toast.success(`${files.length} file dipilih`); }}
            />
          </ComponentCard>
          <ComponentCard title="Custom Icon & Single File">
            <Dropzone
              multiple={false}
              icon={<svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>}
              title="Upload dokumen"
              description="PDF / DOCX, maks 5MB"
              validation={{ accept: [".pdf", ".docx"], maxSizeMB: 5 }}
              showPreview
            />
          </ComponentCard>
        </Section>

        {/* ═══ SWITCHES ═══ */}
        <Section id="switches" title="Switches">
          <ComponentCard title="Variants" desc="default, icon, theme (sun/moon), labeled">
            <div className="flex flex-wrap items-center gap-6">
              <Switch variant="default" label="Default" defaultChecked />
              <Switch variant="icon" label="Icon (check/x)" defaultChecked />
              <Switch variant="theme" label="Theme (matahari/bulan)" defaultChecked />
              <Switch variant="labeled" label="Labeled" defaultChecked />
            </div>
          </ComponentCard>
          <ComponentCard title="Colors & Sizes">
            <div className="flex flex-wrap items-center gap-6">
              <Switch color="primary" label="Primary" defaultChecked />
              <Switch color="emerald" label="Emerald" defaultChecked />
              <Switch color="accent" label="Accent" defaultChecked />
              <Switch size="sm" label="Small" defaultChecked />
              <Switch size="lg" label="Large" defaultChecked />
              <Switch label="Disabled" disabled />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ ACCORDION ═══ */}
        <Section id="accordion" title="Accordion">
          <ComponentCard title="Single (default)" desc="Hanya satu terbuka dalam satu waktu">
            <Accordion
              items={[
                { value: "1", title: "Apa itu membership Pro?", content: "Membership Pro memberikan diskon 15% semua booking lapangan plus 2 sesi open play gratis tiap bulan." },
                { value: "2", title: "Bagaimana cara booking coaching?", content: "Buka menu Coaching, pilih coach, lalu tentukan jadwal yang tersedia." },
                { value: "3", title: "Apakah bisa membatalkan booking?", content: "Ya, pembatalan gratis hingga 6 jam sebelum jadwal dan dana kembali ke wallet." },
              ]}
            />
          </ComponentCard>
          <ComponentCard title="Multiple" desc="Beberapa bisa terbuka bersamaan">
            <Accordion
              type="multiple"
              defaultOpen={["a"]}
              items={[
                { value: "a", title: "Fasilitas Klub", content: "Lapangan panoramic, pro-shop, locker, shower, kafe." },
                { value: "b", title: "Jam Operasional", content: "Setiap hari 07.00–23.00." },
                { value: "c", title: "Disabled item", content: "Konten ini.", disabled: true },
              ]}
            />
          </ComponentCard>
        </Section>

        {/* STEPPER */}
        <Section id="stepper" title="Stepper">
          <ComponentCard title="Horizontal" desc="Untuk form multi-step / wizard registrasi member">
            <Stepper
              currentStep={2}
              steps={[
                { label: "Data Diri", description: "Info dasar" },
                { label: "Membership", description: "Pilih paket" },
                { label: "Pembayaran", description: "Metode bayar" },
                { label: "Selesai", description: "Konfirmasi" },
              ]}
            />
          </ComponentCard>
          <ComponentCard title="Vertical">
            <Stepper
              orientation="vertical"
              currentStep={1}
              steps={[
                { label: "Check-in", description: "Scan QR di pintu masuk" },
                { label: "Pilih Kelas", description: "Booking kelas hari ini" },
                { label: "Latihan", description: "Mulai sesi latihan" },
              ]}
            />
          </ComponentCard>
        </Section>

        {/* ═══ TABLES ═══ */}
        <Section id="tables" title="Tables">
          <ComponentCard title="Basic Table">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-gray-100 dark:border-gray-800">
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Nama</TableCell>
                  <TableCell isHeader className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[{ n: "Andi", s: "active" }, { n: "Budi", s: "frozen" }, { n: "Citra", s: "expired" }].map((r, i) => (
                  <TableRow key={i} className="border-b border-gray-50 dark:border-gray-800">
                    <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">{r.n}</TableCell>
                    <TableCell className="px-4 py-3"><Badge variant="light" size="sm" color={r.s === "active" ? "success" : r.s === "frozen" ? "warning" : "error"}>{r.s}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ComponentCard>
        </Section>

        {/* DATA TABLE */}
        <Section id="datatable" title="Data Table (Sortable)">
          <ComponentCard title="Custom Sort By Column" desc="Klik header untuk sort (asc → desc → off)">
            <DataTable
              rowKey={(r) => r.id}
              defaultSort={{ key: "name", direction: "asc" }}
              data={[
                { id: 1, name: "Andi Wijaya", type: "Premium", visits: 42, joined: "2024-01-15" },
                { id: 2, name: "Budi Santoso", type: "Regular", visits: 18, joined: "2024-03-20" },
                { id: 3, name: "Citra Dewi", type: "VIP", visits: 67, joined: "2023-11-05" },
                { id: 4, name: "Dimas Pratama", type: "Premium", visits: 31, joined: "2024-02-10" },
              ]}
              columns={[
                { key: "name", header: "Nama", sortable: true, accessor: (r) => <span className="font-medium text-[var(--text-heading)]">{r.name}</span>, sortValue: (r) => r.name } as Column<{ id: number; name: string; type: string; visits: number; joined: string }>,
                { key: "type", header: "Tipe", sortable: true, accessor: (r) => r.type, sortValue: (r) => r.type },
                { key: "visits", header: "Kunjungan", sortable: true, align: "right", accessor: (r) => <span className="tabular-nums">{r.visits}</span>, sortValue: (r) => r.visits },
                { key: "joined", header: "Bergabung", sortable: true, accessor: (r) => r.joined, sortValue: (r) => r.joined },
              ]}
            />
          </ComponentCard>
        </Section>

        {/* PAGINATION */}
        <Section id="pagination" title="Pagination">
          <ComponentCard title="Pagination" desc="Dengan ellipsis otomatis">
            <Pagination currentPage={page} totalPages={12} onPageChange={setPage} />
            <p className="mt-3 text-xs text-[var(--text-caption)]">Halaman aktif: {page}</p>
          </ComponentCard>
        </Section>

        {/* ═══ MODALS ═══ */}
        <Section id="modals" title="Modals">
          <ComponentCard title="Modal Variants" desc="Modal bisa scroll vertikal & horizontal saat konten besar">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm" onClick={openModal}>Modal Sederhana</Button>
              <Button variant="outline" size="sm" onClick={dialogModal.openModal}>ModalDialog (header/footer)</Button>
              <Button variant="outline" size="sm" onClick={scrollModal.openModal}>Modal Konten Besar (Scroll)</Button>
            </div>
          </ComponentCard>

          {/* Simple modal */}
          <Modal isOpen={isOpen} onClose={closeModal} className="max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-[var(--text-heading)] mb-2">Konfirmasi</h3>
              <p className="text-sm text-[var(--text-caption)] mb-5">Yakin hapus data ini?</p>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" size="sm" onClick={closeModal}>Batal</Button>
                <Button variant="primary" size="sm" onClick={closeModal}>Hapus</Button>
              </div>
            </div>
          </Modal>

          {/* ModalDialog with header/footer */}
          <ModalDialog
            isOpen={dialogModal.isOpen}
            onClose={dialogModal.closeModal}
            title="Tambah Member Baru"
            description="Isi data member untuk mendaftarkan ke sistem"
            size="lg"
            footer={
              <div className="flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={dialogModal.closeModal}>Batal</Button>
                <Button variant="primary" size="sm" onClick={dialogModal.closeModal}>Simpan</Button>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput label="Nama" placeholder="Nama lengkap" />
              <TextInput label="Email" type="email" validate placeholder="email@..." />
              <PhoneInput label="No. HP" countries={countries} />
              <UiSelect label="Membership" options={selectOptions} searchable placeholder="Pilih..." />
            </div>
          </ModalDialog>

          {/* Scroll modal — vertikal + horizontal */}
          <ModalDialog
            isOpen={scrollModal.isOpen}
            onClose={scrollModal.closeModal}
            title="Konten Besar — Scroll Demo"
            description="Konten ini melebihi tinggi & lebar modal, jadi bisa di-scroll"
            size="md"
          >
            <div style={{ width: "900px" }}>
              {Array.from({ length: 20 }).map((_, i) => (
                <p key={i} className="border-b border-[var(--border-light)] py-3 text-sm text-[var(--text-body)] whitespace-nowrap">
                  Baris {i + 1} — konten panjang yang memaksa scroll horizontal pada modal ini agar terlihat berfungsi dengan baik.
                </p>
              ))}
            </div>
          </ModalDialog>
        </Section>

        {/* DRAWER */}
        <Section id="drawer" title="Drawer">
          <ComponentCard title="Panel Geser" desc="Dari kanan / bawah, dengan overlay & body scrollable">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm" onClick={drawerRight.openModal}>Drawer Kanan</Button>
              <Button variant="outline" size="sm" onClick={drawerBottom.openModal}>Drawer Bawah</Button>
            </div>
          </ComponentCard>
          <Drawer
            isOpen={drawerRight.isOpen}
            onClose={drawerRight.closeModal}
            side="right"
            title="Filter Member"
            footer={<div className="flex justify-end gap-3"><Button variant="outline" size="sm" onClick={drawerRight.closeModal}>Reset</Button><Button variant="primary" size="sm" onClick={drawerRight.closeModal}>Terapkan</Button></div>}
          >
            <div className="space-y-4">
              <UiSelect label="Tipe Membership" options={selectOptions} searchable placeholder="Semua tipe" />
              <RadioGroup defaultValue="all" options={[{ value: "all", label: "Semua status" }, { value: "active", label: "Aktif" }, { value: "expired", label: "Expired" }]} />
              <Checkbox label="Hanya yang punya PT" />
            </div>
          </Drawer>
          <Drawer isOpen={drawerBottom.isOpen} onClose={drawerBottom.closeModal} side="bottom" title="Aksi Cepat">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {["Tambah Member", "Check-In", "Buat Invoice", "Booking Kelas"].map((a) => (
                <button key={a} onClick={drawerBottom.closeModal} className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 text-sm font-medium text-[var(--text-body)] hover:bg-[var(--color-primary-light)] hover:text-[var(--color-primary)]">{a}</button>
              ))}
            </div>
          </Drawer>
        </Section>

        {/* ═══ CARDS ═══ */}
        <Section id="cards" title="Cards">
          <ComponentCard title="Stat Cards">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <p className="text-xs font-semibold text-[var(--text-caption)] uppercase mb-2">Members</p>
                <p className="text-2xl font-bold text-[var(--text-heading)]">1,247</p>
                <p className="text-xs text-[var(--color-emerald)] mt-1">+12%</p>
              </Card>
              <Card>
                <p className="text-xs font-semibold text-[var(--text-caption)] uppercase mb-2">Revenue</p>
                <p className="text-2xl font-bold text-[var(--text-heading)]">Rp 45.2M</p>
                <p className="text-xs text-[var(--color-emerald)] mt-1">+8%</p>
              </Card>
              <Card>
                <p className="text-xs font-semibold text-[var(--text-caption)] uppercase mb-2">Check-In</p>
                <p className="text-2xl font-bold text-[var(--text-heading)]">47</p>
                <p className="text-xs text-[var(--color-primary)] mt-1">hari ini</p>
              </Card>
            </div>
          </ComponentCard>
          <ComponentCard title="Card dengan Header & Footer">
            <Card
              title="Jadwal Kelas Hari Ini"
              desc="3 kelas aktif"
              action={<Button variant="chip" size="sm">Lihat Semua</Button>}
              footer={<p className="text-xs text-[var(--text-caption)]">Diperbarui 5 menit lalu</p>}
            >
              <div className="space-y-2 text-sm text-[var(--text-body)]">
                <p>• Yoga — 08:00 (12/15)</p>
                <p>• HIIT — 10:00 (20/20)</p>
                <p>• Spinning — 17:00 (8/15)</p>
              </div>
            </Card>
          </ComponentCard>
          <ComponentCard title="Card Variants" desc="premium, gradient-border, accent-top, glass, hover">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="premium" hover>
                <p className="text-sm font-semibold text-[var(--text-heading)]">Premium</p>
                <p className="mt-1 text-xs text-[var(--text-caption)]">Surface gradient halus + hover lift.</p>
              </Card>
              <Card variant="gradient-border" hover>
                <p className="text-sm font-semibold text-[var(--text-heading)]">Gradient Border</p>
                <p className="mt-1 text-xs text-[var(--text-caption)]">Border gradient primary→accent.</p>
              </Card>
              <Card variant="accent-top" hover>
                <p className="text-sm font-semibold text-[var(--text-heading)]">Accent Top</p>
                <p className="mt-1 text-xs text-[var(--text-caption)]">Bar aksen gradient di atas.</p>
              </Card>
              <Card variant="glass" hover>
                <p className="text-sm font-semibold text-[var(--text-heading)]">Glass</p>
                <p className="mt-1 text-xs text-[var(--text-caption)]">Efek kaca blur transparan.</p>
              </Card>
            </div>
          </ComponentCard>
          <ComponentCard title="KPI dengan Gradient Text">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card variant="premium">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Member Aktif</p>
                <p className="mt-1 text-3xl font-bold text-gradient-primary">1,247</p>
              </Card>
              <Card variant="premium">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Revenue</p>
                <p className="mt-1 text-3xl font-bold text-gradient-emerald">Rp45M</p>
              </Card>
              <Card variant="premium">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Sedang bermain</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="pulse-live h-2.5 w-2.5 rounded-full bg-emerald-500" style={{ ["--pulse-color" as string]: "rgba(16,185,129,0.5)" }} />
                  <p className="text-3xl font-bold text-[var(--text-heading)]">23</p>
                </div>
              </Card>
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ PRODUCT CARDS ═══ */}
        <Section id="products" title="Product Cards">
          <ComponentCard title="Produk / Merchandise">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ProductCard title="Bullpadel Vertex 04" category="Raket" price="Rp 3.450.000" oldPrice="Rp 3.900.000" badge={{ label: "Promo", color: "error" }} rating={4.5} stock={8} action={<Button variant="primary" size="sm" round="lg" className="w-full">+ Keranjang</Button>} />
              <ProductCard title="PadelHub Tee" category="Apparel" price="Rp 220.000" badge={{ label: "Baru", color: "emerald" }} rating={5} stock={50} action={<Button variant="outline" size="sm" round="lg" className="w-full">Detail</Button>} />
              <ProductCard title="Head Padel Balls (x3)" category="Bola" price="Rp 95.000" rating={4} stock={0} />
              <ProductCard title="Tourna Overgrip (x3)" category="Aksesoris" price="Rp 75.000" rating={4.2} stock={120} action={<Button variant="primary" size="sm" round="lg" className="w-full">+ Keranjang</Button>} />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ CAROUSEL ═══ */}
        <Section id="carousel" title="Carousel">
          <ComponentCard title="Single Slide (autoplay)">
            <Carousel autoPlay slidesToShow={1}>
              {[
                { t: "Promo Member Baru", c: "Diskon 30% untuk pendaftaran bulan ini", bg: "from-violet-500 to-indigo-500" },
                { t: "Friday Night Americano", c: "Open play setiap Jumat malam, daftar sekarang", bg: "from-emerald-500 to-teal-500" },
                { t: "Private Coaching", c: "Sesi perdana gratis dengan coach bersertifikat", bg: "from-indigo-500 to-violet-500" },
              ].map((s, i) => (
                <div key={i} className={`flex h-44 flex-col items-center justify-center rounded-2xl bg-gradient-to-r ${s.bg} text-center text-white`}>
                  <h3 className="text-xl font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm opacity-90">{s.c}</p>
                </div>
              ))}
            </Carousel>
          </ComponentCard>
          <ComponentCard title="Multi Slide (responsive)">
            <Carousel slidesToShow={3} gap={16}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex h-32 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] text-[var(--text-body)] font-semibold">
                  Slide {i + 1}
                </div>
              ))}
            </Carousel>
          </ComponentCard>
          <p className="text-xs text-[var(--text-caption)]">💡 Coba grab & drag carousel ke samping (terutama di mobile). Autoplay pause saat hover.</p>
        </Section>

        {/* AVATAR */}
        <Section id="avatar" title="Avatar">
          <ComponentCard title="Sizes & Status">
            <div className="flex flex-wrap items-end gap-4">
              <Avatar name="Andi Wijaya" size="xs" />
              <Avatar name="Budi Santoso" size="sm" status="online" />
              <Avatar name="Citra Dewi" size="md" status="busy" />
              <Avatar name="Dimas Pratama" size="lg" status="away" />
              <Avatar name="Eka Putri" size="xl" status="offline" />
            </div>
          </ComponentCard>
          <ComponentCard title="Avatar Group">
            <AvatarGroup
              max={4}
              avatars={[
                { name: "Andi Wijaya" }, { name: "Budi Santoso" }, { name: "Citra Dewi" },
                { name: "Dimas Pratama" }, { name: "Eka Putri" }, { name: "Fajar Ramadhan" },
              ]}
            />
          </ComponentCard>
        </Section>

        {/* TOOLTIP */}
        <Section id="tooltip" title="Tooltip">
          <ComponentCard title="Placements">
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip content="Tooltip atas" placement="top"><Button variant="outline" size="sm">Top</Button></Tooltip>
              <Tooltip content="Tooltip bawah" placement="bottom"><Button variant="outline" size="sm">Bottom</Button></Tooltip>
              <Tooltip content="Tooltip kiri" placement="left"><Button variant="outline" size="sm">Left</Button></Tooltip>
              <Tooltip content="Tooltip kanan" placement="right"><Button variant="outline" size="sm">Right</Button></Tooltip>
            </div>
          </ComponentCard>
        </Section>

        {/* PROGRESS */}
        <Section id="progress" title="Progress">
          <ComponentCard title="Linear Progress">
            <div className="space-y-4">
              <Progress value={75} color="primary" showLabel />
              <Progress value={50} color="emerald" showLabel />
              <Progress value={30} color="warning" showLabel striped />
              <Progress value={90} color="accent" size="lg" showLabel />
            </div>
          </ComponentCard>
          <ComponentCard title="Circular Progress">
            <div className="flex flex-wrap items-center gap-6">
              <CircularProgress value={75} color="primary" />
              <CircularProgress value={45} color="emerald" />
              <CircularProgress value={88} color="accent" size={100} strokeWidth={10} />
            </div>
          </ComponentCard>
        </Section>

        {/* SLIDER */}
        <Section id="slider" title="Slider">
          <ComponentCard title="Range Slider">
            <div className="space-y-6">
              <Slider label="Target Berat (kg)" value={sliderVal} min={40} max={120} showValue onChange={setSliderVal} />
              <Slider label="Intensitas" value={70} min={0} max={100} color="emerald" showValue onChange={() => {}} />
              <Slider label="Disabled" value={30} min={0} max={100} disabled onChange={() => {}} />
            </div>
          </ComponentCard>
        </Section>

        {/* RATING */}
        <Section id="rating" title="Rating">
          <ComponentCard title="Star Rating">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Rating value={ratingVal} allowHalf onChange={setRatingVal} />
                <span className="text-sm text-[var(--text-caption)]">{ratingVal} / 5</span>
              </div>
              <Rating value={4} readonly size="sm" />
              <Rating value={5} readonly size="lg" color="var(--color-emerald)" />
            </div>
          </ComponentCard>
        </Section>

        {/* TIMELINE */}
        <Section id="timeline" title="Timeline">
          <ComponentCard title="Activity Log" desc="Cocok untuk audit log / riwayat aktivitas">
            <Timeline
              items={[
                { title: "Member check-in", description: "Andi Wijaya scan QR di pintu masuk", time: "10:32 WIB", color: "emerald", badge: "Check-In" },
                { title: "Transaksi POS", description: "Pembelian Whey Protein — Rp 450.000", time: "10:15 WIB", color: "primary" },
                { title: "Membership diperpanjang", description: "Budi Santoso → Premium 6 bulan", time: "09:48 WIB", color: "info" },
                { title: "Booking dibatalkan", description: "Kelas Yoga 08:00 dibatalkan", time: "08:20 WIB", color: "warning" },
              ]}
            />
          </ComponentCard>
        </Section>

        {/* FEEDBACK */}
        <Section id="feedback" title="Loading & Empty States">
          <ComponentCard title="Skeleton">
            <div className="flex items-center gap-4">
              <Skeleton variant="circle" width={48} height={48} />
              <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="90%" />
              </div>
            </div>
            <Skeleton className="mt-4 h-24 w-full" />
          </ComponentCard>
          <ComponentCard title="Spinner">
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
          </ComponentCard>
          <ComponentCard title="Empty State">
            <EmptyState
              title="Belum ada member"
              description="Tambahkan member pertama untuk mulai mengelola data."
              action={<Button variant="primary" size="sm">+ Tambah Member</Button>}
            />
          </ComponentCard>
        </Section>

        {/* SIDEBAR */}
        <Section id="sidebar" title="Sidebar">
          <ComponentCard title="Sidebar Navigation" desc="Parent → child → grandchild. Active pakai highlight background (tanpa garis kiri).">
            <div className="h-[460px] overflow-hidden rounded-xl border border-[var(--border-default)]">
              <Sidebar
                activePath="/ui-kit-demo/membership"
                logo={<span className="text-lg font-bold text-[var(--text-heading)]">Padel<span className="text-[var(--color-primary)]">Hub</span></span>}
                groups={sidebarGroups}
                footer={<div className="flex items-center gap-2"><Avatar name="Raka Pradana" size="sm" /><div className="min-w-0"><p className="truncate text-sm font-medium text-[var(--text-heading)]">Raka Pradana</p><p className="truncate text-xs text-[var(--text-caption)]">Owner</p></div></div>}
              />
            </div>
          </ComponentCard>
        </Section>

        {/* ═══ CHARTS ═══ */}
        <Section id="charts" title="Charts">
          <ComponentCard title="Bar Chart" desc="Resizable — width 100%, height bisa diatur">
            <BarChart
              categories={["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"]}
              series={[
                { name: "Member Baru", data: [45, 52, 38, 65, 48, 72] },
                { name: "Check-out", data: [12, 8, 15, 6, 10, 5] },
              ]}
              height={300}
            />
          </ComponentCard>
          <ComponentCard title="Line / Area Chart">
            <LineChart
              area
              categories={["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]}
              series={[{ name: "Check-In", data: [120, 145, 132, 167, 189, 210, 95] }]}
              height={300}
            />
          </ComponentCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ComponentCard title="Radar / Spider Chart" desc="Profil performa">
              <RadarChart
                categories={["Kekuatan", "Cardio", "Fleksibilitas", "Endurance", "Balance"]}
                series={[
                  { name: "Andi", data: [80, 65, 70, 85, 60] },
                  { name: "Target", data: [90, 80, 75, 90, 80] },
                ]}
                height={300}
              />
            </ComponentCard>
            <ComponentCard title="Donut Chart" desc="Distribusi membership">
              <DonutChart
                labels={["Regular", "Premium", "VIP", "Student"]}
                series={[540, 420, 180, 107]}
                height={300}
              />
            </ComponentCard>
          </div>
        </Section>

        <div className="h-20" />

        {/* Addable → Modal demo */}
        <ModalDialog
          isOpen={addModal.isOpen}
          onClose={addModal.closeModal}
          title="Tambah Kategori Baru"
          description="Form ini muncul saat klik 'Tambah' di Addable Select"
          size="sm"
          footer={
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={addModal.closeModal}>Batal</Button>
              <Button variant="primary" size="sm" onClick={() => { addModal.closeModal(); toast.success("Kategori ditambahkan"); }}>Simpan</Button>
            </div>
          }
        >
          <div className="space-y-4">
            <TextInput label="Nama Kategori" placeholder="mis. Aksesoris" />
            <Textarea label="Deskripsi" placeholder="Deskripsi singkat..." rows={3} />
          </div>
        </ModalDialog>
      </div>
    </div>
  );
}
