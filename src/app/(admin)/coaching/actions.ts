"use server";

import { cookies } from "next/headers";
import { getTenantDb } from "@/lib/tenant-db";
import { SESSION_COOKIE_NAME } from "@/lib/env";
import type { AuthSession } from "@/lib/auth-types";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { requirePermission } from "@/lib/access-guard";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/tenant-client";
import {
  type CoachAvailability,
  type CoachAvailabilityInput,
  type CoachingCycle,
  type PlannedSlot,
  assignCoachForSlot,
  generateSlots,
  localIso,
  makeDefaultAvailability,
  normalizeAvailability,
} from "@/lib/coaching";

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

const pad = (n: number) => String(n).padStart(2, "0");
const local = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:00`;

/* ════════════════════════════════════════════════════════
 *  COACHES
 * ════════════════════════════════════════════════════════ */

export type CoachRecord = {
  id: string;
  name: string;
  level: string;
  status: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  color: string;
  ratePerHour: number;
  specialties: string[];
  bio: string | null;
  availability: CoachAvailability[];
};

export type CoachInput = {
  name: string;
  level: string;
  status: string;
  phone?: string;
  email?: string;
  color: string;
  ratePerHour: number;
  specialties: string[];
  bio?: string;
  availability: CoachAvailability[];
};

export async function getCoachesAction(): Promise<CoachRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.m_coach.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    status: c.status,
    phone: c.phone,
    email: c.email,
    avatar: c.avatar,
    color: c.color,
    ratePerHour: c.ratePerHour,
    specialties: Array.isArray(c.specialties) ? (c.specialties as string[]) : [],
    bio: c.bio,
    availability: normalizeAvailability(c.availability),
  }));
}

export async function createCoachAction(
  input: CoachInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const guard = await requirePermission("coaching.coaches", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  if (!input.name.trim()) return { success: false, error: "Nama coach wajib diisi." };
  const db = await getTenantDb();
  const created = await db.m_coach.create({
    data: {
      companyId: session.companyId,
      name: input.name.trim(),
      level: input.level,
      status: input.status,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      color: input.color,
      ratePerHour: input.ratePerHour,
      specialties: input.specialties as Prisma.InputJsonValue,
      bio: input.bio?.trim() || null,
      availability: (input.availability ?? makeDefaultAvailability()) as unknown as Prisma.InputJsonValue,
      ...auditCreate(session.userId),
    },
  });
  revalidatePath("/coaching/coaches");
  return { success: true, id: created.id };
}

export async function updateCoachAction(
  id: string,
  patch: Partial<CoachInput>,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("coaching.coaches", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.m_coach.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.level !== undefined && { level: patch.level }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.phone !== undefined && { phone: patch.phone.trim() || null }),
      ...(patch.email !== undefined && { email: patch.email.trim() || null }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.ratePerHour !== undefined && { ratePerHour: patch.ratePerHour }),
      ...(patch.specialties !== undefined && {
        specialties: patch.specialties as Prisma.InputJsonValue,
      }),
      ...(patch.bio !== undefined && { bio: patch.bio.trim() || null }),
      ...(patch.availability !== undefined && {
        availability: patch.availability as unknown as Prisma.InputJsonValue,
      }),
      ...auditUpdate(session.userId),
    },
  });
  revalidatePath("/coaching/coaches");
  return { success: true };
}

export async function deleteCoachAction(id: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("coaching.coaches", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.m_coach.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/coaching/coaches");
  return { success: true };
}

/* ════════════════════════════════════════════════════════
 *  PACKAGES
 * ════════════════════════════════════════════════════════ */

export type PackageRecord = {
  id: string;
  name: string;
  sessions: number;
  durationMin: number;
  price: number;
  color: string;
  note: string | null;
  active: boolean;
  sortOrder: number;
};

export type PackageInput = Omit<PackageRecord, "id">;

export async function getCoachPackagesAction(
  opts?: { activeOnly?: boolean },
): Promise<PackageRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.m_coach_package.findMany({
    where: {
      companyId: session.companyId,
      ...(opts?.activeOnly ? { active: true } : {}),
      ...NOT_DELETED,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    sessions: p.sessions,
    durationMin: p.durationMin,
    price: p.price,
    color: p.color,
    note: p.note,
    active: p.active,
    sortOrder: p.sortOrder,
  }));
}

export async function createCoachPackageAction(
  input: PackageInput,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const guard = await requirePermission("coaching.packages", "create");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  if (!input.name.trim()) return { success: false, error: "Nama paket wajib diisi." };
  if (input.sessions < 1) return { success: false, error: "Jumlah sesi minimal 1." };
  const db = await getTenantDb();
  const created = await db.m_coach_package.create({
    data: {
      companyId: session.companyId,
      name: input.name.trim(),
      sessions: input.sessions,
      durationMin: input.durationMin,
      price: input.price,
      color: input.color,
      note: input.note?.trim() || null,
      active: input.active,
      sortOrder: input.sortOrder,
      ...auditCreate(session.userId),
    },
  });
  revalidatePath("/coaching/packages");
  return { success: true, id: created.id };
}

export async function updateCoachPackageAction(
  id: string,
  patch: Partial<PackageInput>,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("coaching.packages", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.m_coach_package.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: {
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.sessions !== undefined && { sessions: patch.sessions }),
      ...(patch.durationMin !== undefined && { durationMin: patch.durationMin }),
      ...(patch.price !== undefined && { price: patch.price }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.note !== undefined && { note: patch.note?.trim() || null }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
      ...auditUpdate(session.userId),
    },
  });
  revalidatePath("/coaching/packages");
  return { success: true };
}

export async function deleteCoachPackageAction(id: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("coaching.packages", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.m_coach_package.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/coaching/packages");
  return { success: true };
}

/* ════════════════════════════════════════════════════════
 *  SCHEDULE GENERATION (preview) + persistence
 * ════════════════════════════════════════════════════════ */

/** Load every active coach's availability + their currently-booked sessions. */
async function loadCoachAvailability(
  companyId: string,
): Promise<CoachAvailabilityInput[]> {
  const db = await getTenantDb();
  const coaches = await db.m_coach.findMany({
    where: { companyId, status: "active", ...NOT_DELETED },
  });
  const sessions = await db.t_coaching_session.findMany({
    where: {
      companyId,
      status: { in: ["scheduled", "completed"] },
      ...NOT_DELETED,
    },
    select: { coachId: true, start: true, end: true },
  });
  return coaches.map((c) => ({
    id: c.id,
    status: c.status,
    availability: normalizeAvailability(c.availability),
    busy: sessions
      .filter((s) => s.coachId === c.id)
      .map((s) => ({ start: local(s.start), end: local(s.end) })),
  }));
}

export type GeneratedSession = {
  sequence: number;
  start: string; // local ISO
  end: string;
  dateKey: string;
  day: number;
  /** auto-assigned coach (null when none available) */
  coachId: string | null;
  coachName: string | null;
};

export type GenerateScheduleResult = {
  success: boolean;
  error?: string;
  sessions: GeneratedSession[];
};

/**
 * Preview the generated sessions for a schedule WITHOUT persisting. Auto-assigns
 * an available coach per session (load-balanced), leaving coachId null where no
 * coach is free. The UI lets the user override coaches / tweak the cycle and
 * re-run before submitting.
 */
export async function generateScheduleAction(input: {
  packageId: string;
  startDate: string; // YYYY-MM-DD
  cycle: CoachingCycle;
}): Promise<GenerateScheduleResult> {
  const session = await requireSession();
  if (!session) return { success: false, error: "Not authenticated.", sessions: [] };

  const db = await getTenantDb();
  const pkg = await db.m_coach_package.findFirst({
    where: { id: input.packageId, companyId: session.companyId, ...NOT_DELETED },
  });
  if (!pkg) return { success: false, error: "Paket tidak ditemukan.", sessions: [] };
  if (!input.cycle.slots.length) {
    return { success: false, error: "Pilih minimal satu hari dalam siklus.", sessions: [] };
  }

  const startDate = new Date(`${input.startDate}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) {
    return { success: false, error: "Tanggal mulai tidak valid.", sessions: [] };
  }

  const slots: PlannedSlot[] = generateSlots(startDate, input.cycle, pkg.sessions);
  const coaches = await loadCoachAvailability(session.companyId);
  const coachName = new Map(
    (await db.m_coach.findMany({
      where: { companyId: session.companyId, ...NOT_DELETED },
      select: { id: true, name: true },
    })).map((c) => [c.id, c.name]),
  );

  const sessions: GeneratedSession[] = slots.map((s) => {
    const coachId = assignCoachForSlot(coaches, s.start, s.end);
    return {
      sequence: s.sequence,
      start: s.start,
      end: s.end,
      dateKey: s.dateKey,
      day: s.day,
      coachId,
      coachName: coachId ? coachName.get(coachId) ?? null : null,
    };
  });

  return { success: true, sessions };
}

