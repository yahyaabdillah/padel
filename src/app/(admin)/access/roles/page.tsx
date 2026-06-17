"use client";

// Access Control ▸ Roles & Permissions.
// Left: role list (add/edit/delete). Right: per-menu action matrix with 6
// granular flags (View / Create / Update / Delete / Import / Export). Saving
// writes the role→menu matrix to the master DB; the sidebar + page actions
// re-resolve from it.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  Pencil,
  Trash2,
  Save,
  Lock,
  ChevronRight,
  ChevronDown,
  Check,
} from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  getRolesAction,
  getMenusAction,
  getRoleMenuPermissionsAction,
  saveRoleMenuPermissionsAction,
  upsertRoleAction,
  deleteRoleAction,
  type RoleRecord,
  type MenuRecord,
} from "@/app/(admin)/access/actions";
import { MENU_ACTIONS, type MenuAction } from "@/data/padel/menu-catalog";

type Flags = {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCancel: boolean;
  canImport: boolean;
  canExport: boolean;
};

const emptyFlags = (): Flags => ({
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canCancel: false,
  canImport: false,
  canExport: false,
});

/** Recompute every group-parent row as the OR-aggregate of its children, so a
 * parent auto-unchecks when no child is checked. Pure: needs the menu list. */
function recomputeParentsFromMenus(
  map: Record<string, Flags>,
  menus: MenuRecord[],
): Record<string, Flags> {
  const next = { ...map };
  const tops = menus.filter((m) => m.parentKey === null);
  for (const top of tops) {
    const kids = menus.filter((m) => m.parentKey === top.key);
    if (kids.length === 0) continue; // leaf top-level keeps its own flags
    const agg = emptyFlags();
    for (const k of kids) {
      const kf = next[k.id] ?? emptyFlags();
      agg.canView = agg.canView || kf.canView;
      agg.canCreate = agg.canCreate || kf.canCreate;
      agg.canUpdate = agg.canUpdate || kf.canUpdate;
      agg.canDelete = agg.canDelete || kf.canDelete;
      agg.canCancel = agg.canCancel || kf.canCancel;
      agg.canImport = agg.canImport || kf.canImport;
      agg.canExport = agg.canExport || kf.canExport;
    }
    next[top.id] = agg;
  }
  return next;
}

const ACTION_FLAG: Record<MenuAction, keyof Flags> = {
  view: "canView",
  create: "canCreate",
  update: "canUpdate",
  delete: "canDelete",
  cancel: "canCancel",
  import: "canImport",
  export: "canExport",
};

const ACTION_LABEL: Record<MenuAction, string> = {
  view: "View",
  create: "Create",
  update: "Update",
  delete: "Delete",
  cancel: "Cancel",
  import: "Import",
  export: "Export",
};

type RoleDraft = { id: string | null; name: string; description: string; level: number };

