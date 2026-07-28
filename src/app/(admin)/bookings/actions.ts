"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { requirePermission } from "@/lib/access-guard";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/tenant-client";
import { calcMembershipBenefit } from "@/lib/membership-benefit";
import { resolveMembershipQuotaCycle } from "@/lib/membership-quota";
import {
  BOOKING_SLOT_MINUTES,
  STORAGE_SLOT_MINUTES,
  STORAGE_SLOTS_PER_SESSION,
  areSlotsConsecutive,
  availabilityRangeForCandidateSlot,
  dateKeyInTimeZone,
  intervalsOverlap,
  isValidDateKey,
  isSlotPast,
  localBookingDate,
  normalizeSelectedSlots,
  selectedSlotsToRange,
  slotLabel,
  weekdayForDateKey,
} from "@/lib/booking-flow";

type RateType = "regular" | "peak" | "closed";
type DaySchedule = { day: number; available: boolean; slots: RateType[] };

export type BookingTimeSlot = {
  id: string;
  startSlot: number;
  startTime: string;
  endTime: string;
  available: boolean;
  past: boolean;
  courtCount: number;
};

export type AvailableBookingCourt = {
  id: string;
  name: string;
  code?: string;
  image: string | null;
  environment: string;
  format: string;
  color: string;
  price: number;
  pricePerHour: number;
  available: true;
};

export type BookingAvailabilityResult = {
  success: boolean;
  data?: {
    dateKey: string;
    slots: BookingTimeSlot[];
    selectedStartTime?: string;
    selectedEndTime?: string;
    durationMinutes?: number;
    courts: AvailableBookingCourt[];
  };
  error?: {
    code:
      | "INVALID_DATE"
      | "INVALID_SLOT"
      | "NON_CONSECUTIVE_SLOT"
      | "NO_AVAILABLE_COURT"
      | "INTERNAL_ERROR";
    message: string;
  };
};

const BLOCKING_BOOKING_STATUSES = [
  "confirmed",
  "pending",
  "checked_in",
  "completed",
];

function rateForSlot(schedule: DaySchedule[], day: number, slot: number): RateType {
  const current = schedule.find((item) => item.day === day);
  if (!current?.available) return "closed";
  return current.slots[slot] ?? "closed";
}

function rangeIsOpen(schedule: DaySchedule[], day: number, startSlot: number, endSlot: number) {
  for (let slot = startSlot; slot < endSlot; slot++) {
    if (rateForSlot(schedule, day, slot) === "closed") return false;
  }
  return true;
}

function rangePrice(
  court: { priceOffPeak: number; pricePeak: number; schedule: Prisma.JsonValue },
  day: number,
  startSlot: number,
  endSlot: number,
): number {
  const schedule = court.schedule as unknown as DaySchedule[];
  let total = 0;
  for (let slot = startSlot; slot < endSlot; slot++) {
    const rate = rateForSlot(schedule, day, slot);
    if (rate === "closed") return -1;
    total +=
      (rate === "peak" ? court.pricePeak : court.priceOffPeak) *
      (STORAGE_SLOT_MINUTES / 60);
  }
  return Math.round(total);
}