/** Which coaches are available for a single session slot (for manual override). */
export async function getAvailableCoachesForSlotAction(input: {
  start: string;
  end: string;
  /** exclude these (already-assigned in the current draft) — optional */
  ignoreSessionId?: string;
}): Promise<{ id: string; name: string }[]> {
  const session = await requireSession();
  if (!session) return [];
  const coaches = await loadCoachAvailability(session.companyId);
  const db = await getTenantDb();
  const names = new Map(
    (await db.m_coach.findMany({
      where: { companyId: session.companyId, ...NOT_DELETED },
      select: { id: true, name: true },
    })).map((c) => [c.id, c.name]),
  );
  return coaches
    .filter((c) => {
      const start = new Date(input.start);
      const end = new Date(input.end);
      const day = start.getDay();
      const avail = c.availability.find((a) => a.day === day);
      if (!avail || !avail.works) return false;
      const sH = start.getHours() + start.getMinutes() / 60;
      const eH = end.getHours() + end.getMinutes() / 60;
      if (sH < avail.start || eH > avail.end) return false;
      const s = start.getTime();
      const e = end.getTime();
      return !c.busy.some((b) => {
        const bs = new Date(b.start).getTime();
        const be = new Date(b.end).getTime();
        return s < be && bs < e;
      });
    })
    .map((c) => ({ id: c.id, name: names.get(c.id) ?? "—" }));
}

