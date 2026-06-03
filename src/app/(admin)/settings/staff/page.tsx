"use client";

import React, { useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatDateLong } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Select from "@/components/ui/select/Select";
import TextInput from "@/components/ui/input/TextInput";
import DataTable, { type Column } from "@/components/ui/table/DataTable";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { roleLabels, type UserRole } from "@/context/RoleContext";

// Roles assignable to a club staff member (platform superadmin excluded).
const clubRoles: UserRole[] = ["owner", "staff", "coach"];

const roleTone: Record<string, "primary" | "secondary" | "info" | "neutral"> = {
  owner: "primary",
  coach: "secondary",
  staff: "info",
};

interface StaffMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  status: "active" | "invited" | "suspended";
  joinedAt: string;
}

const seedStaff: StaffMember[] = [
  { id: "u-001", name: "Raka Pradana", email: "owner@smashcourt.id", avatar: "/images/user/owner.jpg", role: "owner", status: "active", joinedAt: "2025-02-12" },
  { id: "u-002", name: "Budi Santoso", email: "frontdesk@smashcourt.id", avatar: "/images/user/user-02.jpg", role: "staff", status: "active", joinedAt: "2025-03-05" },
  { id: "u-003", name: "Dimas Pratama", email: "dimas@smashcourt.id", avatar: "/images/user/user-03.jpg", role: "coach", status: "active", joinedAt: "2023-01-15" },
  { id: "u-004", name: "Larasati Putri", email: "lara@smashcourt.id", avatar: "/images/user/user-05.jpg", role: "coach", status: "active", joinedAt: "2023-06-02" },
  { id: "u-005", name: "Maya Anggraini", email: "maya@smashcourt.id", avatar: "/images/user/user-07.jpg", role: "staff", status: "invited", joinedAt: "2026-05-28" },
  { id: "u-006", name: "Reza Mahendra", email: "reza@smashcourt.id", avatar: "/images/user/user-08.jpg", role: "coach", status: "suspended", joinedAt: "2024-08-01" },
];

const statusMeta: Record<StaffMember["status"], { label: string; tone: "success" | "warning" | "error" }> = {
  active: { label: "Active", tone: "success" },
  invited: { label: "Invited", tone: "warning" },
  suspended: { label: "Suspended", tone: "error" },
};

export default function StaffPage() {
  const toast = useToast();
  const [staff, setStaff] = useState<StaffMember[]>(seedStaff);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("staff");

  const stats = useMemo(() => {
    const active = staff.filter((s) => s.status === "active").length;
    const coaches = staff.filter((s) => s.role === "coach").length;
    const invited = staff.filter((s) => s.status === "invited").length;
    return { total: staff.length, active, coaches, invited };
  }, [staff]);

  const changeRole = (id: string, role: UserRole) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, role } : s)));
    toast.success(`Role updated to ${roleLabels[role]}.`);
  };

  const toggleSuspend = (s: StaffMember) => {
    const next = s.status === "suspended" ? "active" : "suspended";
    setStaff((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
    toast.success(`${s.name} ${next === "suspended" ? "suspended" : "reactivated"}.`);
  };

  const sendInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.warning("Enter a name and email to invite.");
      return;
    }
    setStaff((prev) => [
      {
        id: `u-${Date.now()}`,
        name: inviteName.trim(),
        email: inviteEmail.trim(),
        avatar: "",
        role: inviteRole,
        status: "invited",
        joinedAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    toast.success(`Invitation sent to ${inviteEmail.trim()}.`);
    setInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    setInviteRole("staff");
  };

  const columns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Member",
      accessor: (s) => (
        <div className="flex items-center gap-3">
          <EngageAvatar src={s.avatar || undefined} name={s.name} size={38} />
          <div>
            <p className="font-medium text-[var(--text-heading)]">{s.name}</p>
            <p className="text-xs text-[var(--text-muted)]">{s.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      accessor: (s) =>
        s.role === "owner" ? (
          <Badge color="primary" variant="light">{roleLabels.owner}</Badge>
        ) : (
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 200 }}>
            <Select
              size="sm"
              value={s.role}
              searchable
              onChange={(v) => changeRole(s.id, v as UserRole)}
              options={clubRoles
                .filter((r) => r !== "owner")
                .map((r) => ({ value: r, label: roleLabels[r] }))}
            />
          </div>
        ),
    },
    {
      key: "tone",
      header: "Access",
      align: "center",
      accessor: (s) => <Badge size="sm" color={roleTone[s.role]} variant="light" dot>{roleLabels[s.role]}</Badge>,
    },
    { key: "joined", header: "Joined", sortable: true, sortValue: (s) => s.joinedAt, accessor: (s) => <span className="text-xs text-[var(--text-caption)]">{formatDateLong(s.joinedAt)}</span> },
    { key: "status", header: "Status", align: "center", accessor: (s) => <Badge size="sm" color={statusMeta[s.status].tone} variant="light" dot>{statusMeta[s.status].label}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      accessor: (s) =>
        s.role === "owner" ? (
          <span className="text-xs text-[var(--text-muted)]">—</span>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <Button size="sm" variant="ghost" onClick={() => toggleSuspend(s)}>
              {s.status === "suspended" ? "Reactivate" : "Suspend"}
            </Button>
          </div>
        ),
    },
  ];

  return (
    <PageScaffold
      title="Staff & Roles"
      subtitle="Invite team members and assign their access role. Roles map to the platform RBAC permissions."
      requireAny={["settings.view"]}
      actions={
        <Button variant="primary" sheen startIcon={<span className="text-base leading-none">+</span>} onClick={() => setInviteOpen(true)}>
          Invite Member
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Team Members" value={stats.total} accent="primary" />
          <StatCard label="Active" value={stats.active} accent="secondary" />
          <StatCard label="Coaches" value={stats.coaches} accent="accent" />
          <StatCard label="Pending Invites" value={stats.invited} accent="amber" />
        </div>

        <DataTable columns={columns} data={staff} rowKey={(s) => s.id} />

        <Card title="Role Reference" desc="What each club role can do" padding="md">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { role: "owner" as UserRole, desc: "Full club access — config, finance, staff, all modules." },
              { role: "staff" as UserRole, desc: "Front desk — bookings, check-in, POS, members." },
              { role: "coach" as UserRole, desc: "Own schedule, classes, PT, clients and matches." },
            ].map((r) => (
              <div key={r.role} className="rounded-xl border border-[var(--border-default)] p-4">
                <Badge color={roleTone[r.role]} variant="light" dot>{roleLabels[r.role]}</Badge>
                <p className="mt-2 text-sm text-[var(--text-body)]">{r.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ModalDialog
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Team Member"
        description="They'll receive an email invitation to join the club workspace."
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button variant="primary" sheen onClick={sendInvite}>Send Invite</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput label="Full name" placeholder="e.g. Sari Wulandari" value={inviteName} onChange={setInviteName} />
          <TextInput label="Email" type="email" placeholder="name@smashcourt.id" value={inviteEmail} onChange={setInviteEmail} />
          <Select
            label="Role"
            value={inviteRole}
            searchable
            onChange={(v) => setInviteRole(v as UserRole)}
            options={clubRoles.map((r) => ({ value: r, label: roleLabels[r] }))}
          />
        </div>
      </ModalDialog>
    </PageScaffold>
  );
}
