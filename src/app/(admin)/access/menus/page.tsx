"use client";

// Access Control ▸ Menu Builder. CRUD over the master menu catalog. Each menu
// has a lucide icon name (with live preview), path, parent, group bucket, order,
// badge and active flag. Menus drive the sidebar; per-role action permissions
// are set in Roles & Permissions.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as Lucide from "lucide-react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import InputLabel from "@/components/ui/input/InputLabel";
import Select from "@/components/ui/select/Select";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import {
  getMenusAction,
  upsertMenuAction,
  deleteMenuAction,
  type MenuRecord,
} from "@/app/(admin)/access/actions";

const GROUP_OPTIONS = [
  { value: "main", label: "UTAMA (main)" },
  { value: "master", label: "MASTER (master)" },
  { value: "others", label: "LAINNYA (others)" },
];
const SECTION_OPTIONS = [
  { value: "Club", label: "Club" },
  { value: "Platform", label: "Platform" },
  { value: "Member", label: "Member" },
];
const BADGE_OPTIONS = [
  { value: "", label: "Tanpa badge" },
  { value: "new", label: "new" },
  { value: "soon", label: "soon" },
  { value: "hot", label: "hot" },
];

// a curated shortlist for the icon picker; any valid lucide name also works via free text
const ICON_SUGGESTIONS = [
  "LayoutGrid", "CalendarDays", "CalendarCheck", "CalendarPlus", "CalendarClock",
  "Users", "UserPlus", "User", "GraduationCap", "Package", "Wallet", "Clock",
  "Wrench", "ShieldCheck", "Shield", "ListTree", "SlidersHorizontal", "Settings",
  "DollarSign", "ShoppingCart", "Tag", "Target", "QrCode", "Home", "CreditCard",
];

const IconPreview = ({ name, className = "h-5 w-5" }: { name: string; className?: string }) => {
  const Cmp =
    (Lucide as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name] ??
    Lucide.Circle;
  return <Cmp className={className} />;
};

type Draft = {
  id: string | null;
  label: string;
  path: string;
  icon: string;
  parentKey: string | null;
  groupKey: string;
  section: string;
  sortOrder: number;
  badge: string;
  isActive: boolean;
};

const emptyDraft = (sortOrder: number): Draft => ({
  id: null,
  label: "",
  path: "",
  icon: "LayoutGrid",
  parentKey: null,
  groupKey: "others",
  section: "Club",
  sortOrder,
  badge: "",
  isActive: true,
});

