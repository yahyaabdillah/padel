"use server";

// PadelHub — member self-service booking actions (DB-backed). The acting member
// is resolved from the session (role === "member", id === t_member.id). No
// member-picker step (it's always "me"), and NO cash payment (cash must go
// through staff at the desk) — only non-cash methods (QRIS / Transfer).
//
// Multi-session: a checkout may carry several court sessions priced together by
// calcMembershipBenefit and persisted atomically through the shared
// checkout-core (runCheckout). RBAC is enforced here (the core does not guard).

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditUpdate, NOT_DELETED } from "@/lib/audit";
import { calcMembershipBenefit } from "@/lib/membership-benefit";
import { requirePermission } from "@/lib/access-guard";
import { runCheckout, type CheckoutBookingInput } from "@/lib/checkout-core";
import { getTimeGroupsAction } from "@/app/(admin)/settings/hours/group-actions";
import {
  MEMBER_PAYMENT_METHODS,
  STORAGE_SLOT_MINUTES,
  SLOTS_PER_DAY,
  type DaySchedule,
  type MeBookData,
  type MeCourt,
  type MeBookedSlot,
  type MeMembership,
  type MeTimeGroup,
  type BookSessionInput,
  type CreateMyBookingInput,
  type CreateMyBookingResult,
  type PreviewMyBookingResult,
  type PreviewLine,
  type CancelMyBookingResult,
} from "./types";

async function requireMemberSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as AuthSession;
    return s.role === "member" ? s : null;
  } catch {
    return null;
  }
}

/** Page bootstrap: active courts + the member's live membership benefit. */
export async function getMeBookDataAction(): Promise<MeBookData | null> {
  const session = await requireMemberSession();
  if (!session) return null;
  const db = await getTenantDb(session.dbConfig);

  const courtRows = await db.m_court.findMany({
    where: { companyId: session.companyId, status: "active", ...NOT_DELETED },
    orderBy: { name: "asc" },
  });

  const courts: MeCourt[] = courtRows.map((c) => ({
    id: c.id,
    name: c.name,
    environment: c.environment,
    wall: c.wall,
    format: c.format,
    priceOffPeak: c.priceOffPeak,
    pricePeak: c.pricePeak,
    color: c.color,
    schedule: (c.schedule as unknown as DaySchedule[]) ?? [],
  }));

  const membership = await resolveMembershipView(db, session);
  const timeGroups = (await getTimeGroupsAction()) as MeTimeGroup[];

  return { courts, membership, timeGroups };
}

async function resolveMembershipView(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  session: AuthSession,
): Promise<MeMembership> {
  const m = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    include: { plan: true },
  });

  const empty: MeMembership = {
    planName: null,
    quotaRemaining: 0,
    quotaTotal: 0,
    courtDiscountPct: 0,
    resetAt: null,
  };
  if (!m?.plan || m.plan.isDeleted !== 0) return empty;

  let used = m.quotaUsed;
  let resetAt: string | null = null;
  if (m.plan.resetPeriodDays > 0 && m.cycleStart) {
    const elapsedDays = Math.floor((Date.now() - m.cycleStart.getTime()) / 86_400_000);
    if (elapsedDays >= m.plan.resetPeriodDays) used = 0;
    const next = new Date(m.cycleStart);
    next.setDate(next.getDate() + m.plan.resetPeriodDays);
    resetAt = next.toISOString().slice(0, 10);
  }
  return {
    planName: m.plan.name,
    quotaRemaining: Math.max(0, m.plan.includedCourtBookings - used),
    quotaTotal: m.plan.includedCourtBookings,
    courtDiscountPct: m.plan.courtDiscountPct,
    resetAt,
  };
}

