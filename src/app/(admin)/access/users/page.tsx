"use client";

// Access Control ▸ User Overrides.
// Per-user menu access that sits ON TOP of the role grant. For each menu a user
// is either "Ikut role" (no override → inherits role) or has an explicit
// override (the 7 action flags replace the role grant for that menu).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  User as UserIcon,
  Shield,
  Save,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import {
  getMenusAction,
  type MenuRecord,
} from "@/app/(admin)/access/actions";
import {
  getInternalUsersAction,
  getUserMenuOverridesAction,
  getRoleDefaultsByKeyAction,
  saveUserMenuOverridesAction,
  clearUserOverridesAction,
  type InternalUser,
} from "@/app/(admin)/access/users/actions";
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

/** A menu's editor state for the selected user. */
type RowState =
  | { mode: "role"; roleFlags: Flags } // inherit role default
  | { mode: "override"; flags: Flags; roleFlags: Flags };

export default function UserOverridesPage() {
  const toast = useToast();
  const { isSuper } = useAccess();
  const [menus, setMenus] = useState<MenuRecord[]>([]);
  const [users, setUsers] = useState<InternalUser[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, RowState>>({}); // by menuKey
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const selectedUser = users.find((u) => u.id === selectedId) ?? null;

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [m, u] = await Promise.all([getMenusAction(), getInternalUsersAction()]);
      setMenus(m);
      setUsers(u);
      if (u.length && !selectedId) setSelectedId(u[0].id);
    } catch {
      toast.error("Gagal memuat data.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  useEffect(() => {
    void loadBase();
  }, [loadBase]);

  // build row-state for the selected user: role defaults + their overrides
  const loadUser = useCallback(
    async (user: InternalUser) => {
      const [defaults, overrides] = await Promise.all([
        getRoleDefaultsByKeyAction(user.roleKey),
        getUserMenuOverridesAction(user.id),
      ]);
      const overrideByKey = new Map(overrides.map((o) => [o.menuKey, o]));
      const next: Record<string, RowState> = {};
      for (const m of menus) {
        const roleFlags: Flags = defaults[m.key]
          ? {
              canView: defaults[m.key].canView,
              canCreate: defaults[m.key].canCreate,
              canUpdate: defaults[m.key].canUpdate,
              canDelete: defaults[m.key].canDelete,
              canCancel: defaults[m.key].canCancel,
              canImport: defaults[m.key].canImport,
              canExport: defaults[m.key].canExport,
            }
          : emptyFlags();
        const ov = overrideByKey.get(m.key);
        if (ov) {
          next[m.key] = {
            mode: "override",
            roleFlags,
            flags: {
              canView: ov.canView,
              canCreate: ov.canCreate,
              canUpdate: ov.canUpdate,
              canDelete: ov.canDelete,
              canCancel: ov.canCancel,
              canImport: ov.canImport,
              canExport: ov.canExport,
            },
          };
        } else {
          next[m.key] = { mode: "role", roleFlags };
        }
      }
      setState(next);
    },
    [menus],
  );

  useEffect(() => {
    if (selectedUser && menus.length) void loadUser(selectedUser);
  }, [selectedUser, menus, loadUser]);

  const tops = useMemo(
    () => menus.filter((m) => m.parentKey === null).sort((a, b) => a.sortOrder - b.sortOrder),
    [menus],
  );
  const childrenOf = useCallback(
    (key: string) => menus.filter((m) => m.parentKey === key).sort((a, b) => a.sortOrder - b.sortOrder),
    [menus],
  );

  const setOverrideMode = (menuKey: string, override: boolean) => {
    setState((prev) => {
      const cur = prev[menuKey];
      if (!cur) return prev;
      if (override) {
        // start the override from the current role flags
        return {
          ...prev,
          [menuKey]: { mode: "override", roleFlags: cur.roleFlags, flags: { ...cur.roleFlags } },
        };
      }
      return { ...prev, [menuKey]: { mode: "role", roleFlags: cur.roleFlags } };
    });
  };

  const toggle = (menuKey: string, action: MenuAction) => {
    setState((prev) => {
      const cur = prev[menuKey];
      if (!cur || cur.mode !== "override") return prev;
      const flag = ACTION_FLAG[action];
      const flags = { ...cur.flags, [flag]: !cur.flags[flag] };
      if (action !== "view" && flags[flag]) flags.canView = true;
      return { ...prev, [menuKey]: { ...cur, flags } };
    });
  };

  const save = async () => {
    if (!selectedUser || saving) return;
    setSaving(true);
    const rows: (Flags & { menuKey: string })[] = [];
    const clearedKeys: string[] = [];
    for (const [menuKey, rs] of Object.entries(state)) {
      if (rs.mode === "override") rows.push({ menuKey, ...rs.flags });
      else clearedKeys.push(menuKey);
    }
    const res = await saveUserMenuOverridesAction(selectedUser.id, rows, clearedKeys);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan.");
      return;
    }
    toast.success(
      "Override tersimpan. Berlaku setelah user login ulang.",
      "Berhasil",
    );
  };

  const clearAll = async () => {
    if (!selectedUser) return;
    const res = await clearUserOverridesAction(selectedUser.id);
    if (!res.success) {
      toast.error(res.error || "Gagal mereset.");
      return;
    }
    toast.info("Semua override dihapus — user kembali mengikuti role.");
    void loadUser(selectedUser);
  };

  return (
    <PageScaffold
      title="User Overrides"
      subtitle="Atur hak akses khusus per user di atas hak role-nya. Menu yang 'Ikut role' mewarisi izin dari role; menu yang di-override memakai izin khusus ini."
      requireAny={["access.manage"]}
      actions={
        <div className="flex gap-2">
          {selectedUser && (
            <Button variant="outline" startIcon={<RotateCcw className="h-4 w-4" />} onClick={clearAll}>
              Reset ke role
            </Button>
          )}
          <Button
            variant="primary"
            sheen
            startIcon={<Save className="h-4 w-4" />}
            onClick={save}
            disabled={!selectedUser || saving}
          >
            {saving ? "Menyimpan…" : "Simpan Override"}
          </Button>
        </div>
      }
    >
      {!isSuper && (
        <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
          Hanya Super Admin yang sebaiknya mengelola override user.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
        {/* user list */}
        <Card padding="none" className="h-max">
          <div className="border-b border-[var(--border-light)] p-4">
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-heading)]">User Internal</h3>
            </div>
          </div>
          <div className="space-y-1 p-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
              ))
            ) : users.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--text-caption)]">
                Tidak ada user internal.
              </p>
            ) : (
              users.map((u) => {
                const active = u.id === selectedId;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedId(u.id)}
                    className={[
                      "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                        : "text-[var(--text-body)] hover:bg-[var(--surface-muted)]",
                    ].join(" ")}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{u.name}</span>
                      <span className="block truncate text-xs text-[var(--text-caption)]">
                        @{u.userId} · {u.roleKey}
                      </span>
                    </span>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${active ? "translate-x-0.5" : ""}`} />
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* matrix */}
        <Card padding="none">
          <div className="flex items-center justify-between border-b border-[var(--border-light)] p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--color-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                {selectedUser ? selectedUser.name : "Pilih user"}
              </h3>
              {selectedUser && (
                <Badge size="sm" color="neutral" variant="light">
                  role: {selectedUser.roleKey}
                </Badge>
              )}
            </div>
          </div>

          <div className="divide-y divide-[var(--border-light)]">
            {tops.map((top) => {
              const kids = childrenOf(top.key);
              const isOpen = expanded.has(top.key) || true;
              return (
                <div key={top.id}>
                  <OverrideRow
                    label={top.label}
                    rs={state[top.key]}
                    depth={0}
                    isGroup={kids.length > 0}
                    expanded={isOpen}
                    onToggleExpand={
                      kids.length > 0
                        ? () =>
                            setExpanded((p) => {
                              const n = new Set(p);
                              if (n.has(top.key)) n.delete(top.key);
                              else n.add(top.key);
                              return n;
                            })
                        : undefined
                    }
                    onSetOverride={(v) => setOverrideMode(top.key, v)}
                    onToggle={(a) => toggle(top.key, a)}
                  />
                  {kids.length > 0 &&
                    isOpen &&
                    kids.map((c) => (
                      <OverrideRow
                        key={c.id}
                        label={c.label}
                        rs={state[c.key]}
                        depth={1}
                        onSetOverride={(v) => setOverrideMode(c.key, v)}
                        onToggle={(a) => toggle(c.key, a)}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}

const OverrideRow: React.FC<{
  label: string;
  rs?: RowState;
  depth: number;
  isGroup?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onSetOverride: (override: boolean) => void;
  onToggle: (action: MenuAction) => void;
}> = ({ label, rs, depth, isGroup, expanded, onToggleExpand, onSetOverride, onToggle }) => {
  if (!rs) return null;
  const isOverride = rs.mode === "override";
  const flags = isOverride ? rs.flags : rs.roleFlags;
  return (
    <div
      className="grid items-center gap-1 px-4 py-2.5 transition-colors hover:bg-[var(--surface-muted)]/40"
      style={{ gridTemplateColumns: `1fr 110px repeat(${MENU_ACTIONS.length}, 46px)` }}
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
      </div>

      {/* mode toggle: Ikut role vs Override */}
      <button
        type="button"
        onClick={() => onSetOverride(!isOverride)}
        className={[
          "rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors",
          isOverride
            ? "bg-[var(--color-primary)] text-white"
            : "bg-[var(--surface-muted)] text-[var(--text-caption)]",
        ].join(" ")}
        title={isOverride ? "Memakai izin khusus" : "Mewarisi izin role"}
      >
        {isOverride ? "Override" : "Ikut role"}
      </button>

      {MENU_ACTIONS.map((a) => {
        const on = flags[ACTION_FLAG[a]];
        return (
          <div key={a} className="flex justify-center">
            <button
              type="button"
              disabled={!isOverride}
              onClick={() => onToggle(a)}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-lg border transition-all",
                !isOverride ? "opacity-40" : "",
                on
                  ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                  : "border-[var(--border-default)] text-[var(--text-muted)]/40",
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
