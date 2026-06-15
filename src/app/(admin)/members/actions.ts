"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { revalidatePath } from "next/cache";

export type MemberRecord = {
  id: string;
  memberNo: string;
  name: string;
  phone: string;
  email: string;
  tier: string;
  status: string;
  isDaily: boolean;
  onboarded: boolean;
  coachingInterest: boolean;
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
  phone: string;
  email?: string;
  tier?: string; // membership deferred — defaults to "daily"
  isDaily: boolean;
  coachingInterest?: boolean;
  city?: string;
  /** court bookings assembled in the registration form (paid at booking) */
  bookings?: BookingDraftInput[];
};

export type RegisterMemberResult = {
  success: boolean;
  error?: string;
  memberNo?: string;
  tempPassword?: string;
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

function genMemberNo(isDaily: boolean): string {
  if (isDaily) {
    return `PHB-DAY-${String(100 + Math.floor(Math.random() * 899))}`;
  }
  return `PHB-2026-${String(1000 + Math.floor(Math.random() * 8999))}`;
}

function genTempPassword(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** List members for the current tenant (newest first). */
export async function getMembersAction(): Promise<MemberRecord[]> {
  const session = await requireSession();
  if (!session) return [];

  const db = await getTenantDb();
  const rows = await db.m_member.findMany({
    where: { companyId: session.companyId, isdeleted: 0 },
    orderBy: { created: "desc" },
  });

  return rows.map((m) => ({
    id: m.id,
    memberNo: m.memberNo,
    name: m.name,
    phone: m.phone,
    email: m.email ?? "",
    tier: m.tier,
    status: m.status,
    isDaily: m.isDaily,
    onboarded: m.onboarded,
    coachingInterest: m.coachingInterest,
    city: m.city,
    avatar: m.avatar,
    createdAt: m.created.toISOString(),
  }));
}

/**
 * Register a member at the front desk. NO payment is taken for the membership
 * itself — only the court bookings (if any) carry a charged price. Membership
 * tier economics and coaching are deferred; tier defaults to "daily".
 */
export async function registerMemberAction(
  input: RegisterMemberInput,
): Promise<RegisterMemberResult> {
  try {
    const session = await requireSession();
    if (!session) return { success: false, error: "Not authenticated." };

    if (!input.name?.trim() || input.name.trim().length < 2) {
      return { success: false, error: "Name must be at least 2 characters." };
    }
    if (input.phone.replace(/\D/g, "").length < 8) {
      return { success: false, error: "Phone number is not valid." };
    }

    const db = await getTenantDb();
    const memberNo = genMemberNo(input.isDaily);
    const tempPassword = genTempPassword();

    const member = await db.m_member.create({
      data: {
        companyId: session.companyId,
        memberNo,
        name: input.name.trim(),
        phone: input.phone,
        email: input.email?.trim() || null,
        tier: input.tier?.trim() || "daily",
        status: "active",
        isDaily: input.isDaily,
        onboarded: false,
        coachingInterest: input.coachingInterest ?? false,
        city: input.city?.trim() || null,
        tempPassword,
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
          createdBy: b.createdBy,
        })),
      });
    }

    revalidatePath("/members");
    return { success: true, memberNo, tempPassword };
  } catch (err) {
    console.error("[registerMemberAction] error:", err);
    return { success: false, error: "Failed to register member." };
  }
}