/** Occupied storage slots per court for a given date (YYYY-MM-DD). */
export async function getMeOccupancyAction(dateKey: string): Promise<MeBookedSlot[]> {
  const session = await requireMemberSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);

  const dayStart = new Date(`${dateKey}T00:00:00`);
  const dayEnd = new Date(`${dateKey}T23:59:59`);

  const lines = await db.t_booking_detail.findMany({
    where: {
      companyId: session.companyId,
      isDeleted: 0,
      status: { not: "cancelled" },
      start: { gte: dayStart, lte: dayEnd },
    },
    select: { courtId: true, start: true, end: true },
  });

  const byCourt = new Map<string, Set<number>>();
  for (const l of lines) {
    const set = byCourt.get(l.courtId) ?? new Set<number>();
    const startSlot = l.start.getHours() * 2 + (l.start.getMinutes() >= 30 ? 1 : 0);
    const endMin = l.end.getHours() * 60 + l.end.getMinutes();
    const endSlot = Math.ceil(endMin / STORAGE_SLOT_MINUTES);
    for (let s = startSlot; s < endSlot && s < SLOTS_PER_DAY; s++) set.add(s);
    byCourt.set(l.courtId, set);
  }

  return [...byCourt.entries()].map(([courtId, slots]) => ({
    courtId,
    slots: [...slots].sort((a, b) => a - b),
  }));
}

/* ════════════════════════════════════════════════════════
 *  Session pricing (shared by preview + create)
 * ════════════════════════════════════════════════════════ */

type PricedSession = {
  courtId: string;
  courtName: string;
  dateKey: string;
  startHour: number;
  durationHours: number;
  start: Date;
  end: Date;
  partySize: number;
  basePrice: number;
};

/** Compute base price + time window for a single requested session, validating
 * the court, operating window, and that the slot is in the future. Returns a
 * string on error. */
async function priceOneSession(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  companyId: string,
  s: BookSessionInput,
): Promise<PricedSession | string> {
  if (s.durationHours <= 0 || s.startHour < 0 || s.startHour > 23) {
    return "Waktu booking tidak valid.";
  }
  const court = await db.m_court.findFirst({
    where: { id: s.courtId, companyId, status: "active", ...NOT_DELETED },
  });
  if (!court) return "Lapangan tidak ditemukan.";

  const schedule = (court.schedule as unknown as DaySchedule[]) ?? [];
  const start = new Date(`${s.dateKey}T${String(s.startHour).padStart(2, "0")}:00:00`);
  const durMin = Math.round(s.durationHours * 60);
  const end = new Date(start.getTime() + durMin * 60_000);

  if (start.getTime() < Date.now()) {
    return "Tidak bisa booking di waktu yang sudah lewat.";
  }

  const daySched = schedule.find((d) => d.day === start.getDay());
  if (!daySched || !daySched.available) {
    return "Lapangan tutup di hari tersebut.";
  }

  const startSlot = s.startHour * 2;
  const slotSpan = Math.ceil(durMin / STORAGE_SLOT_MINUTES);
  let basePrice = 0;
  for (let i = 0; i < slotSpan; i++) {
    const slot = startSlot + i;
    if (slot >= SLOTS_PER_DAY) return "Durasi melebihi jam operasional.";
    const rate = daySched.slots[slot];
    if (rate === "closed" || !rate) {
      return "Sebagian jam berada di luar jam operasional.";
    }
    const hourPrice = rate === "peak" ? court.pricePeak : court.priceOffPeak;
    basePrice += (hourPrice * STORAGE_SLOT_MINUTES) / 60;
  }

  return {
    courtId: court.id,
    courtName: court.name,
    dateKey: s.dateKey,
    startHour: s.startHour,
    durationHours: s.durationHours,
    start,
    end,
    partySize: Math.max(2, Math.min(4, s.partySize || 4)),
    basePrice: Math.round(basePrice),
  };
}

/** Resolve the member's live plan + remaining quota (cycle rollover applied). */
async function resolveBenefitInputs(
  db: Awaited<ReturnType<typeof getTenantDb>>,
  companyId: string,
  memberId: string,
): Promise<{ plan: { includedCourtBookings: number; courtDiscountPct: number } | null; quotaRemaining: number }> {
  const member = await db.t_member.findFirst({
    where: { id: memberId, companyId, ...NOT_DELETED },
    include: { plan: true },
  });
  if (!member?.plan || member.plan.isDeleted !== 0) {
    return { plan: null, quotaRemaining: 0 };
  }
  let used = member.quotaUsed;
  if (member.plan.resetPeriodDays > 0 && member.cycleStart) {
    const elapsed = Math.floor((Date.now() - member.cycleStart.getTime()) / 86_400_000);
    if (elapsed >= member.plan.resetPeriodDays) used = 0;
  }
  return {
    plan: {
      includedCourtBookings: member.plan.includedCourtBookings,
      courtDiscountPct: member.plan.courtDiscountPct,
    },
    quotaRemaining: Math.max(0, member.plan.includedCourtBookings - used),
  };
}

