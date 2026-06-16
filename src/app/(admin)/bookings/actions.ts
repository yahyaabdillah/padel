"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { revalidatePath } from "next/cache";

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

export type CreateBookingInput = {
  courtId: string;
  memberId?: string | null;
  type: "member" | "walk_in" | "coaching" | "event";
  status: "confirmed" | "pending" | "checked_in" | "completed" | "cancelled";
  customer: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  partySize: number;
  price: number;
  note?: string;
};

export type CreateBookingsResult = {
  success: boolean;
  error?: string;
  ids?: string[];
};

/** Persist one or more bookings for the current tenant. Optionally burn N
 * membership-quota slots for a member (when bookings were covered free). */
export async function createBookingsAction(
  bookings: CreateBookingInput[],
  opts?: { memberId?: string; quotaConsumed?: number },
): Promise<CreateBookingsResult> {
  try {
    const session = await requireSession();
    if (!session) return { success: false, error: "Not authenticated." };
    if (!bookings.length) return { success: false, error: "No bookings." };

    const db = await getTenantDb();
    const ids: string[] = [];
    for (const b of bookings) {
      const created = await db.m_booking.create({
        data: {
          companyId: session.companyId,
          courtId: b.courtId,
          memberId: b.memberId ?? null,
          type: b.type,
          status: b.status,
          customer: b.customer,
          start: new Date(b.start),
          end: new Date(b.end),
          partySize: b.partySize,
          price: b.price,
          note: b.note ?? null,
          ...auditCreate(session.userId),
        },
      });
      ids.push(created.id);
    }

    // burn membership quota if this booking consumed it
    if (opts?.memberId && opts.quotaConsumed && opts.quotaConsumed > 0) {
      await db.m_member.updateMany({
        where: { id: opts.memberId, companyId: session.companyId, ...NOT_DELETED },
        data: {
          quotaUsed: { increment: opts.quotaConsumed },
          ...auditUpdate(session.userId),
        },
      });
    }

    revalidatePath("/bookings");
    return { success: true, ids };
  } catch (err) {
    console.error("[createBookingsAction] error:", err);
    return { success: false, error: "Gagal menyimpan booking." };
  }
}

export type BookingMember = {
  id: string;
  name: string;
  phone: string;
  tier: string;
  /** assigned plan benefit (null = no membership) */
  plan: {
    id: string;
    name: string;
    includedCourtBookings: number;
    courtDiscountPct: number;
  } | null;
  /** free quota still available this cycle */
  quotaRemaining: number;
};

/** Resolve a single member + their live membership benefit (for payment). */
export async function getMemberByIdAction(
  id: string,
): Promise<BookingMember | null> {
  const session = await requireSession();
  if (!session) return null;
  const db = await getTenantDb();
  const m = await db.m_member.findFirst({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    include: { plan: true },
  });
  if (!m) return null;

  let plan: BookingMember["plan"] = null;
  let quotaRemaining = 0;
  if (m.plan && m.plan.isDeleted === 0) {
    // roll the cycle if it has elapsed
    let used = m.quotaUsed;
    if (m.plan.resetPeriodDays > 0 && m.cycleStart) {
      const elapsedDays = Math.floor(
        (Date.now() - m.cycleStart.getTime()) / 86_400_000,
      );
      if (elapsedDays >= m.plan.resetPeriodDays) used = 0;
    }
    plan = {
      id: m.plan.id,
      name: m.plan.name,
      includedCourtBookings: m.plan.includedCourtBookings,
      courtDiscountPct: m.plan.courtDiscountPct,
    };
    quotaRemaining = Math.max(0, m.plan.includedCourtBookings - used);
  }

  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    tier: m.tier,
    plan,
    quotaRemaining,
  };
}

export type BookingRecord = {
  id: string;
  courtId: string;
  memberId: string | null;
  type: "member" | "walk_in" | "coaching" | "event";
  status: "confirmed" | "pending" | "checked_in" | "completed" | "cancelled";
  customer: string;
  start: string; // ISO
  end: string; // ISO
  partySize: number;
  price: number;
  note: string | null;
  createdBy: string;
};

/** List bookings for the current tenant (optionally filtered by date prefix). */
export async function getBookingsAction(): Promise<BookingRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.m_booking.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { start: "asc" },
  });
  // local "YYYY-MM-DDTHH:MM:SS" string (no tz shift) so the calendar matches input
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}:00`;
  return rows.map((b) => ({
    id: b.id,
    courtId: b.courtId,
    memberId: b.memberId,
    type: b.type as BookingRecord["type"],
    status: b.status as BookingRecord["status"],
    customer: b.customer,
    start: local(b.start),
    end: local(b.end),
    partySize: b.partySize,
    price: b.price,
    note: b.note,
    createdBy: b.createdBy ?? "",
  }));
}

/** Cancel a booking (status → cancelled). Keeps the row for audit/history. */
export async function cancelBookingAction(
  id: string,
): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
  const db = await getTenantDb();
  await db.m_booking.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: { status: "cancelled", ...auditUpdate(session.userId) },
  });
  revalidatePath("/bookings");
  return { success: true };
}

/** Soft-delete a booking entirely (audit-preserving). */
export async function deleteBookingAction(
  id: string,
): Promise<{ success: boolean }> {
  const session = await requireSession();
  if (!session) return { success: false };
  const db = await getTenantDb();
  await db.m_booking.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/bookings");
  return { success: true };
}
