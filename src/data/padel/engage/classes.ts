// PadelHub — Classes & Clinics store (dummy, no DB).
// Owns the MUTABLE class schedule used by the Coaching → Classes page: create,
// edit, cancel, enroll. Seeded from the read-only `padelClasses` mock in
// coaches.ts (which other modules still import) and persisted to localStorage so
// edits survive a refresh. The base PadelClass shape + coach/day helpers stay in
// coaches.ts; this module only adds the editable layer + a few class-specific
// derived types/helpers.

import {
  padelClasses as seedPadelClasses,
  coaches,
  type PadelClass,
  type ClassType,
  type ClassLevel,
  type WeekDay,
} from "@/data/padel/engage/coaches";

export type {
  PadelClass,
  ClassType,
  ClassLevel,
  WeekDay,
} from "@/data/padel/engage/coaches";
export { coachById, coaches, weekDays } from "@/data/padel/engage/coaches";

/** Lifecycle status layered on top of the base schedule row. */
export type ClassStatus = "active" | "cancelled";

/** Editable class = base schedule row + lifecycle status. */
export interface ManagedClass extends PadelClass {
  status: ClassStatus;
}

/** The fields a club admin fills in the create/edit drawer. */
export type ClassDraft = {
  title: string;
  type: ClassType;
  level: ClassLevel;
  coachId: string;
  day: WeekDay;
  startTime: string;
  endTime: string;
  court: string;
  capacity: number;
  pricePerSession: number;
};

export const STORAGE_KEY = "padelhub-classes-v1";

export const classTypes: ClassType[] = [
  "Clinic",
  "Group",
  "Academy",
  "Bootcamp",
];

export const classLevels: ClassLevel[] = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "All Levels",
];

/** Courts available at the club (dummy). */
export const clubCourts: string[] = [
  "Court 1",
  "Court 2",
  "Court 3",
  "Court 4",
];

/** Full-name labels for the week-day codes. */
export const dayFull: Record<WeekDay, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

/** Brand-ish chip colors cycled when creating a new class. */
const chipColors = ["#6D5BFF", "#14B8A6", "#C6FF3D"];

export const nextChipColor = (index: number) =>
  chipColors[index % chipColors.length];

/** Seed the editable store from the read-only coaches mock. */
export const seedManagedClasses = (): ManagedClass[] =>
  seedPadelClasses.map((c) => ({ ...c, status: "active" as ClassStatus }));

/** Tone meta for the lifecycle badge. */
export const classStatusMeta: Record<
  ClassStatus,
  { label: string; tone: "success" | "error" }
> = {
  active: { label: "Active", tone: "success" },
  cancelled: { label: "Cancelled", tone: "error" },
};

/** Default draft for a brand-new class. */
export const emptyClassDraft = (): ClassDraft => ({
  title: "",
  type: "Group",
  level: "All Levels",
  coachId: coaches.find((c) => c.status === "active")?.id ?? coaches[0].id,
  day: "Mon",
  startTime: "18:00",
  endTime: "19:30",
  court: clubCourts[0],
  capacity: 8,
  pricePerSession: 175_000,
});

/** Pull an editable draft out of an existing managed class. */
export const toDraft = (c: ManagedClass): ClassDraft => ({
  title: c.title,
  type: c.type,
  level: c.level,
  coachId: c.coachId,
  day: c.day,
  startTime: c.startTime,
  endTime: c.endTime,
  court: c.court,
  capacity: c.capacity,
  pricePerSession: c.pricePerSession,
});

/** Validate a draft; returns field-keyed error messages (empty = valid). */
export const validateDraft = (d: ClassDraft): Partial<Record<keyof ClassDraft, string>> => {
  const e: Partial<Record<keyof ClassDraft, string>> = {};
  if (!d.title.trim()) e.title = "Class name is required.";
  if (!d.coachId) e.coachId = "Pick a coach.";
  if (!d.court) e.court = "Pick a court.";
  if (!d.startTime) e.startTime = "Start time is required.";
  if (!d.endTime) e.endTime = "End time is required.";
  if (d.startTime && d.endTime && d.endTime <= d.startTime)
    e.endTime = "End time must be after start time.";
  if (!Number.isFinite(d.capacity) || d.capacity < 1)
    e.capacity = "Capacity must be at least 1.";
  if (d.capacity > 30) e.capacity = "Capacity looks too large (max 30).";
  if (!Number.isFinite(d.pricePerSession) || d.pricePerSession < 0)
    e.pricePerSession = "Price must be 0 or more.";
  return e;
};
