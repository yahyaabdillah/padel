"use server";

import { getTenantDb, type TenantDbConfig } from "@/lib/tenant-db";
import { auditCreate, auditSoftDelete, auditUpdate, NOT_DELETED } from "@/lib/audit";
import { readSession, requirePermission } from "@/lib/access-guard";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/tenant-client";
import {
  type CoachAvailability,
  type CoachAvailabilityInput,
  type CoachingCycle,
  type PlannedSlot,
  assignCoachForSlot,
  coachingQuotaForSchedule,
  generateSlots,
  makeDefaultAvailability,
  normalizeAvailability,
  validateCoachingCycle,
  isCoachAvailable,
} from "@/lib/coaching";
import { resolveMembershipQuotaCycle } from "@/lib/membership-quota";

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
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
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
  const normalizedAvailability = normalizeAvailability(input.availability ?? makeDefaultAvailability());
  if (normalizedAvailability.some((day) => day.start < 0 || day.end > 24 || day.start >= day.end)) {
    return { success: false, error: "Jam availability coach tidak valid." };
  }
  const db = await getTenantDb(session.dbConfig);
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
      availability: normalizedAvailability as unknown as Prisma.InputJsonValue,
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
  if (patch.name !== undefined && !patch.name.trim()) {
    return { success: false, error: "Nama coach wajib diisi." };
  }
  if (
    patch.availability !== undefined &&
    normalizeAvailability(patch.availability).some((day) => day.start < 0 || day.end > 24 || day.start >= day.end)
  ) {
    return { success: false, error: "Jam availability coach tidak valid." };
  }
  const db = await getTenantDb(session.dbConfig);
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
  const db = await getTenantDb(session.dbConfig);
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
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
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
  if (!Number.isInteger(input.sessions) || input.sessions < 1) return { success: false, error: "Jumlah sesi minimal 1." };
  if (!Number.isInteger(input.durationMin) || input.durationMin < 15 || input.durationMin > 1440) {
    return { success: false, error: "Durasi paket harus antara 15 dan 1440 menit." };
  }
  if (!Number.isInteger(input.price) || input.price < 0) return { success: false, error: "Harga paket tidak valid." };
  const db = await getTenantDb(session.dbConfig);
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
  if (patch.name !== undefined && !patch.name.trim()) return { success: false, error: "Nama paket wajib diisi." };
  if (patch.sessions !== undefined && (!Number.isInteger(patch.sessions) || patch.sessions < 1)) {
    return { success: false, error: "Jumlah sesi minimal 1." };
  }
  if (patch.durationMin !== undefined && (!Number.isInteger(patch.durationMin) || patch.durationMin < 15 || patch.durationMin > 1440)) {
    return { success: false, error: "Durasi paket tidak valid." };
  }
  if (patch.price !== undefined && (!Number.isInteger(patch.price) || patch.price < 0)) {
    return { success: false, error: "Harga paket tidak valid." };
  }
  const db = await getTenantDb(session.dbConfig);
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
  const db = await getTenantDb(session.dbConfig);
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
  dbConfig: TenantDbConfig | undefined,
): Promise<CoachAvailabilityInput[]> {
  const db = await getTenantDb(dbConfig);
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
  const guard = await requirePermission("coaching.schedule", "create");
  if (!guard.ok) return { success: false, error: guard.error, sessions: [] };
  const session = guard.session;

  const db = await getTenantDb(session.dbConfig);
  const pkg = await db.m_coach_package.findFirst({
    where: { id: input.packageId, companyId: session.companyId, active: true, ...NOT_DELETED },
  });
  if (!pkg) return { success: false, error: "Paket tidak ditemukan.", sessions: [] };
  const cycleValidation = validateCoachingCycle(input.cycle);
  if (!cycleValidation.ok) {
    return { success: false, error: cycleValidation.error, sessions: [] };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    return { success: false, error: "Tanggal mulai tidak valid.", sessions: [] };
  }
  const startDate = new Date(`${input.startDate}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) {
    return { success: false, error: "Tanggal mulai tidak valid.", sessions: [] };
  }

  const slots: PlannedSlot[] = generateSlots(startDate, input.cycle, pkg.sessions);
  const coaches = await loadCoachAvailability(
    session.companyId,
    session.dbConfig,
  );
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
  const session = await readSession();
  if (!session) return [];
  const coaches = await loadCoachAvailability(
    session.companyId,
    session.dbConfig,
  );
  const db = await getTenantDb(session.dbConfig);
  const ignored = input.ignoreSessionId
    ? await db.t_coaching_session.findFirst({
        where: { id: input.ignoreSessionId, companyId: session.companyId, ...NOT_DELETED },
        select: { coachId: true, start: true, end: true },
      })
    : null;
  if (ignored) {
    for (const coach of coaches) {
      if (coach.id === ignored.coachId) {
        coach.busy = coach.busy.filter(
          (b) =>
            new Date(b.start).getTime() !== ignored.start.getTime() ||
            new Date(b.end).getTime() !== ignored.end.getTime(),
        );
      }
    }
  }
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
    const db = await getTenantDb(session.dbConfig);
    const cycleValidation = validateCoachingCycle(input.cycle);
    if (!cycleValidation.ok) return { success: false, error: cycleValidation.error };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
      return { success: false, error: "Tanggal mulai tidak valid." };
    }
    const startDate = new Date(`${input.startDate}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return { success: false, error: "Tanggal mulai tidak valid." };

    const created = await db.$transaction(async (tx) => {
      const [member, pkg] = await Promise.all([
        tx.t_member.findFirst({
          where: { id: input.memberId, companyId: session.companyId, status: "active", ...NOT_DELETED },
          include: { plan: { select: { freeCoaching: true, resetPeriodDays: true, active: true, isDeleted: true } } },
        }),
        tx.m_coach_package.findFirst({
          where: { id: input.packageId, companyId: session.companyId, active: true, ...NOT_DELETED },
        }),
      ]);
      if (!member) throw new Error("MEMBER_NOT_FOUND");
      if (!pkg) throw new Error("PACKAGE_NOT_FOUND");
      if (input.sessions.length !== pkg.sessions) throw new Error("SESSION_COUNT_MISMATCH");
      if (pkg.durationMin !== input.cycle.durationMin) throw new Error("DURATION_MISMATCH");

      const expected = generateSlots(startDate, input.cycle, pkg.sessions);
      if (
        expected.length !== input.sessions.length ||
        expected.some((slot, i) =>
          slot.sequence !== input.sessions[i].sequence ||
          slot.start !== input.sessions[i].start ||
          slot.end !== input.sessions[i].end,
        )
      ) {
        throw new Error("SLOT_MISMATCH");
      }

      const coachIds = [...new Set(input.sessions.map((s) => s.coachId).filter((id): id is string => Boolean(id)))];
      const coaches = await tx.m_coach.findMany({
        where: { companyId: session.companyId, id: { in: coachIds }, status: "active", ...NOT_DELETED },
        select: { id: true, status: true, availability: true },
      });
      if (coaches.length !== coachIds.length) throw new Error("COACH_NOT_FOUND");
      const existing = await tx.t_coaching_session.findMany({
        where: {
          companyId: session.companyId,
          coachId: { in: coachIds },
          status: { in: ["scheduled", "completed"] },
          ...NOT_DELETED,
        },
        select: { coachId: true, start: true, end: true },
      });
      const availability = coaches.map((coach) => ({
        id: coach.id,
        status: coach.status,
        availability: normalizeAvailability(coach.availability),
        busy: existing
          .filter((item) => item.coachId === coach.id)
          .map((item) => ({ start: local(item.start), end: local(item.end) })),
      }));
      for (const item of input.sessions) {
        if (!item.coachId) continue;
        const coach = availability.find((candidate) => candidate.id === item.coachId);
        if (!coach || !isCoachAvailable(coach, item.start, item.end)) {
          throw new Error("COACH_UNAVAILABLE");
        }
        coach.busy.push({ start: item.start, end: item.end });
      }

      const quota = resolveMembershipQuotaCycle({
        quotaUsed: member.coachingUsed,
        cycleStart: member.cycleStart,
        resetPeriodDays: member.plan?.resetPeriodDays ?? 0,
      });
      const freeCoaching =
        member.plan?.active && !member.plan.isDeleted ? member.plan.freeCoaching : 0;
      const quotaUse = coachingQuotaForSchedule({
        freeCoaching,
        coachingUsed: quota.effectiveQuotaUsed,
        sessionCount: pkg.sessions,
      });
      const createdSchedule = await tx.t_coaching_schedule.create({
        data: {
          companyId: session.companyId,
          memberId: input.memberId,
          packageId: pkg.id,
          packageName: pkg.name,
          totalSessions: pkg.sessions,
          price: pkg.price,
          coachingQuotaConsumed: quotaUse.consumed,
          startDate,
          cycle: input.cycle as unknown as Prisma.InputJsonValue,
          note: input.note?.trim() || null,
          ...auditCreate(session.userId),
          sessions: {
            create: input.sessions.map((item) => ({
              companyId: session.companyId,
              coachId: item.coachId,
              sequence: item.sequence,
              start: new Date(item.start),
              end: new Date(item.end),
              status: item.coachId ? "scheduled" : "no_coach",
              ...auditCreate(session.userId),
            })),
          },
        },
      });
      await tx.t_member.update({
        where: { id: member.id },
        data: {
          coachingUsed: quota.shouldStartNewCycle
            ? quotaUse.consumed
            : { increment: quotaUse.consumed },
          ...(quota.shouldStartNewCycle ? { cycleStart: new Date() } : {}),
          ...auditUpdate(session.userId),
        },
      });
      return createdSchedule;
    }, { isolationLevel: "Serializable" });
    revalidatePath("/coaching/schedule");
    return { success: true, id: created.id };
  } catch (err) {
    console.error("[createScheduleAction] error:", err);
    const code = err instanceof Error ? err.message : "";
    const errors: Record<string, string> = {
      MEMBER_NOT_FOUND: "Member aktif tidak ditemukan.",
      PACKAGE_NOT_FOUND: "Paket aktif tidak ditemukan.",
      SESSION_COUNT_MISMATCH: "Jumlah sesi tidak sesuai paket.",
      DURATION_MISMATCH: "Durasi sesi tidak sesuai paket.",
      SLOT_MISMATCH: "Slot sesi tidak sesuai siklus yang dipilih.",
      COACH_NOT_FOUND: "Coach aktif tidak ditemukan.",
      COACH_UNAVAILABLE: "Ada coach yang tidak tersedia atau bentrok.",
    };
    return { success: false, error: errors[code] ?? "Gagal menyimpan jadwal coaching." };
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
  coachingQuotaConsumed: number;
  startDate: string;
  status: string;
  cycle: CoachingCycle;
  sessions: ScheduleSessionRecord[];
};

export async function getSchedulesAction(): Promise<ScheduleRecord[]> {
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
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
    coachingQuotaConsumed: s.coachingQuotaConsumed,
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
  const db = await getTenantDb(session.dbConfig);
  const target = await db.t_coaching_session.findFirst({
    where: {
      id: sessionId,
      companyId: session.companyId,
      ...NOT_DELETED,
      schedule: { companyId: session.companyId, status: "active", ...NOT_DELETED },
    },
    select: { start: true, end: true },
  });
  if (!target) return { success: false, error: "Sesi coaching tidak ditemukan." };
  if (coachId) {
    const coach = await db.m_coach.findFirst({
      where: { id: coachId, companyId: session.companyId, status: "active", ...NOT_DELETED },
      select: { id: true, status: true, availability: true },
    });
    if (!coach) return { success: false, error: "Coach aktif tidak ditemukan." };
    const existing = await db.t_coaching_session.findMany({
      where: {
        companyId: session.companyId,
        coachId,
        id: { not: sessionId },
        status: { in: ["scheduled", "completed"] },
        ...NOT_DELETED,
      },
      select: { start: true, end: true },
    });
    const candidate = {
      id: coach.id,
      status: coach.status,
      availability: normalizeAvailability(coach.availability),
      busy: existing.map((item) => ({ start: local(item.start), end: local(item.end) })),
    };
    if (!isCoachAvailable(candidate, local(target.start), local(target.end))) {
      return { success: false, error: "Coach tidak tersedia pada waktu sesi tersebut." };
    }
  }
  await db.t_coaching_session.updateMany({
    where: { id: sessionId, companyId: session.companyId, ...NOT_DELETED },
    data: { coachId, status: coachId ? "scheduled" : "no_coach", ...auditUpdate(session.userId) },
  });
  revalidatePath("/coaching/schedule");
  return { success: true };
}

export async function deleteScheduleAction(id: string): Promise<{ success: boolean; error?: string }> {
  const guard = await requirePermission("coaching.schedule", "delete");
  if (!guard.ok) return { success: false, error: guard.error };
  const session = guard.session;
  const db = await getTenantDb(session.dbConfig);
  await db.$transaction(async (tx) => {
    const schedule = await tx.t_coaching_schedule.findFirst({
      where: { id, companyId: session.companyId, ...NOT_DELETED },
      select: { memberId: true, coachingQuotaConsumed: true },
    });
    if (!schedule) return;
    await tx.t_coaching_session.updateMany({
      where: { scheduleId: id, companyId: session.companyId, ...NOT_DELETED },
      data: auditSoftDelete(session.userId),
    });
    await tx.t_coaching_schedule.updateMany({
      where: { id, companyId: session.companyId, ...NOT_DELETED },
      data: auditSoftDelete(session.userId),
    });
    if (schedule.coachingQuotaConsumed > 0) {
      const member = await tx.t_member.findFirst({
        where: { id: schedule.memberId, companyId: session.companyId, ...NOT_DELETED },
        select: { coachingUsed: true },
      });
      if (member) {
        await tx.t_member.updateMany({
          where: { id: schedule.memberId, companyId: session.companyId, ...NOT_DELETED },
          data: {
            coachingUsed: Math.max(0, member.coachingUsed - schedule.coachingQuotaConsumed),
            ...auditUpdate(session.userId),
          },
        });
      }
    }
  }, { isolationLevel: "Serializable" });
  revalidatePath("/coaching/schedule");
  return { success: true };
}

/** Lightweight member options for the schedule builder. */
export async function getCoachingMemberOptionsAction(): Promise<
  { id: string; name: string; phone: string }[]
> {
  const session = await readSession();
  if (!session) return [];
  const db = await getTenantDb(session.dbConfig);
  const rows = await db.t_member.findMany({
    where: { companyId: session.companyId, ...NOT_DELETED },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, phone: true },
  });
  return rows.map((m) => ({ id: m.id, name: m.name, phone: m.phone }));
}
