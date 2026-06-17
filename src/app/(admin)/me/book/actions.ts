"use server";

// PadelHub — member self-service booking actions (DB-backed). The acting member
// is resolved from the session (role === "member", id === t_member.id). No
// member-picker step (it's always "me"), and NO cash payment (cash must go
// through staff at the desk) — only non-cash methods (QRIS / Transfer).

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { calcMembershipBenefit } from "@/lib/membership-benefit";
import {
  MEMBER_PAYMENT_METHODS,
  STORAGE_SLOT_MINUTES,
  SLOTS_PER_DAY,
  type DaySchedule,
  type MeBookData,
  type MeCourt,
  type MeBookedSlot,
  type MeMembership,
  type CreateMyBookingInput,
  type CreateMyBookingResult,
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

  const m = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    include: { plan: true },
  });

  let membership: MeMembership = {
    planName: null,
    quotaRemaining: 0,
    quotaTotal: 0,
    courtDiscountPct: 0,
    resetAt: null,
  };
  if (m?.plan && m.plan.isDeleted === 0) {
    let used = m.quotaUsed;
    let resetAt: string | null = null;
    if (m.plan.resetPeriodDays > 0 && m.cycleStart) {
      const elapsedDays = Math.floor((Date.now() - m.cycleStart.getTime()) / 86_400_000);
      if (elapsedDays >= m.plan.resetPeriodDays) used = 0;
      const next = new Date(m.cycleStart);
      next.setDate(next.getDate() + m.plan.resetPeriodDays);
      resetAt = next.toISOString().slice(0, 10);
    }
    membership = {
      planName: m.plan.name,
      quotaRemaining: Math.max(0, m.plan.includedCourtBookings - used),
      quotaTotal: m.plan.includedCourtBookings,
      courtDiscountPct: m.plan.courtDiscountPct,
      resetAt,
    };
  }

  return { courts, membership };
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

/** Create a court booking for the logged-in member. Status = confirmed. */
export async function createMyBookingAction(
  input: CreateMyBookingInput,
): Promise<CreateMyBookingResult> {
  const session = await requireMemberSession();
  if (!session) return { success: false, error: "Sesi tidak valid." };

  // Cash is staff-only — reject anything that isn't an allowed member method.
  if (!MEMBER_PAYMENT_METHODS.includes(input.paymentMethod)) {
    return { success: false, error: "Metode pembayaran tidak tersedia untuk member." };
  }
  if (input.durationHours <= 0 || input.startHour < 0 || input.startHour > 23) {
    return { success: false, error: "Waktu booking tidak valid." };
  }

  const db = await getTenantDb(session.dbConfig);

  const court = await db.m_court.findFirst({
    where: { id: input.courtId, companyId: session.companyId, status: "active", ...NOT_DELETED },
  });
  if (!court) return { success: false, error: "Lapangan tidak ditemukan." };

  const schedule = (court.schedule as unknown as DaySchedule[]) ?? [];
  const start = new Date(`${input.dateKey}T${String(input.startHour).padStart(2, "0")}:00:00`);
  const durMin = Math.round(input.durationHours * 60);
  const end = new Date(start.getTime() + durMin * 60_000);

  if (start.getTime() < Date.now()) {
    return { success: false, error: "Tidak bisa booking di waktu yang sudah lewat." };
  }

  const daySched = schedule.find((s) => s.day === start.getDay());
  if (!daySched || !daySched.available) {
    return { success: false, error: "Lapangan tutup di hari tersebut." };
  }
  const startSlot = input.startHour * 2;
  const slotSpan = Math.ceil(durMin / STORAGE_SLOT_MINUTES);
  let basePrice = 0;
  for (let i = 0; i < slotSpan; i++) {
    const slot = startSlot + i;
    if (slot >= SLOTS_PER_DAY) return { success: false, error: "Durasi melebihi jam operasional." };
    const rate = daySched.slots[slot];
    if (rate === "closed" || !rate) {
      return { success: false, error: "Sebagian jam berada di luar jam operasional." };
    }
    const hourPrice = rate === "peak" ? court.pricePeak : court.priceOffPeak;
    basePrice += (hourPrice * STORAGE_SLOT_MINUTES) / 60;
  }
  basePrice = Math.round(basePrice);

  // Overlap guard.
  const dayStart = new Date(`${input.dateKey}T00:00:00`);
  const dayEnd = new Date(`${input.dateKey}T23:59:59`);
  const existing = await db.t_booking_detail.findMany({
    where: {
      companyId: session.companyId,
      courtId: input.courtId,
      isDeleted: 0,
      status: { not: "cancelled" },
      start: { gte: dayStart, lte: dayEnd },
    },
    select: { start: true, end: true },
  });
  const wantStart = start.getTime();
  const wantEnd = end.getTime();
  const clash = existing.some(
    (e) => e.start.getTime() < wantEnd && e.end.getTime() > wantStart,
  );
  if (clash) {
    return { success: false, error: "Slot sudah ter-booking. Pilih waktu lain." };
  }

  // Membership benefit pricing.
  const member = await db.t_member.findFirst({
    where: { id: session.id, companyId: session.companyId, ...NOT_DELETED },
    include: { plan: true },
  });
  if (!member) return { success: false, error: "Member tidak ditemukan." };

  let plan: { includedCourtBookings: number; courtDiscountPct: number } | null = null;
  let quotaRemaining = 0;
  if (member.plan && member.plan.isDeleted === 0) {
    let used = member.quotaUsed;
    if (member.plan.resetPeriodDays > 0 && member.cycleStart) {
      const elapsed = Math.floor((Date.now() - member.cycleStart.getTime()) / 86_400_000);
      if (elapsed >= member.plan.resetPeriodDays) used = 0;
    }
    plan = {
      includedCourtBookings: member.plan.includedCourtBookings,
      courtDiscountPct: member.plan.courtDiscountPct,
    };
    quotaRemaining = Math.max(0, member.plan.includedCourtBookings - used);
  }

  const benefit = calcMembershipBenefit({ plan, quotaRemaining, sessions: [{ basePrice }] });
  const line = benefit.sessions[0];
  const payable = line.payable;
  const quotaConsumed = line.coveredByQuota ? 1 : 0;

  try {
    const header = await db.t_booking.create({
      data: {
        companyId: session.companyId,
        memberId: member.id,
        type: "member",
        status: "confirmed",
        customer: member.name,
        paymentMethod: input.paymentMethod,
        totalPrice: payable,
        joinFee: 0,
        quotaConsumed,
        note: null,
        ...auditCreate(session.userId),
        details: {
          create: [
            {
              companyId: session.companyId,
              courtId: court.id,
              start,
              end,
              partySize: Math.max(2, Math.min(4, input.partySize || 4)),
              basePrice,
              price: payable,
              rateNote: line.coveredByQuota
                ? "free (quota)"
                : line.discountPct > 0
                  ? "discount"
                  : "regular",
              status: "confirmed",
              ...auditCreate(session.userId),
            },
          ],
        },
      },
    });

    if (quotaConsumed > 0) {
      await db.t_member.update({
        where: { id: member.id },
        data: { quotaUsed: { increment: quotaConsumed }, ...auditUpdate(session.userId) },
      });
    }

    revalidatePath("/me/book");
    revalidatePath("/me/bookings");
    revalidatePath("/me/checkin");
    revalidatePath("/bookings");
    return { success: true, id: header.id, payable, coveredByQuota: line.coveredByQuota };
  } catch (err) {
    console.error("[createMyBookingAction] error:", err);
    return { success: false, error: "Gagal menyimpan booking." };
  }
}
