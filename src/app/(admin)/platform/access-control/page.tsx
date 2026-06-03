"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import PlatformHeader from "@/components/platform/PlatformHeader";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import Tabs from "@/components/ui/tabs/Tabs";
import { ModalDialog } from "@/components/ui/modal";
import TextInput from "@/components/ui/input/TextInput";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccessControl } from "@/context/AccessControlContext";
import { useMenu } from "@/context/MenuContext";
import {
  ALL_ROLES, roleLabels, roleScope, permissionCatalog,
  type UserRole,
} from "@/context/RoleContext";
import { IconReset, IconCheck, IconEdit } from "@/components/platform/icons";

const scopeTone: Record<string, "primary" | "success" | "info"> = {
  platform: "primary", club: "success", member: "info",
};

const ACTION_HINTS = ["view", "create", "edit", "delete", "manage", "export", "approve"];

export default function AccessControlPage() {
  const toast = useToast();
  const {
    getRolePerms, setRolePerm, setRolePermsBulk,
    getRoleMenus, setRoleMenu, resetDefaults, isReady,
  } = useAccessControl();
  const { items } = useMenu();

  const [activeRole, setActiveRole] = useState<UserRole>("staff");
  const [tab, setTab] = useState<"perms" | "menus">("perms");
  const [editRole, setEditRole] = useState<UserRole | null>(null);
  const [roleName, setRoleName] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, typeof permissionCatalog>();
    for (const p of permissionCatalog) {
      const arr = map.get(p.group) ?? [];
      arr.push(p);
      map.set(p.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  const perms = getRolePerms(activeRole);
  const isWildcard = perms.includes("*");
  const has = (key: string) => isWildcard || perms.includes(key);

  const togglePerm = (key: string, enabled: boolean) => {
    setRolePerm(activeRole, key, enabled);
  };

  const grantGroup = (groupKeys: string[], enabled: boolean) => {
    const current = new Set(perms.filter((p) => p !== "*"));
    groupKeys.forEach((k) => (enabled ? current.add(k) : current.delete(k)));
    setRolePermsBulk(activeRole, Array.from(current));
  };

  const roleMenuIds = getRoleMenus(activeRole);
  const visibleSeedMenus = items.filter((m) => m.roles.includes(activeRole));

  const handleReset = () => {
    resetDefaults();
    toast.success("RBAC reset to platform defaults.", "Access control reset");
  };

  const roleTabs = ALL_ROLES.map((r) => ({ value: r, label: roleLabels[r] }));

  return (
    <div>
      <PageBreadcrumb pageTitle="Access Control" />
      <PlatformHeader
        eyebrow="Platform · Security"
        title="Roles & Permissions (RBAC)"
        description="Grant or revoke capabilities per role and control which menus each role can see. Changes apply live across the app."
        actions={<Button size="sm" variant="outline" startIcon={<IconReset />} onClick={handleReset} className="!text-white !ring-white/40 hover:!bg-white/10">Reset defaults</Button>}
      />

      {/* Roles overview */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {ALL_ROLES.map((r) => {
          const rp = getRolePerms(r);
          const count = rp.includes("*") ? "All" : String(rp.length);
          return (
            <button
              key={r}
              onClick={() => setActiveRole(r)}
              className={`rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 ${
                activeRole === r
                  ? "border-brand-400 bg-brand-50/50 ring-1 ring-brand-300 dark:border-brand-500/50 dark:bg-brand-500/10"
                  : "border-gray-200 bg-white hover:border-brand-200 dark:border-gray-800 dark:bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center justify-between">
                <Badge variant="light" color={scopeTone[roleScope[r]]} size="sm">{roleScope[r]}</Badge>
                <span className="text-xs text-gray-400">{count} perms</span>
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-gray-100">{roleLabels[r]}</p>
              <button
                onClick={(e) => { e.stopPropagation(); setEditRole(r); setRoleName(roleLabels[r]); }}
                className="mt-1 inline-flex items-center gap-1 text-xs text-brand-500 hover:underline"
              >
                <IconEdit className="h-3 w-3" /> Edit role
              </button>
            </button>
          );
        })}
      </div>

      <ComponentCard
        title={`${roleLabels[activeRole]} — Access`}
        desc={isWildcard ? "This role has full wildcard (*) access — every permission granted." : "Toggle individual capabilities or whole groups."}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            variant="pill" size="sm"
            items={[
              { value: "perms", label: "Permission Matrix" },
              { value: "menus", label: "Menu Visibility", badge: roleMenuIds.length },
            ]}
            value={tab}
            onChange={(v) => setTab(v as "perms" | "menus")}
          />
          <Tabs variant="segment" size="sm" items={roleTabs} value={activeRole} onChange={(v) => setActiveRole(v as UserRole)} />
        </div>

        {isWildcard && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white"><IconCheck /></span>
            <span>{roleLabels[activeRole]} is a privileged role with <strong>wildcard (*)</strong> access. Granular toggles below are informational.</span>
          </div>
        )}

        {tab === "perms" ? (
          <div className="space-y-4">
            {groups.map(([group, list]) => {
              const groupKeys = list.map((p) => p.key);
              const allOn = !isWildcard && groupKeys.every((k) => perms.includes(k));
              const someOn = groupKeys.some((k) => has(k));
              return (
                <div key={group} className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <div className="flex items-center justify-between gap-3 bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{group}</h4>
                      <Badge variant="light" color={someOn ? "success" : "neutral"} size="sm">
                        {groupKeys.filter((k) => has(k)).length}/{groupKeys.length}
                      </Badge>
                    </div>
                    <button
                      disabled={isWildcard}
                      onClick={() => grantGroup(groupKeys, !allOn)}
                      className="text-xs font-medium text-brand-500 hover:underline disabled:opacity-40"
                    >
                      {allOn ? "Revoke all" : "Grant all"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 divide-y divide-gray-100 dark:divide-gray-800/60 sm:grid-cols-2 sm:divide-y-0">
                    {list.map((p) => {
                      const action = ACTION_HINTS.find((a) => p.key.endsWith(`.${a}`));
                      return (
                        <div key={p.key} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-gray-700 dark:text-gray-200">{p.label}</p>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <code className="text-[11px] text-gray-400">{p.key}</code>
                              {action && <Badge variant="light" color="secondary" size="sm">{action}</Badge>}
                            </div>
                          </div>
                          <Switch
                            checked={has(p.key)}
                            disabled={isWildcard}
                            onChange={(c) => togglePerm(p.key, c)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleSeedMenus.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">This role has no menu items assigned. Assign menus via the Menu Builder.</p>
            ) : (
              visibleSeedMenus
                .sort((a, b) => a.order - b.order)
                .map((m) => {
                  const isChild = !!m.parent;
                  const visible = roleMenuIds.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${isChild ? "ml-6 border-gray-100 dark:border-gray-800/60" : "border-gray-200 dark:border-gray-800"}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {isChild && <span className="text-gray-300 dark:text-gray-600">↳</span>}
                          <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{m.label}</p>
                          <Badge variant="light" color="secondary" size="sm">{m.section}</Badge>
                        </div>
                        <code className="text-[11px] text-gray-400">{m.path || "(group)"}</code>
                      </div>
                      <Switch
                        checked={visible}
                        color="emerald"
                        onChange={(c) => setRoleMenu(activeRole, m.id, c)}
                      />
                    </div>
                  );
                })
            )}
          </div>
        )}
      </ComponentCard>

      {/* Edit role modal (rename — dummy) */}
      <ModalDialog
        isOpen={!!editRole}
        onClose={() => setEditRole(null)}
        title="Edit role"
        description="Role display name is illustrative in this prototype."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => { toast.success("Role updated (dummy).", "Saved"); setEditRole(null); }}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput label="Display name" value={roleName} onChange={setRoleName} />
          {editRole && (
            <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500 dark:bg-white/[0.04] dark:text-gray-400">
              Scope: <span className="font-medium text-gray-700 dark:text-gray-200">{roleScope[editRole]}</span> ·
              Permissions: <span className="font-medium text-gray-700 dark:text-gray-200">{getRolePerms(editRole).includes("*") ? "All" : getRolePerms(editRole).length}</span>
            </div>
          )}
        </div>
      </ModalDialog>

      {!isReady && <p className="mt-4 text-center text-xs text-gray-400">Loading saved RBAC state…</p>}
    </div>
  );
}
