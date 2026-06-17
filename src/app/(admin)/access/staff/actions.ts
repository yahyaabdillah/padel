"use server";

// PadelHub — internal user (staff) management. CRUD over tenant m_user, with
// roles sourced from the master DB. Gated by access.staff permissions.

import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant-db";
import { masterPrisma } from "@/lib/master-db";
import { requirePermission } from "@/lib/access-guard";

export type StaffRecord = {
  id: string;
  userId: string;
  name: string;
  roleKey: string;
  roleName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
};

export type RoleOption = { key: string; name: string };

function genTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** List internal users with their role display name. */
export async function getStaffAction(): Promise<StaffRecord[]> {
  const guard = await requirePermission("access.staff", "view");
  if (!guard.ok) return [];
  const session = guard.session;
  const db = await getTenantDb();
  const [rows, roles] = await Promise.all([
    db.m_user.findMany({
      where: { companyId: session.companyId, isDeleted: 0 },
      orderBy: { createdAt: "asc" },
    }),
    masterPrisma.m_role.findMany({ where: { isDeleted: 0 } }),
  ]);
  const roleName = new Map(roles.map((r) => [r.key, r.name]));
  return rows.map((u) => ({
    id: u.id,
    userId: u.userId,
    name: u.namalengkap ?? u.userId,
    roleKey: u.roleKey,
    roleName: roleName.get(u.roleKey) ?? u.roleKey,
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    lastLogin: u.lastLogin ? u.lastLogin.toISOString() : null,
    createdAt: u.createdAt.toISOString(),
  }));
}

/** Selectable roles for the staff form (from master). */
export async function getRoleOptionsAction(): Promise<RoleOption[]> {
  const guard = await requirePermission("access.staff", "view");
  if (!guard.ok) return [];
  const roles = await masterPrisma.m_role.findMany({
    where: { isDeleted: 0 },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });
  return roles.map((r) => ({ key: r.key, name: r.name }));
}

export type CreateStaffInput = {
  name: string;
  userId: string; // login username
  roleKey: string;
  /** optional manual password; when omitted/blank a temp one is generated */
  password?: string;
  email?: string;
  phone?: string;
};

export type CreateStaffResult = {
  success: boolean;
  error?: string;
  id?: string;
  /** present only when the system generated the password */
  tempPassword?: string;
};

export async function createStaffAction(
  input: CreateStaffInput,
): Promise<CreateStaffResult> {
  const guard = await requirePermission("access.staff", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;

  if (!input.name?.trim() || input.name.trim().length < 2) {
    return { success: false, error: "Nama minimal 2 karakter." };
  }
  const userId = input.userId?.trim().toLowerCase() ?? "";
  if (userId.length < 3) return { success: false, error: "Username minimal 3 karakter." };

  // manual password (if provided) must be ≥ 6 chars
  const manual = input.password?.trim() ?? "";
  if (manual && manual.length < 6) {
    return { success: false, error: "Password minimal 6 karakter." };
  }

  // role must exist
  const role = await masterPrisma.m_role.findUnique({ where: { key: input.roleKey } });
  if (!role || role.isDeleted !== 0) return { success: false, error: "Role tidak valid." };

  const db = await getTenantDb();
  const clash = await db.m_user.findFirst({
    where: { companyId: session.companyId, userId },
  });
  if (clash) return { success: false, error: "Username sudah dipakai." };

  // use the manual password, otherwise generate one to reveal once
  const generated = manual ? "" : genTempPassword();
  const plain = manual || generated;
  const passwordHash = await bcrypt.hash(plain, 10);
  const created = await db.m_user.create({
    data: {
      companyId: session.companyId,
      userId,
      passwordHash,
      roleKey: input.roleKey,
      namalengkap: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      isActive: true,
      createdBy: session.userId,
    },
  });
  revalidatePath("/access/staff");
  // reveal only when system-generated; a manual password is already known
  return { success: true, id: created.id, tempPassword: generated || undefined };
}

export type UpdateStaffInput = {
  name?: string;
  roleKey?: string;
  email?: string;
  phone?: string;
  isActive?: boolean;
  /** optional new password (≥6). Blank/undefined = keep current. */
  password?: string;
};

export async function updateStaffAction(
  id: string,
  patch: UpdateStaffInput,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("access.staff", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();

  // prevent demoting the last active superadmin
  if (patch.roleKey !== undefined || patch.isActive === false) {
    const target = await db.m_user.findFirst({
      where: { id, companyId: session.companyId, isDeleted: 0 },
    });
    if (target?.roleKey === "superadmin") {
      const otherSupers = await db.m_user.count({
        where: {
          companyId: session.companyId,
          roleKey: "superadmin",
          isActive: true,
          isDeleted: 0,
          id: { not: id },
        },
      });
      const losingSuper =
        (patch.roleKey !== undefined && patch.roleKey !== "superadmin") ||
        patch.isActive === false;
      if (losingSuper && otherSupers === 0) {
        return {
          success: false,
          error: "Tidak bisa menonaktifkan/mengubah role Super Admin terakhir.",
        };
      }
    }
  }

  if (patch.roleKey) {
    const role = await masterPrisma.m_role.findUnique({ where: { key: patch.roleKey } });
    if (!role || role.isDeleted !== 0) return { success: false, error: "Role tidak valid." };
  }

  // optional password change
  const newPw = patch.password?.trim() ?? "";
  if (patch.password !== undefined && patch.password !== "" && newPw.length < 6) {
    return { success: false, error: "Password minimal 6 karakter." };
  }
  const passwordHash = newPw ? await bcrypt.hash(newPw, 10) : undefined;

  await db.m_user.updateMany({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    data: {
      ...(patch.name !== undefined && { namalengkap: patch.name.trim() }),
      ...(patch.roleKey !== undefined && { roleKey: patch.roleKey }),
      ...(patch.email !== undefined && { email: patch.email.trim() || null }),
      ...(patch.phone !== undefined && { phone: patch.phone.trim() || null }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
      ...(passwordHash && { passwordHash }),
      updatedBy: session.userId,
    },
  });
  revalidatePath("/access/staff");
  return { success: true };
}

/** Reset a user's password to a new system-generated one. */
export async function resetStaffPasswordAction(
  id: string,
): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  const guard = await requirePermission("access.staff", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  const tempPassword = genTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);
  await db.m_user.updateMany({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    data: { passwordHash, updatedBy: session.userId },
  });
  revalidatePath("/access/staff");
  return { success: true, tempPassword };
}

export async function deleteStaffAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("access.staff", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();

  // cannot delete yourself
  if (id === session.id) {
    return { success: false, error: "Tidak bisa menghapus akun Anda sendiri." };
  }

  const target = await db.m_user.findFirst({
    where: { id, companyId: session.companyId, isDeleted: 0 },
  });
  if (!target) return { success: false, error: "User tidak ditemukan." };

  // cannot delete the last active superadmin
  if (target.roleKey === "superadmin") {
    const otherSupers = await db.m_user.count({
      where: {
        companyId: session.companyId,
        roleKey: "superadmin",
        isActive: true,
        isDeleted: 0,
        id: { not: id },
      },
    });
    if (otherSupers === 0) {
      return { success: false, error: "Tidak bisa menghapus Super Admin terakhir." };
    }
  }

  await db.m_user.updateMany({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    data: { isDeleted: 1, deletedAt: new Date(), deletedBy: session.userId },
  });
  // clean up the user's menu overrides too
  await db.m_user_menu.deleteMany({ where: { companyId: session.companyId, userId: id } });
  revalidatePath("/access/staff");
  return { success: true };
}
