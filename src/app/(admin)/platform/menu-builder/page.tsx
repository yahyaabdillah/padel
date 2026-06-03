"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import Select from "@/components/ui/select/Select";
import TextInput from "@/components/ui/input/TextInput";
import { ModalDialog } from "@/components/ui/modal";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useMenu } from "@/context/MenuContext";
import { ALL_ROLES, roleLabels, type UserRole } from "@/context/RoleContext";
import {
  menuSectionOrder, type MenuIconKey, type MenuItem, type MenuGroup,
} from "@/data/padel/menus";
import { IconPlus, IconEdit, IconTrash, IconReset, IconDrag } from "@/components/platform/icons";

const ICON_KEYS: MenuIconKey[] = [
  "grid", "home", "calendar", "members", "package", "card", "shield", "list",
  "clipboard", "plug", "settings", "coach", "target", "cash", "dollar",
  "promo", "class", "wallet", "trending", "user",
];

const SECTIONS = [...menuSectionOrder];

const GROUP_OPTIONS: { value: MenuGroup; label: string }[] = [
  { value: "main", label: "UTAMA (main)" },
  { value: "master", label: "MASTER (master-data)" },
  { value: "others", label: "LAINNYA (others)" },
];

interface Draft {
  id?: string;
  label: string;
  path: string;
  icon: MenuIconKey;
  parent: string | null;
  section: string;
  group: MenuGroup;
  order: number;
  roles: UserRole[];
  badge?: "new" | "soon" | "hot" | "";
}

const emptyDraft: Draft = {
  label: "", path: "", icon: "grid", parent: null, section: "Platform",
  group: "others", order: 0, roles: ["superadmin"], badge: "",
};

