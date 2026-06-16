"use client";

import React, { useEffect, useState } from "react";
import Drawer from "@/components/ui/drawer/Drawer";
import { Avatar } from "@/components/ui/avatar/Avatar";
import Button from "@/components/ui/button/Button";
import TextInput from "@/components/ui/input/TextInput";
import UiSelect from "@/components/ui/select/Select";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import ToneBadge from "./ToneBadge";
import {
  type MemberRecord,
  updateMemberAction,
  deleteMemberAction,
  assignMemberPlanAction,
} from "@/app/(admin)/members/actions";
import { getPlansAction, type PlanRecord } from "@/app/(admin)/settings/plans/actions";

interface MemberDetailDrawerProps {
  member: MemberRecord | null;
  isOpen: boolean;
  onClose: () => void;
  /** called after a successful edit/delete so the parent can refresh */
  onChanged?: () => void;
  /** action permissions (from useAccess) */
  canUpdate?: boolean;
  canDelete?: boolean;
}

const statusMeta: Record<
  string,
  { label: string; tone: "success" | "neutral" | "warning" }
> = {
  active: { label: "Aktif", tone: "success" },
  inactive: { label: "Nonaktif", tone: "neutral" },
  frozen: { label: "Frozen", tone: "warning" },
};

const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({
  member,
  isOpen,
  onClose,
  onChanged,
  canUpdate = true,
  canDelete = true,
}) => {
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // membership assignment
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  // edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    if (member) {
      setName(member.name);
      setPhone(member.phone);
      setEmail(member.email);
      setCity(member.city ?? "");
      setStatus(member.status);
      setEditing(false);
      setConfirmDelete(false);
    }
  }, [member, isOpen]);

  if (!member) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} title="Member" size="max-w-md">
        <div />
      </Drawer>
    );
  }

  const s = statusMeta[member.status] ?? statusMeta.active;

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const res = await updateMemberAction(member.id, { name, phone, email, city, status: status as "active" | "inactive" | "frozen" });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan perubahan.");
      return;
    }
    toast.success("Data member diperbarui.");
    onChanged?.();
  };

  const remove = async () => {
    if (saving) return;
    setSaving(true);
    const res = await deleteMemberAction(member.id);
    setSaving(false);
    setConfirmDelete(false);
    if (!res.success) {
      toast.error("Gagal menghapus member.");
      return;
    }
    toast.success("Member dihapus.");
    onChanged?.();
  };

  const openPlanModal = async () => {
    setSelectedPlanId(member.planId ?? "");
    setPlanModalOpen(true);
    try {
      const rows = await getPlansAction();
      setPlans(rows.filter((p) => p.active));
    } catch {
      /* ignore */
    }
  };

  const assignPlan = async () => {
    if (assigning) return;
    setAssigning(true);
    const res = await assignMemberPlanAction(member.id, selectedPlanId || null);
    setAssigning(false);
    if (!res.success) {
      toast.error(res.error || "Gagal mengatur membership.");
      return;
    }
    toast.success(
      selectedPlanId ? "Membership diperbarui." : "Membership dihapus.",
      "Tersimpan",
    );
    setPlanModalOpen(false);
    onChanged?.();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Profil Member"
      size="max-w-md"
      footer={
        editing ? (
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setEditing(false)} disabled={saving}>
              Batal
            </Button>
            <Button variant="primary" fullWidth sheen onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        ) : canUpdate || canDelete ? (
          <div className="flex gap-2">
            {canDelete && (
              <Button
                variant="outline"
                fullWidth
                className="!text-red-500 hover:!bg-red-50 dark:hover:!bg-red-500/10"
                onClick={() => setConfirmDelete(true)}
              >
                Hapus
              </Button>
            )}
            {canUpdate && (
              <Button variant="primary" fullWidth sheen onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* header */}
        <div className="flex items-center gap-4">
          <Avatar name={member.name} size="xl" status={member.status === "active" ? "online" : "offline"} />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white">{member.name}</h3>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">@{member.username}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-xs text-gray-600 dark:text-gray-300">
                {member.memberNo}
              </span>
              <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
            </div>
          </div>
        </div>

        {editing ? (
          <div className="space-y-4">
            <TextInput label="Nama Lengkap" value={name} onChange={setName} required />
            <TextInput label="Nomor Telepon" value={phone} onChange={setPhone} required />
            <TextInput label="Email" type="email" value={email} onChange={setEmail} validate />
            <TextInput label="Kota" value={city} onChange={setCity} />
            <UiSelect
              label="Status"
              options={[
                { value: "active", label: "Aktif" },
                { value: "inactive", label: "Nonaktif" },
                { value: "frozen", label: "Frozen" },
              ]}
              value={status}
              clearable={false}
              onChange={(v) => setStatus(v as string)}
            />
          </div>
        ) : (
          <dl className="space-y-2.5 rounded-xl border border-gray-100 p-4 text-sm dark:border-gray-800">
            <div className="flex justify-between">
              <dt className="text-gray-400 dark:text-gray-500">Telepon</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{member.phone}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400 dark:text-gray-500">Email</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{member.email || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400 dark:text-gray-500">Kota</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{member.city || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400 dark:text-gray-500">Username login</dt>
              <dd className="font-mono font-medium text-gray-800 dark:text-white/90">{member.username}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400 dark:text-gray-500">Terdaftar</dt>
              <dd className="font-medium text-gray-800 dark:text-white/90">{member.createdAt.slice(0, 10)}</dd>
            </div>
          </dl>
        )}

        {/* membership */}
        {!editing && (
          <div className="rounded-xl border border-gray-100 p-4 dark:border-gray-800">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[var(--text-heading)]">Membership</span>
              {canUpdate && (
                <Button variant="outline" size="sm" onClick={openPlanModal}>
                  {member.planId ? "Ubah" : "Atur"}
                </Button>
              )}
            </div>
            {member.planId ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: member.planColor ?? "#6D5BFF" }}
                  />
                  <span className="text-sm font-medium text-[var(--text-heading)]">
                    {member.planName}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 dark:text-gray-500">Kuota terpakai</span>
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {member.quotaUsed}x siklus ini
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-caption)]">
                Belum punya membership. Klik &quot;Atur&quot; untuk memberi plan.
              </p>
            )}
          </div>
        )}
      </div>

      <ModalDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus member?"
        description={`${member.name} (${member.memberNo}) akan dihapus. Data tetap tersimpan untuk audit (soft delete).`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving}>
              Batal
            </Button>
            <Button
              variant="primary"
              className="!bg-red-500 hover:!bg-red-600"
              onClick={remove}
              disabled={saving}
            >
              {saving ? "Menghapus…" : "Ya, hapus"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">
          Tindakan ini menonaktifkan member dari daftar. Booking & riwayat tetap tersimpan.
        </p>
      </ModalDialog>
      <ModalDialog
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        title="Atur Membership"
        description={`Pilih plan untuk ${member.name}. Mengubah plan mereset siklus kuota.`}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPlanModalOpen(false)} disabled={assigning}>
              Batal
            </Button>
            <Button variant="primary" sheen onClick={assignPlan} disabled={assigning}>
              {assigning ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        }
      >
        <UiSelect
          label="Plan membership"
          searchable
          placeholder="Tanpa membership"
          options={[
            { value: "", label: "Tanpa membership (plain)" },
            ...plans.map((p) => ({
              value: p.id,
              label: p.name,
              desc:
                p.includedCourtBookings > 0
                  ? `${p.includedCourtBookings}x gratis · ${p.courtDiscountPct}% off`
                  : p.courtDiscountPct > 0
                    ? `${p.courtDiscountPct}% off`
                    : "Tanpa benefit booking",
            })),
          ]}
          value={selectedPlanId}
          clearable={false}
          onChange={(v) => setSelectedPlanId(v as string)}
        />
      </ModalDialog>
    </Drawer>
  );
};

export default MemberDetailDrawer;
