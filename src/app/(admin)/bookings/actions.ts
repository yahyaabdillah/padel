"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { requirePermission } from "@/lib/access-guard";
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

export type BookingDetailInput = {
  courtId: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  partySize: number;
  /** rate before benefit */
  basePrice: number;
  /** charged after benefit */
  price: number;
  rateNote?: string;
  note?: string;
};

export type CreateBookingInput = {
  memberId?: string | null;
  type: "member" | "walk_in" | "coaching" | "event";
  status: "confirmed" | "pending" | "checked_in" | "completed" | "cancelled";
  customer: string;
  paymentMethod?: string;
  note?: string;
  /** the court sessions in this transaction */
  details: BookingDetailInput[];
};

export type CreateBookingsResult = {
  success: boolean;
  error?: string;
  /** the booking transaction (header) id */
  id?: string;
};

/** Persist a booking TRANSACTION (header + detail lines) for the tenant.
 * Optionally burn N membership-quota slots for the member, and optionally
 * collect the member's outstanding membership join fee in the same checkout. */
export async function createBookingsAction(
  input: CreateBookingInput,
  opts?: { memberId?: string; quotaConsumed?: number; joinFee?: number },
): Promise<CreateBookingsResult> {
  try {
    const guard = await requirePermission("booking.new", "create");
    if (!guard.ok) return { success: false, error: guard.error };
    const session = guard.session;
    if (!input.details.length) return { success: false, error: "No bookings." };

    const db = await getTenantDb();
    const courtTotal = input.details.reduce((s, d) => s + d.price, 0);
    const quotaConsumed = opts?.quotaConsumed ?? 0;
    const joinFee = Math.max(0, opts?.joinFee ?? 0);

    const header = await db.t_booking.create({
      data: {
        companyId: session.companyId,
        memberId: input.memberId ?? null,
        type: input.type,
        status: input.status,
        customer: input.customer,
        paymentMethod: input.paymentMethod ?? null,
        totalPrice: courtTotal + joinFee,
        joinFee,
        quotaConsumed,
        note: input.note ?? (joinFee > 0 ? `Termasuk join fee ${joinFee}` : null),
        ...auditCreate(session.userId),
        details: {
          create: input.details.map((d) => ({
            companyId: session.companyId,
            courtId: d.courtId,
            start: new Date(d.start),
            end: new Date(d.end),
            partySize: d.partySize,
            basePrice: d.basePrice,
            price: d.price,
            rateNote: d.rateNote ?? null,
            status: input.status,
            note: d.note ?? null,
            ...auditCreate(session.userId),
          })),
        },
      },
    });

    // update the member: burn quota and/or settle the join fee
    if (opts?.memberId && (quotaConsumed > 0 || joinFee > 0)) {
      await db.t_member.updateMany({
        where: { id: opts.memberId, companyId: session.companyId, ...NOT_DELETED },
        data: {
          ...(quotaConsumed > 0 && { quotaUsed: { increment: quotaConsumed } }),
          ...(joinFee > 0 && { joinFeePaid: true }),
          ...auditUpdate(session.userId),
        },
      });
    }

    revalidatePath("/bookings");
    return { success: true, id: header.id };
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
  /** outstanding one-time join fee to collect (0 = none / already paid) */
  joinFeeDue: number;
};

/** Resolve a single member + their live membership benefit (for payment). */
export async function getMemberByIdAction(
  id: string,
): Promise<BookingMember | null> {
  const session = await requireSession();
  if (!session) return null;
  const db = await getTenantDb();
  const m = await db.t_member.findFirst({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    include: { plan: true },
  });
  if (!m) return null;

  let plan: BookingMember["plan"] = null;
  let quotaRemaining = 0;
  let joinFeeDue = 0;
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
    if (!m.joinFeePaid) joinFeeDue = m.plan.joinFee;
  }

  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    tier: m.tier,
    plan,
    quotaRemaining,
    joinFeeDue,
  };
}

export type BookingRecord = {
  /** detail line id (the calendar operates per session) */
  id: string;
  /** parent transaction (header) id */
  bookingId: string;
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

/** List booking detail lines (one per court session) joined with header info. */
export async function getBookingsAction(): Promise<BookingRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.t_booking_detail.findMany({
    where: { companyId: session.companyId, isDeleted: 0 },
    orderBy: { start: "asc" },
    include: {
      booking: {
        select: { id: true, memberId: true, type: true, customer: true },
      },
    },
  });
  const pad = (n: number) => String(n).padStart(2, "0");
  const local = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours(),
    )}:${pad(d.getMinutes())}:00`;
  return rows.map((d) => ({
    id: d.id,
    bookingId: d.bookingId,
    courtId: d.courtId,
    memberId: d.booking?.memberId ?? null,
    type: (d.booking?.type ?? "member") as BookingRecord["type"],
    status: d.status as BookingRecord["status"],
    customer: d.booking?.customer ?? "",
    start: local(d.start),
    end: local(d.end),
    partySize: d.partySize,
    price: d.price,
    note: d.note,
    createdBy: d.createdBy ?? "",
  }));
}

/** Cancel a single booking session (detail line → cancelled). */
export async function cancelBookingAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("booking.list", "cancel");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.t_booking_detail.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: { status: "cancelled", ...auditUpdate(session.userId) },
  });
  revalidatePath("/bookings");
  return { success: true };
}

/** Soft-delete a single booking session (detail line). */
export async function deleteBookingAction(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("booking.list", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.t_booking_detail.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/bookings");
  return { success: true };
}