export default function MenuBuilderPage() {
  const toast = useToast();
  const { refresh } = useAccess();
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<MenuRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMenus(await getMenusAction());
    } catch {
      toast.error("Gagal memuat menu.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const tops = useMemo(
    () => menus.filter((m) => m.parentKey === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [menus],
  );
  const childrenOf = useCallback(
    (key: string) => menus.filter((m) => m.parentKey === key).sort((a, b) => a.sortOrder - b.sortOrder),
    [menus],
  );

  const parentOptions = useMemo(
    () => [
      { value: "", label: "— Top level —" },
      ...tops.map((t) => ({ value: t.key, label: t.label })),
    ],
    [tops],
  );

  const openNew = () => setDraft(emptyDraft(menus.length));
  const openEdit = (m: MenuRecord) =>
    setDraft({
      id: m.id,
      label: m.label,
      path: m.path,
      icon: m.icon,
      parentKey: m.parentKey,
      groupKey: m.groupKey,
      section: m.section,
      sortOrder: m.sortOrder,
      badge: m.badge ?? "",
      isActive: m.isActive,
    });

  const save = async () => {
    if (!draft || saving) return;
    if (draft.label.trim().length < 2) {
      toast.error("Label menu minimal 2 karakter.");
      return;
    }
    setSaving(true);
    const res = await upsertMenuAction(draft.id, {
      label: draft.label,
      path: draft.path,
      icon: draft.icon,
      parentKey: draft.parentKey || null,
      groupKey: draft.groupKey,
      section: draft.section,
      sortOrder: draft.sortOrder,
      badge: draft.badge || null,
      isActive: draft.isActive,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan menu.");
      return;
    }
    toast.success("Menu tersimpan.");
    setDraft(null);
    await load();
    await refresh();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteMenuAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error("Gagal menghapus menu.");
      return;
    }
    toast.info(`Menu ${confirmDelete.label} dihapus.`);
    await load();
    await refresh();
  };

  const Row: React.FC<{ m: MenuRecord; depth: number }> = ({ m, depth }) => (
    <div
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5"
      style={{ marginLeft: depth * 20 }}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="h-4 w-4 text-[var(--text-muted)]/40" />
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-[var(--color-primary)]">
          <IconPreview name={m.icon} className="h-4 w-4" />
        </span>
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-heading)]">
            {m.label}
            {m.badge && <Badge size="sm" color="primary" variant="light">{m.badge}</Badge>}
            {!m.isActive && <Badge size="sm" color="neutral" variant="light">nonaktif</Badge>}
          </p>
          <p className="text-xs text-[var(--text-caption)]">
            {m.path || "— grup —"} · <span className="uppercase">{m.groupKey}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" startIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(m)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
          onClick={() => setConfirmDelete(m)}
          aria-label={`Hapus ${m.label}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <PageScaffold
      title="Menu Builder"
      subtitle="Kelola item menu sidebar: label, ikon (lucide), path, grup, dan urutan. Hak akses per role diatur di Roles & Permissions."
      requireAny={["access.manage"]}
      actions={
        <Button variant="primary" sheen glow startIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
          Tambah Menu
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {tops.map((t) => (
            <div key={t.id} className="space-y-2">
              <Row m={t} depth={0} />
              {childrenOf(t.key).map((c) => (
                <Row key={c.id} m={c} depth={1} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* create / edit modal */}
      <ModalDialog
        isOpen={draft != null}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit Menu" : "Tambah Menu"}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>Batal</Button>
            <Button variant="primary" sheen onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        }
      >
        {draft && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextInput
                label="Label menu"
                value={draft.label}
                onChange={(v) => setDraft({ ...draft, label: v })}
                placeholder="cth. Booking"
                required
              />
              <TextInput
                label="Path (kosongkan untuk grup)"
                labelInfo="Route halaman. Kosong = menu grup (punya anak)."
                value={draft.path}
                onChange={(v) => setDraft({ ...draft, path: v })}
                placeholder="/bookings"
              />
            </div>

            {/* icon picker */}
            <div>
              <InputLabel label="Ikon (lucide)" tooltip="Nama ikon lucide-react. Ketik bebas atau pilih dari saran." />
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--color-primary)]">
                  <IconPreview name={draft.icon} />
                </span>
                <TextInput
                  value={draft.icon}
                  onChange={(v) => setDraft({ ...draft, icon: v })}
                  placeholder="LayoutGrid"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ICON_SUGGESTIONS.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDraft({ ...draft, icon: name })}
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                      draft.icon === name
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : "border-[var(--border-default)] text-[var(--text-caption)] hover:border-[var(--color-primary)]/40",
                    ].join(" ")}
                    title={name}
                  >
                    <IconPreview name={name} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Select
                label="Parent"
                options={parentOptions}
                value={draft.parentKey ?? ""}
                clearable={false}
                onChange={(v) => setDraft({ ...draft, parentKey: (v as string) || null })}
              />
              <Select
                label="Grup sidebar"
                options={GROUP_OPTIONS}
                value={draft.groupKey}
                clearable={false}
                onChange={(v) => setDraft({ ...draft, groupKey: v as string })}
              />
              <Select
                label="Section"
                options={SECTION_OPTIONS}
                value={draft.section}
                clearable={false}
                onChange={(v) => setDraft({ ...draft, section: v as string })}
              />
              <Select
                label="Badge"
                options={BADGE_OPTIONS}
                value={draft.badge}
                clearable={false}
                onChange={(v) => setDraft({ ...draft, badge: v as string })}
              />
              <TextInput
                label="Urutan"
                type="number"
                value={String(draft.sortOrder)}
                onChange={(v) => setDraft({ ...draft, sortOrder: Number(v) || 0 })}
              />
            </div>

            <label className="flex items-center gap-3">
              <Switch checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} />
              <span className="text-sm text-[var(--text-body)]">Menu aktif (tampil di sidebar)</span>
            </label>
          </div>
        )}
      </ModalDialog>

      {/* delete confirm */}
      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus menu?"
        description={confirmDelete ? `Menu "${confirmDelete.label}" akan dihapus.` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="primary" className="!bg-rose-500 hover:!bg-rose-600" onClick={doDelete}>Hapus</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Anak menu di bawahnya bisa jadi ikut tersembunyi jika parent dihapus.
        </p>
      </ModalDialog>
    </PageScaffold>
  );
}