export type SubmitSessionInput = {
  sequence: number;
  start: string;
  end: string;
  coachId: string | null;
};

/** Persist the reviewed schedule + its sessions (one transaction). */
export async function createScheduleAction(input: {
  memberId: string;
  packageId: string;
  startDate: string;
  cycle: CoachingCycle;
  sessions: SubmitSessionInput[];
  note?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const guard = await requirePermission("coaching.schedule", "create");
    if (!guard.ok) return { success: false, error: guard.error };
    const session = guard.session;
    if (!input.memberId) return { success: false, error: "Pilih member." };
    if (!input.sessions.length) return { success: false, error: "Belum ada sesi." };

    const db = await getTenantDb();
    const pkg = await db.m_coach_package.findFirst({
      where: { id: input.packageId, companyId: session.companyId, ...NOT_DELETED },
    });
    if (!pkg) return { success: false, error: "Paket tidak ditemukan." };

    const created = await db.t_coaching_schedule.create({
      data: {
        companyId: session.companyId,
        memberId: input.memberId,
        packageId: pkg.id,
        packageName: pkg.name,
        totalSessions: pkg.sessions,
        price: pkg.price,
        startDate: new Date(`${input.startDate}T00:00:00`),
        cycle: input.cycle as unknown as Prisma.InputJsonValue,
        note: input.note?.trim() || null,
        ...auditCreate(session.userId),
        sessions: {
          create: input.sessions.map((s) => ({
            companyId: session.companyId,
            coachId: s.coachId,
            sequence: s.sequence,
            start: new Date(s.start),
            end: new Date(s.end),
            status: s.coachId ? "scheduled" : "no_coach",
            ...auditCreate(session.userId),
          })),
        },
      },
    });
    revalidatePath("/coaching/schedule");
    return { success: true, id: created.id };
  } catch (err) {
    console.error("[createScheduleAction] error:", err);
    return { success: false, error: "Gagal menyimpan jadwal coaching." };
  }
}

export type ScheduleSessionRecord = {
  id: string;
  sequence: number;
  start: string;
  end: string;
  status: string;
  coachId: string | null;
  coachName: string | null;
};

export type ScheduleRecord = {
  id: string;
  memberId: string;
  memberName: string;
  packageName: string;
  totalSessions: number;
  price: number;
  startDate: string;
  status: string;
  cycle: CoachingCycle;
  sessions: ScheduleSessionRecord[];
};

export async function getSchedulesAction(): Promise<ScheduleRecord[]> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.t_coaching_schedule.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { name: true } },
      sessions: {
        where: { ...NOT_DELETED },
        orderBy: { sequence: "asc" },
        include: { coach: { select: { name: true } } },
      },
    },
  });
  return rows.map((s) => ({
    id: s.id,
    memberId: s.memberId,
    memberName: s.member?.name ?? "—",
    packageName: s.packageName,
    totalSessions: s.totalSessions,
    price: s.price,
    startDate: local(s.startDate),
    status: s.status,
    cycle: s.cycle as unknown as CoachingCycle,
    sessions: s.sessions.map((x) => ({
      id: x.id,
      sequence: x.sequence,
      start: local(x.start),
      end: local(x.end),
      status: x.status,
      coachId: x.coachId,
      coachName: x.coach?.name ?? null,
    })),
  }));
}

/** Manually reassign a persisted session's coach. */
export async function reassignSessionCoachAction(
  sessionId: string,
  coachId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("coaching.schedule", "update");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  await db.t_coaching_session.updateMany({
    where: { id: sessionId, companyId: session.companyId, ...NOT_DELETED },
    data: {
      coachId,
      status: coachId ? "scheduled" : "no_coach",
      ...auditUpdate(session.userId),
    },
  });
  revalidatePath("/coaching/schedule");
  return { success: true };
}

export async function deleteScheduleAction(id: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("coaching.schedule", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb();
  // soft-delete the schedule + its sessions
  await db.t_coaching_session.updateMany({
    where: { scheduleId: id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  await db.t_coaching_schedule.updateMany({
    where: { id, companyId: session.companyId, ...NOT_DELETED },
    data: auditSoftDelete(session.userId),
  });
  revalidatePath("/coaching/schedule");
  return { success: true };
}

/** Lightweight member options for the schedule builder. */
export async function getCoachingMemberOptionsAction(): Promise<
  { id: string; name: string; phone: string }[]
> {
  const session = await requireSession();
  if (!session) return [];
  const db = await getTenantDb();
  const rows = await db.t_member.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true },
  });
  return rows.map((m) => ({ id: m.id, name: m.name, phone: m.phone }));
}