/** Date -> selectable 60-minute slots -> courts free for every selected slot. */
export async function getBookingAvailabilityAction(input: {
  dateKey: string;
  selectedSlots?: number[];
}): Promise<BookingAvailabilityResult> {
  const guard = await requirePermission("booking.new", "create");
  if (!guard.ok) {
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: guard.error },
    };
  }

  const { session } = guard;
  const selectedSlots = normalizeSelectedSlots(input.selectedSlots ?? []);
  if (!isValidDateKey(input.dateKey) || input.dateKey < dateKeyInTimeZone()) {
    return {
      success: false,
      error: {
        code: "INVALID_DATE",
        message: "Tanggal booking tidak boleh berada di masa lalu.",
      },
    };
  }
  if (
    selectedSlots.length !== (input.selectedSlots ?? []).length ||
    (selectedSlots.length > 0 && !areSlotsConsecutive(selectedSlots))
  ) {
    return {
      success: false,
      error: {
        code: "NON_CONSECUTIVE_SLOT",
        message: "Pilih slot waktu yang berurutan untuk membuat satu booking.",
      },
    };
  }

  try {
    const db = await getTenantDb(session.dbConfig);
    const day = weekdayForDateKey(input.dateKey);
    const dayStart = localBookingDate(input.dateKey, 0);
    const dayEnd = localBookingDate(input.dateKey, 48);

    const [courts, bookingWindows, maintenanceWindows] = await Promise.all([
      db.m_court.findMany({
        where: {
          companyId: session.companyId,
          status: "active",
          ...NOT_DELETED,
        },
        orderBy: { name: "asc" },
      }),
      db.t_booking_detail.findMany({
        where: {
          companyId: session.companyId,
          isDeleted: 0,
          status: { in: BLOCKING_BOOKING_STATUSES },
          start: { lt: dayEnd },
          end: { gt: dayStart },
        },
        select: { courtId: true, start: true, end: true },
      }),
      db.t_court_maintenance.findMany({
        where: {
          companyId: session.companyId,
          isDeleted: 0,
          start: { lt: dayEnd },
          end: { gt: dayStart },
        },
        select: { courtId: true, start: true, end: true },
      }),
    ]);

    const windows = [...bookingWindows, ...maintenanceWindows];
    const isToday = input.dateKey === dateKeyInTimeZone();
    const overlapsWindow = (courtId: string, start: Date, end: Date) =>
      windows.some(
        (window) =>
          window.courtId === courtId &&
          intervalsOverlap(window.start, window.end, start, end),
      );
    const countAvailableCourts = (startSlot: number, endSlot: number) => {
      const start = localBookingDate(input.dateKey, startSlot);
      const end = localBookingDate(input.dateKey, endSlot);
      return courts.filter((court) => {
        const schedule = court.schedule as unknown as DaySchedule[];
        return (
          rangeIsOpen(schedule, day, startSlot, endSlot) &&
          !overlapsWindow(court.id, start, end)
        );
      }).length;
    };

    const slotStarts = Array.from(
      { length: 24 / (BOOKING_SLOT_MINUTES / 60) },
      (_, index) => index * STORAGE_SLOTS_PER_SESSION,
    );
    const slots: BookingTimeSlot[] = slotStarts.map((startSlot) => {
      const endSlot = startSlot + STORAGE_SLOTS_PER_SESSION;
      const past = isToday && isSlotPast(input.dateKey, startSlot);
      const availabilityRange = availabilityRangeForCandidateSlot(
        selectedSlots,
        startSlot,
      );
      const courtCount = past
        ? 0
        : countAvailableCourts(
            availabilityRange?.startSlot ?? startSlot,
            availabilityRange?.endSlot ?? endSlot,
          );
      return {
        id: String(startSlot),
        startSlot,
        startTime: slotLabel(startSlot),
        endTime: slotLabel(endSlot),
        available: courtCount > 0,
        past,
        courtCount,
      };
    });

    const selectedRange = selectedSlotsToRange(selectedSlots);
    const availableCourts: AvailableBookingCourt[] = selectedRange
      ? courts.flatMap((court) => {
          const start = localBookingDate(input.dateKey, selectedRange.startSlot);
          const end = localBookingDate(input.dateKey, selectedRange.endSlot);
          const price = rangePrice(
            court,
            day,
            selectedRange.startSlot,
            selectedRange.endSlot,
          );
          if (price < 0 || overlapsWindow(court.id, start, end)) return [];
          return [
            {
              id: court.id,
              name: court.name,
              image: court.image,
              environment: court.environment,
              format: court.format,
              color: court.color,
              price,
              pricePerHour: Math.round(
                price / (selectedSlots.length || 1),
              ),
              available: true as const,
            },
          ];
        })
      : [];

    return {
      success: true,
      data: {
        dateKey: input.dateKey,
        slots,
        ...(selectedRange && {
          selectedStartTime: slotLabel(selectedRange.startSlot),
          selectedEndTime: slotLabel(selectedRange.endSlot),
          durationMinutes: selectedSlots.length * BOOKING_SLOT_MINUTES,
        }),
        courts: availableCourts,
      },
      ...(selectedRange &&
        availableCourts.length === 0 && {
          error: {
            code: "NO_AVAILABLE_COURT" as const,
            message:
              "Tidak ada lapangan yang tersedia untuk seluruh waktu yang dipilih. Silakan pilih waktu lain.",
          },
        }),
    };
  } catch (error) {
    console.error("[getBookingAvailabilityAction] error:", error);
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Gagal memuat ketersediaan lapangan. Silakan coba kembali.",
      },
    };
  }
}

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
  const guard = await requirePermission("booking.new", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  if (!input.details.length) {
    return { success: false, error: "Belum ada slot booking yang dipilih." };
  }
  if (input.status !== "confirmed") {
    return { success: false, error: "Status booking tidak valid." };
  }

  const parsedDetails = input.details.map((detail) => ({
    ...detail,
    startDate: new Date(detail.start),
    endDate: new Date(detail.end),
  }));
  if (
    parsedDetails.some(
      (detail) =>
        !detail.courtId ||
        Number.isNaN(detail.startDate.getTime()) ||
        Number.isNaN(detail.endDate.getTime()) ||
        detail.endDate <= detail.startDate ||
        detail.endDate.getTime() - detail.startDate.getTime() !==
          BOOKING_SLOT_MINUTES * 60_000,
    )
  ) {
    return { success: false, error: "Slot booking tidak valid." };
  }
  if (parsedDetails.some((detail) => detail.startDate.getTime() <= Date.now())) {
    return { success: false, error: "Tidak bisa booking waktu yang sudah lewat." };
  }
  for (let index = 0; index < parsedDetails.length; index++) {
    for (let other = index + 1; other < parsedDetails.length; other++) {
      const left = parsedDetails[index];
      const right = parsedDetails[other];
      if (
        left.courtId === right.courtId &&
        left.startDate < right.endDate &&
        left.endDate > right.startDate
      ) {
        return { success: false, error: "Pilihan waktu saling overlap." };
      }
    }
  }

  const db = await getTenantDb(session.dbConfig);
  const memberId = opts?.memberId ?? input.memberId ?? null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const header = await db.$transaction(
        async (tx) => {
          const courtIds = [...new Set(parsedDetails.map((detail) => detail.courtId))];
          const courts = await tx.m_court.findMany({
            where: {
              id: { in: courtIds },
              companyId: session.companyId,
              status: "active",
              ...NOT_DELETED,
            },
          });
          if (courts.length !== courtIds.length) {
            throw new Error("COURT_UNAVAILABLE");
          }
          const courtById = new Map(courts.map((court) => [court.id, court]));

          const priced = parsedDetails.map((detail) => {
            const court = courtById.get(detail.courtId);
            if (!court) throw new Error("COURT_UNAVAILABLE");
            const startSlot =
              detail.startDate.getHours() * 2 +
              (detail.startDate.getMinutes() >= 30 ? 1 : 0);
            const endSlot =
              detail.endDate.getHours() * 2 +
              (detail.endDate.getMinutes() >= 30 ? 1 : 0);
            const effectiveEndSlot = endSlot > startSlot ? endSlot : 48;
            const basePrice = rangePrice(
              court,
              detail.startDate.getDay(),
              startSlot,
              effectiveEndSlot,
            );
            if (basePrice < 0) throw new Error("COURT_CLOSED");
            return { ...detail, court, basePrice };
          });

          const conflictWhere = priced.map((detail) => ({
            courtId: detail.courtId,
            start: { lt: detail.endDate },
            end: { gt: detail.startDate },
          }));
          const [bookingConflict, maintenanceConflict] = await Promise.all([
            tx.t_booking_detail.findFirst({
              where: {
                companyId: session.companyId,
                isDeleted: 0,
                status: { in: BLOCKING_BOOKING_STATUSES },
                OR: conflictWhere,
              },
              select: { id: true },
            }),
            tx.t_court_maintenance.findFirst({
              where: {
                companyId: session.companyId,
                isDeleted: 0,
                OR: conflictWhere,
              },
              select: { id: true },
            }),
          ]);
          if (bookingConflict || maintenanceConflict) {
            throw new Error("BOOKING_CONFLICT");
          }

          const member = memberId
            ? await tx.t_member.findFirst({
                where: {
                  id: memberId,
                  companyId: session.companyId,
                  ...NOT_DELETED,
                },
                include: { plan: true },
              })
            : null;
          if (memberId && !member) throw new Error("MEMBER_NOT_FOUND");

          let quotaRemaining = 0;
          let plan: {
            includedCourtBookings: number;
            courtDiscountPct: number;
          } | null = null;
          let joinFee = 0;
          let shouldStartNewQuotaCycle = false;
          if (member?.plan && member.plan.isDeleted === 0) {
            const quotaCycle = resolveMembershipQuotaCycle({
              quotaUsed: member.quotaUsed,
              cycleStart: member.cycleStart,
              resetPeriodDays: member.plan.resetPeriodDays,
            });
            shouldStartNewQuotaCycle = quotaCycle.shouldStartNewCycle;
            plan = {
              includedCourtBookings: member.plan.includedCourtBookings,
              courtDiscountPct: member.plan.courtDiscountPct,
            };
            quotaRemaining = Math.max(
              0,
              member.plan.includedCourtBookings -
                quotaCycle.effectiveQuotaUsed,
            );
            joinFee = member.joinFeePaid ? 0 : member.plan.joinFee;
          }

          const benefit = calcMembershipBenefit({
            plan,
            quotaRemaining,
            sessions: priced.map((detail) => ({ basePrice: detail.basePrice })),
            joinFee,
          });
          const priceChanged = priced.some(
            (detail, index) =>
              input.details[index].basePrice !== detail.basePrice ||
              input.details[index].price !== benefit.sessions[index].payable,
          );
          if (priceChanged || Math.max(0, opts?.joinFee ?? 0) !== joinFee) {
            throw new Error("PRICE_CHANGED");
          }

          const created = await tx.t_booking.create({
            data: {
              companyId: session.companyId,
              memberId,
              type: input.type,
              status: "confirmed",
              customer: member?.name ?? input.customer.trim(),
              paymentMethod: input.paymentMethod ?? null,
              totalPrice: benefit.grandTotal,
              joinFee,
              quotaConsumed: benefit.quotaCoveredCount,
              note:
                input.note ??
                (joinFee > 0 ? `Termasuk join fee ${joinFee}` : null),
              ...auditCreate(session.userId),
              details: {
                create: priced.map((detail, index) => ({
                  companyId: session.companyId,
                  courtId: detail.courtId,
                  start: detail.startDate,
                  end: detail.endDate,
                  partySize: Math.max(2, Math.min(4, detail.partySize || 4)),
                  basePrice: detail.basePrice,
                  price: benefit.sessions[index].payable,
                  rateNote: benefit.sessions[index].coveredByQuota
                    ? "free (quota)"
                    : benefit.sessions[index].discountPct > 0
                      ? "discount"
                      : detail.rateNote ?? "regular",
                  status: "confirmed",
                  note: detail.note ?? null,
                  ...auditCreate(session.userId),
                })),
              },
            },
          });

          if (member && (benefit.quotaCoveredCount > 0 || joinFee > 0)) {
            await tx.t_member.update({
              where: { id: member.id },
              data: {
                ...(benefit.quotaCoveredCount > 0 && {
                  quotaUsed: shouldStartNewQuotaCycle
                    ? benefit.quotaCoveredCount
                    : { increment: benefit.quotaCoveredCount },
                  ...(shouldStartNewQuotaCycle && { cycleStart: new Date() }),
                }),
                ...(joinFee > 0 && { joinFeePaid: true }),
                ...auditUpdate(session.userId),
              },
            });
          }
          return created;
        },
        { isolationLevel: "Serializable" },
      );

      revalidatePath("/bookings");
      return { success: true, id: header.id };
    } catch (err) {
      const code =
        typeof err === "object" && err && "code" in err
          ? String((err as { code?: unknown }).code)
          : "";
      if (code === "P2034" && attempt < 2) continue;
      const message = err instanceof Error ? err.message : "";
      if (message === "BOOKING_CONFLICT" || code === "P2034") {
        return {
          success: false,
          error:
            "Lapangan tersebut baru saja dipesan oleh pengguna lain. Silakan pilih lapangan atau waktu lain.",
        };
      }
      if (message === "PRICE_CHANGED") {
        return {
          success: false,
          error: "Harga booking berubah. Silakan kembali dan pilih ulang waktu.",
        };
      }
      if (message === "COURT_UNAVAILABLE" || message === "COURT_CLOSED") {
        return {
          success: false,
          error: "Lapangan sudah tidak aktif atau jadwalnya telah berubah.",
        };
      }
      if (message === "MEMBER_NOT_FOUND") {
        return { success: false, error: "Member tidak ditemukan." };
      }
      console.error("[createBookingsAction] error:", err);
      return { success: false, error: "Gagal menyimpan booking." };
    }
  }
  return { success: false, error: "Gagal menyimpan booking." };
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
  const db = await getTenantDb(session.dbConfig);
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
  const db = await getTenantDb(session.dbConfig);

  try {
    await db.$transaction(async (tx) => {
      const detail = await tx.t_booking_detail.findFirst({
        where: { id, companyId: session.companyId, ...NOT_DELETED },
        include: { booking: true },
      });
      if (!detail?.booking) throw new Error("BOOKING_NOT_FOUND");
      if (detail.status === "cancelled") throw new Error("ALREADY_CANCELLED");

      const cancelled = await tx.t_booking_detail.updateMany({
        where: { id: detail.id, status: { not: "cancelled" } },
        data: { status: "cancelled", ...auditUpdate(session.userId) },
      });
      if (cancelled.count !== 1) throw new Error("ALREADY_CANCELLED");

      const wasQuotaCovered = detail.rateNote === "free (quota)";
      if (wasQuotaCovered && detail.booking.memberId) {
        await tx.t_member.updateMany({
          where: {
            id: detail.booking.memberId,
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

      const activeSibling = await tx.t_booking_detail.findFirst({
        where: {
          bookingId: detail.bookingId,
          id: { not: detail.id },
          status: { not: "cancelled" },
          ...NOT_DELETED,
        },
        select: { id: true },
      });
      if (!activeSibling) {
        await tx.t_booking.update({
          where: { id: detail.bookingId },
          data: { status: "cancelled", ...auditUpdate(session.userId) },
        });
      }
    });

    revalidatePath("/bookings");
    revalidatePath("/me/book");
    revalidatePath("/me/bookings");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "BOOKING_NOT_FOUND") {
      return { success: false, error: "Booking tidak ditemukan." };
    }
    if (message === "ALREADY_CANCELLED") {
      return { success: false, error: "Sesi ini sudah dibatalkan." };
    }
    console.error("[cancelBookingAction] error:", err);
    return { success: false, error: "Gagal membatalkan booking." };
  }
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
