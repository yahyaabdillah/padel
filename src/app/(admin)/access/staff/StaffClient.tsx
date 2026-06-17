"use client";

// Access Control ▸ Staff (internal users) — CRUD over m_user. Roles come from
// the master DB. Passwords are system-generated (shown once). Gated by
// access.staff actions.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, KeyRound, UserCog } from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import PhoneInput, { type Country } from "@/components/ui/input/PhoneInput";
import Select from "@/components/ui/select/Select";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useAccess } from "@/context/AccessContext";
import countriesData from "@/data/countries.json";
import {
  getStaffAction,
  getRoleOptionsAction,
  createStaffAction,
  updateStaffAction,
  deleteStaffAction,
  resetStaffPasswordAction,
  type StaffRecord,
  type RoleOption,
} from "@/app/(admin)/access/staff/actions";

type Draft = {
  id: string | null;
  name: string;
  userId: string;
  roleKey: string;
  email: string;
  phone: string;
  password: string;
  isActive: boolean;
};

const countries = countriesData as Country[];

const emptyDraft = (defaultRole: string): Draft => ({
  id: null,
  name: "",
  userId: "",
  roleKey: defaultRole,
  email: "",
  phone: "",
  password: "",
  isActive: true,
});

export default function StaffClient() {
  const toast = useToast();
  const { can } = useAccess();
  const canCreate = can("access.staff", "create");
  const canUpdate = can("access.staff", "update");
  const canDelete = can("access.staff", "delete");

  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<StaffRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [credModal, setCredModal] = useState<{ userId: string; password: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([getStaffAction(), getRoleOptionsAction()]);
      setStaff(s);
      setRoles(r);
    } catch {
      toast.error("Gagal memuat data user.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.key, label: r.name })),
    [roles],
  );

  const openNew = () => {
    setDraft(emptyDraft(roles[0]?.key ?? "staff"));
    setIsNew(true);
  };
  const openEdit = (u: StaffRecord) => {
    setDraft({
      id: u.id,
      name: u.name,
      userId: u.userId,
      roleKey: u.roleKey,
      email: u.email ?? "",
      phone: u.phone ?? "",
      password: "",
      isActive: u.isActive,
    });
    setIsNew(false);
  };

  const save = async () => {
    if (!draft || saving) return;
    if (draft.name.trim().length < 2) {
      toast.error("Nama minimal 2 karakter.");
      return;
    }
    if (isNew && draft.userId.trim().length < 3) {
      toast.error("Username minimal 3 karakter.");
      return;
    }
    if (draft.password.trim() && draft.password.trim().length < 6) {
      toast.error("Password minimal 6 karakter.");
      return;
    }
    setSaving(true);
    if (isNew) {
      const res = await createStaffAction({
        name: draft.name,
        userId: draft.userId,
        roleKey: draft.roleKey,
        password: draft.password.trim() || undefined,
        email: draft.email,
        phone: draft.phone,
      });
      setSaving(false);
      if (!res.success) {
        toast.error(res.error || "Gagal menambah user.");
        return;
      }
      setDraft(null);
      await load();
      if (res.tempPassword) {
        // system-generated → reveal once
        setCredModal({ userId: draft.userId.trim().toLowerCase(), password: res.tempPassword });
      }
      toast.success("User ditambahkan.");
    } else {
      const res = await updateStaffAction(draft.id!, {
        name: draft.name,
        roleKey: draft.roleKey,
        email: draft.email,
        phone: draft.phone,
        isActive: draft.isActive,
        password: draft.password.trim() || undefined,
      });
      setSaving(false);
      if (!res.success) {
        toast.error(res.error || "Gagal menyimpan user.");
        return;
      }
      setDraft(null);
      await load();
      toast.success(draft.password.trim() ? "User & password diperbarui." : "User diperbarui.");
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteStaffAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error(res.error || "Gagal menghapus user.");
      return;
    }
    toast.info(`User ${confirmDelete.name} dihapus.`);
    await load();
  };

  const resetPassword = async (u: StaffRecord) => {
    const res = await resetStaffPasswordAction(u.id);
    if (!res.success || !res.tempPassword) {
      toast.error(res.error || "Gagal reset password.");
      return;
    }
    setCredModal({ userId: u.userId, password: res.tempPassword });
  };

  return (
    <PageScaffold
      title="Staff & User"
      subtitle="Kelola akun user internal (owner, staff, coach, dll). Role diatur di Roles & Permissions; password dibuat otomatis oleh sistem."
      requireAny={["access.manage"]}
      actions={
        canCreate ? (
          <Button variant="primary" sheen glow startIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
            Tambah User
          </Button>
        ) : undefined
      }
    >
      <Card padding="none">
        <div className="flex items-center gap-2 border-b border-[var(--border-light)] p-4">
          <UserCog className="h-4 w-4 text-[var(--color-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-heading)]">User Internal</h3>
          <Badge size="sm" color="neutral" variant="light">{staff.length}</Badge>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--text-caption)]">
            Belum ada user internal.
          </p>
        ) : (
          <div className="divide-y divide-[var(--border-light)]">
            {staff.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-sm font-bold text-[var(--color-primary)]">
                    {(u.name[0] ?? "?").toUpperCase()}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-medium text-[var(--text-heading)]">
                      {u.name}
                      {!u.isActive && <Badge size="sm" color="neutral" variant="light">nonaktif</Badge>}
                    </p>
                    <p className="text-xs text-[var(--text-caption)]">
                      @{u.userId} · {u.email || "tanpa email"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm" color="primary" variant="light">{u.roleName}</Badge>
                  {canUpdate && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        startIcon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        startIcon={<KeyRound className="h-3.5 w-3.5" />}
                        onClick={() => resetPassword(u)}
                      >
                        Reset
                      </Button>
                    </>
                  )}
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                      onClick={() => setConfirmDelete(u)}
                      aria-label={`Hapus ${u.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* create / edit modal */}
      <ModalDialog
        isOpen={draft != null}
        onClose={() => setDraft(null)}
        title={isNew ? "Tambah User" : `Edit ${draft?.name || "User"}`}
        description={
          isNew
            ? "Isi password, atau kosongkan agar dibuat otomatis oleh sistem."
            : "Kosongkan password jika tidak ingin menggantinya."
        }
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
            <TextInput
              label="Nama lengkap"
              value={draft.name}
              onChange={(v) => setDraft({ ...draft, name: v })}
              placeholder="cth. Budi Santoso"
              required
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextInput
                label="Username"
                labelInfo="Username untuk login. Tidak bisa diubah setelah dibuat."
                value={draft.userId}
                onChange={(v) => setDraft({ ...draft, userId: v.toLowerCase().replace(/\s+/g, "") })}
                placeholder="cth. budi"
                required
                disabled={!isNew}
              />
              <Select
                label="Role"
                options={roleOptions}
                value={draft.roleKey}
                clearable={false}
                onChange={(v) => setDraft({ ...draft, roleKey: v as string })}
              />
            </div>
            <TextInput
              label={isNew ? "Password" : "Password baru"}
              labelInfo={
                isNew
                  ? "Minimal 6 karakter. Kosongkan untuk dibuat otomatis oleh sistem."
                  : "Minimal 6 karakter. Kosongkan jika tidak ingin mengganti password."
              }
              type="password"
              value={draft.password}
              onChange={(v) => setDraft({ ...draft, password: v })}
              placeholder={isNew ? "Kosongkan = auto-generate" : "Kosongkan = tetap"}
              hint={
                draft.password.trim() && draft.password.trim().length < 6
                  ? "Password minimal 6 karakter"
                  : undefined
              }
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <TextInput
                label="Email"
                type="email"
                value={draft.email}
                onChange={(v) => setDraft({ ...draft, email: v })}
                placeholder="user@klub.id"
              />
              <PhoneInput
                label="Telepon"
                countries={countries}
                value={draft.phone}
                onChange={(full) => setDraft({ ...draft, phone: full })}
              />
            </div>
            {!isNew && (
              <label className="flex items-center gap-3">
                <Switch checked={draft.isActive} onChange={(v) => setDraft({ ...draft, isActive: v })} />
                <span className="text-sm text-[var(--text-body)]">Akun aktif (bisa login)</span>
              </label>
            )}
          </div>
        )}
      </ModalDialog>

      {/* credential reveal modal (after create / reset) */}
      <ModalDialog
        isOpen={credModal != null}
        onClose={() => setCredModal(null)}
        title="Kredensial Login"
        description="Catat & berikan ke user. Password hanya ditampilkan sekali."
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setCredModal(null)}>Tutup</Button>
          </div>
        }
      >
        {credModal && (
          <div className="space-y-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-caption)]">Username</span>
              <span className="font-mono font-semibold text-[var(--text-heading)]">{credModal.userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-caption)]">Password</span>
              <span className="font-mono font-semibold text-[var(--text-heading)]">{credModal.password}</span>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* delete confirm */}
      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus user?"
        description={confirmDelete ? `Akun "${confirmDelete.name}" (@${confirmDelete.userId}) akan dihapus.` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="primary" className="!bg-rose-500 hover:!bg-rose-600" onClick={doDelete}>Hapus</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          User akan di-nonaktifkan dari sistem (soft delete). Riwayat tetap tersimpan.
        </p>
      </ModalDialog>
    </PageScaffold>
  );
}