const fmtHour = (h: number, frac = 0) => {
  const totalMin = h * 60 + frac;
  const hh = Math.floor(totalMin / 60) % 24;
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/** Price a multi-session selection WITHOUT persisting (live preview). */
export async function previewMyBookingAction(
  input: CreateMyBookingInput,
): Promise<PreviewMyBookingResult> {
  const empty: PreviewMyBookingResult = {
    success: false,
    lines: [],
    subtotal: 0,
    quotaSavings: 0,
    discountSavings: 0,
    totalSavings: 0,
    payable: 0,
    quotaRemaining: 0,
    quotaRemainingAfter: 0,
  };

  const session = await requireMemberSession();
  if (!session) return { ...empty, error: "Sesi tidak valid." };
  if (!input.sessions || input.sessions.length === 0) {
    return { ...empty, error: "Belum ada sesi yang dipilih." };
  }

  const db = await getTenantDb(session.dbConfig);

  const priced: PricedSession[] = [];
  for (const s of input.sessions) {
    const r = await priceOneSession(db, session.companyId, s);
    if (typeof r === "string") return { ...empty, error: r };
    priced.push(r);
  }

  const { plan, quotaRemaining } = await resolveBenefitInputs(db, session.companyId, session.id);
  const benefit = calcMembershipBenefit({
    plan,
    quotaRemaining,
    sessions: priced.map((p) => ({ basePrice: p.basePrice })),
  });

  const lines: PreviewLine[] = priced.map((p, i) => {
    const ln = benefit.sessions[i];
    const endFrac = Math.round((p.durationHours % 1) * 60);
    return {
      courtId: p.courtId,
      courtName: p.courtName,
      dateKey: p.dateKey,
      startHour: p.startHour,
      durationHours: p.durationHours,
      label: `${fmtHour(p.startHour)}–${fmtHour(p.startHour + Math.floor(p.durationHours), endFrac)}`,
      basePrice: p.basePrice,
      coveredByQuota: ln.coveredByQuota,
      discountPct: ln.discountPct,
      payable: ln.payable,
    };
  });

  return {
    success: true,
    lines,
    subtotal: benefit.subtotal,
    quotaSavings: benefit.quotaSavings,
    discountSavings: benefit.discountSavings,
    totalSavings: benefit.totalSavings,
    payable: benefit.payable,
    quotaRemaining,
    quotaRemainingAfter: benefit.quotaRemainingAfter,
  };
}

/** Create a (possibly multi-session) member booking. Status = confirmed. */
export async function createMyBookingAction(
  input: CreateMyBookingInput,
): Promise<CreateMyBookingResult> {
  const guard = await requirePermission("portal.book", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  if (session.role !== "member") {
    return { success: false, error: "Hanya member yang dapat melakukan booking ini." };
  }

  // Cash is staff-only — reject anything that isn't an allowed member method.
  if (!MEMBER_PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { success: false, error: "Metode pembayaran tidak tersedia untuk member." };
  }
  if (!input.sessions || input.sessions.length === 0) {
    return { success: false, error: "Belum ada sesi yang dipilih." };
  }

  const db = await getTenantDb(session.dbConfig);

  const member = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
  });
  if (!member) return { success: false, error: "Member tidak ditemukan." };

  // Price every requested session (validates court / window / future).
  const checkoutBookings: CheckoutBookingInput[] = [];
  for (const s of input.sessions) {
    const r = await priceOneSession(db, session.companyId, s);
    if (typeof r === "string") return { success: false, error: r };
    checkoutBookings.push({
      courtId: r.courtId,
      start: r.start.toISOString(),
      end: r.end.toISOString(),
      partySize: r.partySize,
      basePrice: r.basePrice,
    });
  }

  const result = await runCheckout(db, {
    companyId: session.companyId,
    actor: { kind: "member", userId: session.userId },
    method: input.paymentMethod,
    memberId: member.id,
    customerName: member.name,
    bookings: checkoutBookings,
  });

  if (!result.success) return { success: false, error: result.error };

  revalidatePath("/me/book");
  revalidatePath("/me/bookings");
  revalidatePath("/me/checkin");
  revalidatePath("/bookings");
  return {
    success: true,
    id: result.bookingId,
    paymentRef: result.paymentRef,
    payable: result.courtAmount,
    coveredCount: result.fullyCoveredByQuota ? input.sessions.length : undefined,
  };
}