export default function MenuBuilderPage() {
  const toast = useToast();
  const { items, addMenu, updateMenu, deleteMenu, reorder, resetMenus } = useMenu();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmDelete, setConfirmDelete] = useState<MenuItem | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>("Platform");

  const tops = useMemo(
    () =>
      items
        .filter((m) => m.parent === null && m.section === sectionFilter)
        .sort((a, b) => a.order - b.order),
    [items, sectionFilter],
  );

  const childrenOf = (id: string) =>
    items.filter((m) => m.parent === id).sort((a, b) => a.order - b.order);

  const parentOptions = useMemo(
    () => [
      { value: "", label: "— Top level —" },
      ...items
        .filter((m) => m.parent === null)
        .map((m) => ({ value: m.id, label: `${m.section} · ${m.label}` })),
    ],
    [items],
  );

  const openCreate = () => { setDraft({ ...emptyDraft, section: sectionFilter }); setOpen(true); };
  const openEdit = (m: MenuItem) => {
    setDraft({
      id: m.id, label: m.label, path: m.path, icon: m.icon, parent: m.parent,
      section: m.section, group: m.group ?? "others", order: m.order,
      roles: m.roles, badge: m.badge ?? "",
    });
    setOpen(true);
  };

  const save = () => {
    if (!draft.label.trim()) { toast.error("Label is required.", "Validation"); return; }
    const payload = {
      label: draft.label.trim(),
      path: draft.path.trim(),
      icon: draft.icon,
      parent: draft.parent || null,
      section: draft.section,
      group: draft.group,
      order: draft.order,
      roles: draft.roles.length ? draft.roles : (["superadmin"] as UserRole[]),
      badge: draft.badge ? (draft.badge as "new" | "soon" | "hot") : undefined,
    };
    if (draft.id) {
      updateMenu(draft.id, payload);
      toast.success(`"${payload.label}" updated. The sidebar reflects it instantly.`, "Menu saved");
    } else {
      addMenu(payload);
      toast.success(`"${payload.label}" added to the ${payload.section} menu.`, "Menu created");
    }
    setOpen(false);
  };

  const move = (parent: string | null, list: MenuItem[], index: number, dir: -1 | 1) => {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder(parent, next.map((m) => m.id));
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    deleteMenu(confirmDelete.id);
    toast.warning(`"${confirmDelete.label}" removed from the menu.`, "Menu deleted");
    setConfirmDelete(null);
  };

  const sectionTabs = SECTIONS.map((s) => ({
    value: s, count: items.filter((m) => m.section === s && m.parent === null).length,
  }));

  return (
    <div>
      <PageBreadcrumb pageTitle="Menu Builder" />
      <PlatformHeader
        eyebrow="Platform · Low-code"
        title="Menu Builder"
        description="Compose the dynamic navigation. Items render straight into the sidebar — reorder, nest, assign roles, attach permissions."
        actions={
          <>
            <Button size="sm" variant="outline" startIcon={<IconReset />} className="!text-white !ring-white/40 hover:!bg-white/10" onClick={() => { resetMenus(); toast.success("Menu reset to seed.", "Reset"); }}>Reset</Button>
            <Button size="sm" variant="primary" sheen startIcon={<IconPlus />} onClick={openCreate}>Add item</Button>
          </>
        }
      />

      <div className="mb-5 inline-flex flex-wrap gap-2">
        {sectionTabs.map((s) => (
          <button
            key={s.value}
            onClick={() => setSectionFilter(s.value)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
              sectionFilter === s.value
                ? "border-brand-400 bg-brand-50 text-brand-600 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-200 text-gray-600 hover:border-brand-200 dark:border-gray-800 dark:text-gray-300"
            }`}
          >
            {s.value}
            <span className="rounded-full bg-gray-100 px-1.5 text-xs text-gray-500 dark:bg-white/10 dark:text-gray-400">{s.count}</span>
          </button>
        ))}
      </div>

      <ComponentCard title={`${sectionFilter} Navigation`} desc="Drag-order with the arrows. Children nest under their parent.">
        {tops.length === 0 ? (
          <EmptyState title="No menu items" description={`The ${sectionFilter} section is empty.`} action={<Button variant="primary" startIcon={<IconPlus />} onClick={openCreate}>Add item</Button>} />
        ) : (
          <div className="space-y-2">
            {tops.map((m, i) => {
              const kids = childrenOf(m.id);
              return (
                <div key={m.id} className="rounded-xl border border-gray-200 dark:border-gray-800">
                  <MenuRow
                    item={m}
                    onEdit={() => openEdit(m)}
                    onDelete={() => setConfirmDelete(m)}
                    onUp={() => move(null, tops, i, -1)}
                    onDown={() => move(null, tops, i, 1)}
                  />
                  {kids.length > 0 && (
                    <div className="space-y-1 border-t border-gray-100 bg-gray-50/60 px-2 py-2 dark:border-gray-800/60 dark:bg-white/[0.02]">
                      {kids.map((c, ci) => (
                        <MenuRow
                          key={c.id}
                          item={c}
                          nested
                          onEdit={() => openEdit(c)}
                          onDelete={() => setConfirmDelete(c)}
                          onUp={() => move(m.id, kids, ci, -1)}
                          onDown={() => move(m.id, kids, ci, 1)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ComponentCard>

      {/* Create / edit modal */}
      <ModalDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        title={draft.id ? "Edit menu item" : "New menu item"}
        description="Items are persisted to localStorage and rendered live in the sidebar."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>{draft.id ? "Save changes" : "Create item"}</Button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput label="Label" required value={draft.label} onChange={(v) => setDraft((d) => ({ ...d, label: v }))} placeholder="e.g. Tournaments" />
          <TextInput label="Path" value={draft.path} onChange={(v) => setDraft((d) => ({ ...d, path: v }))} placeholder="/platform/tournaments" hint="Leave blank for a group parent" />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Icon</label>
            <Select options={ICON_KEYS.map((k) => ({ value: k, label: k }))} value={draft.icon} searchable onChange={(v) => setDraft((d) => ({ ...d, icon: v as MenuIconKey }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Section</label>
            <Select options={SECTIONS.map((s) => ({ value: s, label: s }))} value={draft.section} onChange={(v) => setDraft((d) => ({ ...d, section: v as string }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Group</label>
            <Select
              options={GROUP_OPTIONS}
              value={draft.group}
              onChange={(v) => setDraft((d) => ({ ...d, group: v as MenuGroup }))}
            />
            <p className="mt-1 text-[11px] text-gray-400">UTAMA (top, flat) · MASTER (master data) · LAINNYA (collapsible).</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Parent</label>
            <Select options={parentOptions} value={draft.parent ?? ""} onChange={(v) => setDraft((d) => ({ ...d, parent: (v as string) || null }))} />
          </div>
          <TextInput
            label="Order"
            type="number"
            value={String(draft.order)}
            onChange={(v) => setDraft((d) => ({ ...d, order: Number(v) || 0 }))}
            hint="Lower = higher in its group"
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-200">Badge</label>
            <Select
              options={[{ value: "", label: "None" }, { value: "new", label: "New" }, { value: "soon", label: "Soon" }, { value: "hot", label: "Hot" }]}
              value={draft.badge ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, badge: v as Draft["badge"] }))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Visible to roles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => {
                const on = draft.roles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, roles: on ? d.roles.filter((x) => x !== r) : [...d.roles, r] }))}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      on
                        ? "bg-brand-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300"
                    }`}
                  >
                    {roleLabels[r]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </ModalDialog>

      <ModalDialog
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete menu item?"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="primary" className="!bg-rose-500 hover:!bg-rose-600" onClick={handleDelete}>Delete</Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Remove <strong>{confirmDelete?.label}</strong>{confirmDelete && childrenOf(confirmDelete.id).length > 0 ? " and all its children" : ""} from the menu? This cannot be undone (until reset).
        </p>
      </ModalDialog>
    </div>
  );
}

function MenuRow({
  item, nested = false, onEdit, onDelete, onUp, onDown,
}: {
  item: MenuItem;
  nested?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 ${nested ? "rounded-lg hover:bg-white dark:hover:bg-white/[0.03]" : ""}`}>
      <span className="text-gray-300 dark:text-gray-600"><IconDrag /></span>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{item.label}</span>
        {!nested && (
          <Badge variant="light" color={item.group === "main" ? "primary" : item.group === "master" ? "info" : "secondary"} size="sm">
            {item.group === "main" ? "UTAMA" : item.group === "master" ? "MASTER" : "LAINNYA"}
          </Badge>
        )}
        {item.badge && <Badge variant="solid" color={item.badge === "hot" ? "error" : item.badge === "soon" ? "warning" : "primary"} size="sm">{item.badge}</Badge>}
        <code className="hidden truncate text-[11px] text-gray-400 sm:inline">{item.path || "(group)"}</code>
      </div>
      <div className="hidden items-center gap-1 md:flex">
        {item.roles.slice(0, 3).map((r) => (
          <Badge key={r} variant="light" color="secondary" size="sm">{r}</Badge>
        ))}
        {item.roles.length > 3 && <span className="text-xs text-gray-400">+{item.roles.length - 3}</span>}
      </div>
      <div className="flex items-center gap-0.5">
        <IconBtn onClick={onUp} label="Move up">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
        </IconBtn>
        <IconBtn onClick={onDown} label="Move down">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </IconBtn>
        <IconBtn onClick={onEdit} label="Edit"><IconEdit /></IconBtn>
        <IconBtn onClick={onDelete} label="Delete" danger><IconTrash /></IconBtn>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, label, danger }: { children: React.ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 dark:hover:bg-white/10 ${danger ? "hover:text-rose-500" : "hover:text-brand-500"}`}
    >
      {children}
    </button>
  );
}
