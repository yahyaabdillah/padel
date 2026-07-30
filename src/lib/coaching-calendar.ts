export type CoachingCalendarSession = {
  id: string;
  sequence: number;
  start: string;
  end: string;
  status: string;
  coachId: string | null;
  coachName: string | null;
};

export type CoachingCalendarSchedule = {
  id: string;
  memberName: string;
  packageName: string;
  status: string;
  sessions: CoachingCalendarSession[];
};

export type CoachingCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    scheduleId: string;
    memberName: string;
    packageName: string;
    sequence: number;
    status: string;
    coachId: string | null;
    coachName: string | null;
  };
};

const FALLBACK_COACH_COLOR = "#6D5BFF";
const NO_COACH_COLOR = "#F59E0B";
const CANCELLED_COLOR = "#94A3B8";

export function scheduleRecordsToCalendarEvents(
  schedules: CoachingCalendarSchedule[],
  coachColorById: ReadonlyMap<string, string>,
): CoachingCalendarEvent[] {
  return schedules.flatMap((schedule) =>
    schedule.sessions.map((session) => {
      const color =
        session.status === "cancelled"
          ? CANCELLED_COLOR
          : session.coachId
            ? coachColorById.get(session.coachId) ?? FALLBACK_COACH_COLOR
            : NO_COACH_COLOR;
      const coachName = session.coachName ?? "Tanpa coach";
      return {
        id: session.id,
        title: `${schedule.memberName} · ${coachName}`,
        start: session.start,
        end: session.end,
        backgroundColor: color,
        borderColor: color,
        textColor: "#ffffff",
        extendedProps: {
          scheduleId: schedule.id,
          memberName: schedule.memberName,
          packageName: schedule.packageName,
          sequence: session.sequence,
          status: session.status,
          coachId: session.coachId,
          coachName: session.coachName,
        },
      };
    }),
  );
}
