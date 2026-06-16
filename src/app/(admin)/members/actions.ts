"use server";

import { cookies } from "next/headers";
import * as bcrypt from "bcryptjs";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export type MemberRecord = {
  id: string;
  memberNo: string;
  username: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  status: string;
  onboarded: boolean;
  city: string | null;
  avatar: string | null;
  createdAt: string;
};

export type BookingDraftInput = {
  courtId: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  type: "member" | "walk_in" | "coaching" | "event";
  status: "confirmed" | "pending" | "checked_in" | "completed" | "cancelled";
  customer: string;
  partySize: number;
  price: number;
  note?: string;
  createdBy: string;
};

export type RegisterMemberInput = {
  name: string;
  /** login username for the member portal */
  username: string;
  /** plain password chosen at registration (hashed server-side) */
  password: string;
  phone: string;
  email?: string;
  city?: string;
  /** court bookings assembled in the registration form (paid at booking) */
  bookings?: BookingDraftInput[];
};

export type RegisterMemberResult = {
  success: boolean;
  error?: string;
  id?: string;
  memberNo?: string;
  username?: string;
};

async function requireSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function genMemberNo(): string {
  return `PHB-2026-${String(1000 + Math.floor(Math.random() * 8999))}`;
}

/** Lightweight member options for booking/select inputs (newest first). */
export async function getMemberOptionsAction(): Promise<
  { id: string; name: string; phone: string; tier: string }[]
> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.m_member.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true, tier: true },
  });
  return rows.map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    tier: m.tier,
  }));
}

/** List members for the current tenant (newest first). */
export async function getMembersAction(): Promise<MemberRecord[]> {
  const session = await requireSession();
  if (!session) return [];

  const db = await getTenantDb();
  const rows = await db.m_member.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { createdAt: "desc" },
  });

  return rows.map((m) => ({
    id: m.id,
    memberNo: m.memberNo,
    username: m.username,
    name: m.name,
    phone: m.phone,
    email: m.email ?? "",
    tier: m.tier,
    status: m.status,
    onboarded: m.onboarded,
    city: m.city,
    avatar: m.avatar,
    createdAt: m.createdAt.toISOString(),
  }));
}

export type UpdateMemberInput = {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  status?: "active" | "inactive" | "frozen";
};

/** Update a member's editable profile fields. */
export async function updateMemberAction(
  id: string,
  patch: UpdateMemberInput,
): Promise<{ success: boolean; error?: string }> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated." };
  const db = await getTenantDb();
  await db.m_member.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...(patch.email !== undefined && { email: patch.email.trim() || null }),
      ...(patch.city !== undefined && { city: patch.city.trim() || null }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...auditUpdate(session.userId),
    },
  });
  revalidatePath("/members");
  return { success: true };
}

/** Soft-delete a member (audit-preserving). */
export async function deleteMemberAction(
  id: string,
): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
  const db = await getTenantDb();
  await db.m_member.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/members");
  return { success: true };
}

/** Check whether a member username is available for this tenant. */
export async function checkMemberUsernameAction(
  username: string,
): Promise<{ available: boolean }> {
  const session = await requireSession();
  if (!session) return { available: false };
  const u = username.trim().toLowerCase();
  if (u.length < 3) return { available: false };
  const db = await getTenantDb();
  const existing = await db.m_member.findFirst({
    where: { companyId: session.companyId, username: u },
  });
  return { available: !existing };
}

/**
 * Register a member at the front desk. Registration is FREE (no payment for the
 * membership itself) — only court bookings (if any) carry a charged price.
 * Membership tier economics + coaching are deferred; tier defaults to "daily".
 * The member can log in to the member portal using username + password.
 */
export async function registerMemberAction(
  input: RegisterMemberInput,
): Promise<RegisterMemberResult> {
  try {
    const session = await requireSession();
    if (!session) return { success: false, error: "Not authenticated." };

    if (!input.name?.trim() || input.name.trim().length < 2) {
      return { success: false, error: "Nama minimal 2 karakter." };
    }
    const username = input.username?.trim().toLowerCase() ?? "";
    if (username.length < 3) {
      return { success: false, error: "Username minimal 3 karakter." };
    }
    if (!input.password || input.password.length < 6) {
      return { success: false, error: "Password minimal 6 karakter." };
    }
    if (input.phone.replace(/\D/g, "").length < 8) {
      return { success: false, error: "Nomor telepon tidak valid." };
    }

    const db = await getTenantDb();

    // username must be unique within the tenant
    const clash = await db.m_member.findFirst({
      where: { companyId: session.companyId, username },
    });
    if (clash) {
      return { success: false, error: "Username sudah dipakai." };
    }

    const memberNo = genMemberNo();
    const passwordHash = await bcrypt.hash(input.password, 10);

    const member = await db.m_member.create({
      data: {
        companyId: session.companyId,
        memberNo,
        username,
        passwordHash,
        name: input.name.trim(),
        phone: input.phone,
        email: input.email?.trim() || null,
        tier: "daily",
        status: "active",
        onboarded: false,
        city: input.city?.trim() || null,
        ...auditCreate(session.userId),
      },
    });

    // Court bookings (the only thing paid for at registration).
    if (input.bookings && input.bookings.length > 0) {
      await db.m_booking.createMany({
        data: input.bookings.map((b) => ({
          companyId: session.companyId,
          courtId: b.courtId,
          memberId: member.id,
          type: b.type,
          status: b.status,
          customer: b.customer,
          start: new Date(b.start),
          end: new Date(b.end),
          partySize: b.partySize,
          price: b.price,
          note: b.note ?? null,
          createdBy: b.createdBy || session.userId,
        })),
      });
    }

    revalidatePath("/members");
    return { success: true, id: member.id, memberNo, username };
  } catch (err) {
    console.error("[registerMemberAction] error:", err);
    return { success: false, error: "Gagal mendaftarkan member." };
  }
}