/** Member cancels one of their own future, not-yet-cancelled sessions. No
 * monetary refund (out of scope); quota is restored and the slot freed. */
export async function cancelMyBookingAction(
  detailId: string,
): Promise<CancelMyBookingResult> {
  const guard = await requirePermission("portal.bookings", "cancel");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  if (session.role !== "member") {
    return { success: false, error: "Tidak diizinkan." };
  }

  const db = await getTenantDb(session.dbConfig);

  const detail = await db.t_booking_detail.findFirst({
    where: { id: detailId, companyId: session.companyId, isDeleted: 0 },
    include: { booking: true },
  });
  if (!detail || !detail.booking) {
    return { success: false, error: "Booking tidak ditemukan." };
  }
  // Own-account only.
  if (detail.booking.memberId !== session.id) {
    return { success: false, error: "Anda hanya bisa membatalkan booking sendiri." };
  }
  if (detail.status === "cancelled") {
    return { success: false, error: "Sesi ini sudah dibatalkan." };
  }
  if (detail.start.getTime() <= Date.now()) {
    return { success: false, error: "Tidak bisa membatalkan sesi yang sudah lewat atau berjalan." };
  }

  const wasQuotaCovered = detail.rateNote === "free (quota)";

  try {
    await db.$transaction(async (tx) => {
      const cancelled = await tx.t_booking_detail.updateMany({
        where: { id: detail.id, status: { not: "cancelled" } },
        data: { status: "cancelled", ...auditUpdate(session.userId) },
      });
      if (cancelled.count !== 1) throw new Error("ALREADY_CANCELLED");

      // If all sibling lines are now cancelled, cancel the header too.
      const siblings = await tx.t_booking_detail.findMany({
        where: { bookingId: detail.bookingId, isDeleted: 0 },
        select: { id: true, status: true },
      });
      const allCancelled = siblings.every(
        (s) => s.status === "cancelled" || s.id === detail.id,
      );
      if (allCancelled) {
        await tx.t_booking.update({
          where: { id: detail.bookingId },
          data: { status: "cancelled", ...auditUpdate(session.userId) },
        });
      }

      // Restore quota (−1, floor 0) when this session was quota-covered.
      if (wasQuotaCovered && detail.booking!.memberId) {
        await tx.t_member.updateMany({
          where: {
            id: detail.booking!.memberId,
            companyId: session.companyId,
            quotaUsed: { gt: 0 },
            ...NOT_DELETED,
          },
          data: {
            quotaUsed: { decrement: 1 },
            ...auditUpdate(session.userId),
          },
        });
        await tx.t_booking.updateMany({
          where: {
            id: detail.bookingId,
            companyId: session.companyId,
            quotaConsumed: { gt: 0 },
            ...NOT_DELETED,
          },
          data: {
            quotaConsumed: { decrement: 1 },
            ...auditUpdate(session.userId),
          },
        });
      }
    });

    revalidatePath("/me/bookings");
    revalidatePath("/me/book");
    revalidatePath("/me/checkin");
    revalidatePath("/bookings");
    return { success: true };
  } catch (err) {
    console.error("[cancelMyBookingAction] error:", err);
    return { success: false, error: "Gagal membatalkan booking." };
  }
}
