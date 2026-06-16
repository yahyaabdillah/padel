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

/** Persist one or more bookings for the current tenant. */
export async function createBookingsAction(
  bookings: CreateBookingInput[],
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

    revalidatePath("/bookings");
    return { success: true, ids };
  } catch (err) {
    console.error("[createBookingsAction] error:", err);
    return { success: false, error: "Gagal menyimpan booking." };
  }
}

export type BookingMember = { id: string; name: string; phone: string; tier: string };

/** Resolve a single member (for the payment summary). */
export async function getMemberByIdAction(
  id: string,
): Promise<BookingMember | null> {
  const session = await requireSession();
  if (!session) return null;
  const db = await getTenantDb();
  const m = await db.m_member.findFirst({
    where: { id, companyId: session.companyId, isDeleted: 0 },
    select: { id: true, name: true, phone: true, tier: true },
  });
  return m ? { id: m.id, name: m.name, phone: m.phone, tier: m.tier } : null;
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