export default function RolesPermissionsPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [matrix, setMatrix] = useState<Record<string, Flags>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [roleDraft, setRoleDraft] = useState<RoleDraft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RoleRecord | null>(null);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [r, m] = await Promise.all([getRolesAction(), getMenusAction()]);
      setRoles(r);
      setMenus(m);
      if (r.length && !selectedRoleId) setSelectedRoleId(r[0].id);
    } catch {
      toast.error("Gagal memuat data access control.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  // load matrix when role changes
  const loadMatrix = useCallback(async (roleId: string) => {
    const perms = await getRoleMenuPermissionsAction(roleId);
    const map: Record<string, Flags> = {};
    perms.forEach((p) => {
      map[p.menuId] = {
        canView: p.canView,
        canCreate: p.canCreate,
        canUpdate: p.canUpdate,
        canDelete: p.canDelete,
        canCancel: p.canCancel,
        canImport: p.canImport,
        canExport: p.canExport,
      };
    });
    // Parent (group) rows always reflect the aggregate of their children so the
    // displayed parent checkboxes stay consistent with what actually governs.
    setMatrix(recomputeParentsFromMenus(map, menus));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menus]);

  useEffect(() => {
    if (selectedRoleId) void loadMatrix(selectedRoleId);
  }, [selectedRoleId, loadMatrix]);

  // top-level menus + their children (tree by parentKey)
  const tops = useMemo(
    () => menus.filter((m) => m.parentKey === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [menus],
  );
  const childrenOf = useCallback(
    (key: string) => menus.filter((m) => m.parentKey === key).sort((a, b) => a.sortOrder - b.sortOrder),
    [menus],
  );

  const flagsFor = (menuId: string): Flags => matrix[menuId] ?? emptyFlags();

  // Apply one action toggle to a single row's flags, honoring the rule
  // "no action without View": turning a non-view action ON also turns View ON;
  // turning View OFF clears every action on that row.
  const applyAction = (cur: Flags, action: MenuAction, value: boolean): Flags => {
    if (action === "view" && value === false) return emptyFlags();
    const flag = ACTION_FLAG[action];
    const next = { ...cur, [flag]: value };
    if (value && action !== "view") next.canView = true;
    return next;
  };

  // Parent (group) rows mirror the aggregate of their children: a parent flag is
  // ON when ANY child has it ON. Recompute after any child change so the parent
  // auto-unchecks when no child is checked.
  const recomputeParents = (m: Record<string, Flags>): Record<string, Flags> =>
    recomputeParentsFromMenus(m, menus);

  const toggle = (menu: MenuRecord, action: MenuAction) => {
    setMatrix((prev) => {
      const kids = childrenOf(menu.key);
      let next = { ...prev };
      if (kids.length > 0) {
        // Parent group: this column acts as a bulk control over all children.
        const newValue = !flagsFor(menu.id)[ACTION_FLAG[action]];
        for (const k of kids) {
          next[k.id] = applyAction(next[k.id] ?? emptyFlags(), action, newValue);
        }
      } else {
        const cur = next[menu.id] ?? emptyFlags();
        next[menu.id] = applyAction(cur, action, !cur[ACTION_FLAG[action]]);
      }
      return recomputeParents(next);
    });
  };

  const toggleAll = (menu: MenuRecord, on: boolean) => {
    setMatrix((prev) => {
      const all: Flags = {
        canView: on,
        canCreate: on,
        canUpdate: on,
        canDelete: on,
        canCancel: on,
        canImport: on,
        canExport: on,
      };
      const kids = childrenOf(menu.key);
      let next = { ...prev };
      if (kids.length > 0) {
        for (const k of kids) next[k.id] = { ...all };
      } else {
        next[menu.id] = { ...all };
      }
      return recomputeParents(next);
    });
  };

  const save = async () => {
    if (!selectedRoleId || saving) return;
    setSaving(true);
    const rows = Object.entries(matrix).map(([menuId, f]) => ({ menuId, ...f }));
    const res = await saveRoleMenuPermissionsAction(selectedRoleId, rows);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan.");
      return;
    }
    toast.success(
      "Permission tersimpan. Perubahan untuk user lain berlaku setelah mereka login ulang.",
      "Berhasil",
    );
  };

  const saveRole = async () => {
    if (!roleDraft) return;
    if (roleDraft.name.trim().length < 2) {
      toast.error("Nama role minimal 2 karakter.");
      return;
    }
    const res = await upsertRoleAction(roleDraft.id, {
      name: roleDraft.name,
      description: roleDraft.description,
      level: roleDraft.level,
    });
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan role.");
      return;
    }
    toast.success("Role tersimpan.");
    setRoleDraft(null);
    await loadBase();
    if (res.id) setSelectedRoleId(res.id);
  };

  const doDeleteRole = async () => {
    if (!confirmDelete) return;
    const res = await deleteRoleAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error(res.error || "Gagal menghapus role.");
      return;
    }
    toast.info(`Role ${confirmDelete.name} dihapus.`);
    if (selectedRoleId === confirmDelete.id) setSelectedRoleId(null);
    await loadBase();
  };

  return (
    <PageScaffold
      title="Roles & Permissions"
      subtitle="Atur role dan hak akses per menu (View, Create, Update, Delete, Import, Export). Perubahan langsung mengatur menu sidebar & aksi di tiap halaman."
      requireAny={["access.manage"]}
      actions={
        <Button
          variant="primary"
          sheen
          startIcon={<Save className="h-4 w-4" />}
          onClick={save}
          disabled={!selectedRoleId || saving}
        >
          {saving ? "Menyimpan…" : "Simpan Permission"}
        </Button>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* ── Role list ── */}
        <Card padding="none" className="h-max">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-heading)]">Role</h3>
            </div>
            <Button
              size="sm"
              variant="outline"
              startIcon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setRoleDraft({ id: null, name: "", description: "", level: 5 })}
            >
              Tambah
            </Button>
          </div>
          <div className="space-y-1 p-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
              ))
            ) : (
              roles.map((r) => {
                const active = r.id === selectedRoleId;
                return (
                  <div key={r.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(r.id)}
                      className={[
                        "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        active
                          ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                          : "text-[var(--text-body)] hover:bg-[var(--surface-muted)]",
                      ].join(" ")}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {r.name}
                        {r.key === "superadmin" && <Lock className="h-3 w-3 opacity-40" />}
                      </span>
                      <ChevronRight className={`h-4 w-4 transition-transform ${active ? "translate-x-0.5" : ""}`} />
                    </button>
                    <div className="absolute right-9 top-1/2 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoleDraft({ id: r.id, name: r.name, description: r.description ?? "", level: r.level });
                        }}
                        className="rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                        aria-label="Edit role"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {r.key !== "superadmin" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(r);
                          }}
                          className="rounded-lg p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          aria-label="Hapus role"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* ── Matrix ── */}
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] p-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                {selectedRole ? selectedRole.name : "Pilih role"}
              </h3>
              {selectedRole && (
                <p className="text-xs text-[var(--text-caption)]">
                  {selectedRole.description || "Atur hak akses per menu."}
                </p>
              )}
            </div>
          </div>

          {selectedRole?.isSystem && (
            <div className="mx-4 mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Role sistem. Owner/Super Admin punya akses penuh secara implisit; perubahan di sini
                tetap disimpan namun role level tinggi tetap bisa akses semua.
              </span>
            </div>
          )}

          {/* header row */}
          <div
            className="sticky top-0 z-10 hidden gap-1 border-b border-[var(--border-light)] bg-[var(--surface-card)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)] md:grid"
            style={{ gridTemplateColumns: `1fr repeat(${MENU_ACTIONS.length}, 46px)` }}
          >
            <span>Menu</span>
            {MENU_ACTIONS.map((a) => (
              <span key={a} className="text-center">{ACTION_LABEL[a]}</span>
            ))}
          </div>

          <div className="divide-y divide-[var(--border-light)]">
            {tops.map((top) => {
              const kids = childrenOf(top.key);
              const hasKids = kids.length > 0;
              const open = expanded.has(top.key) || true; // keep groups open by default
              return (
                <div key={top.id}>
                  <MatrixRow
                    label={top.label}
                    icon={top.icon}
                    flags={flagsFor(top.id)}
                    depth={0}
                    isGroup={hasKids}
                    expanded={open}
                    onToggleExpand={
                      hasKids
                        ? () =>
                            setExpanded((prev) => {
                              const n = new Set(prev);
                              if (n.has(top.key)) n.delete(top.key);
                              else n.add(top.key);
                              return n;
                            })
                        : undefined
                    }
                    onToggle={(a) => toggle(top, a)}
                    onToggleAll={(on) => toggleAll(top, on)}
                  />
                  {hasKids &&
                    open &&
                    kids.map((c) => (
                      <MatrixRow
                        key={c.id}
                        label={c.label}
                        icon={c.icon}
                        flags={flagsFor(c.id)}
                        depth={1}
                        onToggle={(a) => toggle(c, a)}
                        onToggleAll={(on) => toggleAll(c, on)}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* role add/edit modal */}
      <ModalDialog
        isOpen={roleDraft != null}
        onClose={() => setRoleDraft(null)}
        title={roleDraft?.id ? "Edit Role" : "Tambah Role"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoleDraft(null)}>Batal</Button>
            <Button variant="primary" sheen onClick={saveRole}>Simpan</Button>
          </div>
        }
      >
        {roleDraft && (
          <div className="space-y-4">
            <TextInput
              label="Nama role"
              value={roleDraft.name}
              onChange={(v) => setRoleDraft({ ...roleDraft, name: v })}
              placeholder="cth. Supervisor"
              required
            />
            <Textarea
              label="Deskripsi"
              value={roleDraft.description}
              onChange={(v) => setRoleDraft({ ...roleDraft, description: v })}
              rows={2}
            />
            <TextInput
              label="Level (1 = tertinggi)"
              labelInfo="Level ≤ 1 (Owner/Super Admin) otomatis punya akses penuh."
              type="number"
              value={String(roleDraft.level)}
              onChange={(v) => setRoleDraft({ ...roleDraft, level: Math.max(1, Number(v) || 5) })}
            />
          </div>
        )}
      </ModalDialog>

      {/* delete role confirm */}
      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus role?"
        description={confirmDelete ? `Role "${confirmDelete.name}" akan dihapus.` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="primary" className="!bg-rose-500 hover:!bg-rose-600" onClick={doDeleteRole}>Hapus</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Permission yang terkait role ini juga akan dihapus.
        </p>
      </ModalDialog>
    </PageScaffold>
  );
}

/* ── one matrix row (menu + 6 action toggles) ── */
const MatrixRow: React.FC<{
  label: string;
  icon: string;
  flags: Flags;
  depth: number;
  isGroup?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onToggle: (action: MenuAction) => void;
  onToggleAll: (on: boolean) => void;
}> = ({ label, flags, depth, isGroup, expanded, onToggleExpand, onToggle, onToggleAll }) => {
  const allOn = MENU_ACTIONS.every((a) => flags[ACTION_FLAG[a]]);
  return (
    <div
      className="grid items-center gap-1 px-4 py-2.5 transition-colors hover:bg-[var(--surface-muted)]/50"
      style={{ gridTemplateColumns: `1fr repeat(${MENU_ACTIONS.length}, 46px)` }}
    >
      <div className="flex items-center gap-2" style={{ paddingLeft: depth * 18 }}>
        {isGroup ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-muted)]"
          >
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block h-5 w-5" />
        )}
        <span
          className={[
            "truncate text-sm",
            depth === 0 ? "font-semibold text-[var(--text-heading)]" : "text-[var(--text-body)]",
          ].join(" ")}
        >
          {label}
        </span>
        <button
          type="button"
          onClick={() => onToggleAll(!allOn)}
          className="ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--color-primary)]"
        >
          {allOn ? "Clear" : "All"}
        </button>
      </div>
      {MENU_ACTIONS.map((a) => {
        const on = flags[ACTION_FLAG[a]];
        return (
          <div key={a} className="flex justify-center">
            <button
              type="button"
              onClick={() => onToggle(a)}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                on
                  ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-muted)]/40 hover:border-[var(--color-primary)]/40",
              ].join(" ")}
              aria-label={`${ACTION_LABEL[a]} ${label}`}
            >
              {on ? <Check className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current opacity-30" />}
            </button>
          </div>
        );
      })}
    </div>
  );
};
