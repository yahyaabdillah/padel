import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { scheduleRecordsToCalendarEvents } from "./coaching-calendar";

test("sesi coaching dipetakan menjadi event kalender dengan detail operasional", () => {
  const events = scheduleRecordsToCalendarEvents(
    [
      {
        id: "schedule-1",
        memberName: "Alya Putri",
        packageName: "Starter",
        status: "active",
        sessions: [
          {
            id: "session-1",
            sequence: 1,
            start: "2026-07-30T18:00:00",
            end: "2026-07-30T19:00:00",
            status: "scheduled",
            coachId: "coach-1",
            coachName: "Dimas",
          },
          {
            id: "session-2",
            sequence: 2,
            start: "2026-08-01T18:00:00",
            end: "2026-08-01T19:00:00",
            status: "no_coach",
            coachId: null,
            coachName: null,
          },
        ],
      },
    ],
    new Map([["coach-1", "#14B8A6"]]),
  );

  assert.equal(events.length, 2);
  assert.deepEqual(events[0], {
    id: "session-1",
    title: "Alya Putri · Dimas",
    start: "2026-07-30T18:00:00",
    end: "2026-07-30T19:00:00",
    backgroundColor: "#14B8A6",
    borderColor: "#14B8A6",
    textColor: "#ffffff",
    extendedProps: {
      scheduleId: "schedule-1",
      memberName: "Alya Putri",
      packageName: "Starter",
      sequence: 1,
      status: "scheduled",
      coachId: "coach-1",
      coachName: "Dimas",
    },
  });
  assert.equal(events[1].title, "Alya Putri · Tanpa coach");
  assert.equal(events[1].backgroundColor, "#F59E0B");
});

test("semua query coaching memakai koneksi database tenant dari sesi", () => {
  const source = readFileSync(
    "src/app/(admin)/coaching/actions.ts",
    "utf8",
  );

  assert.doesNotMatch(source, /getTenantDb\(\)/);
  assert.match(source, /getTenantDb\(session\.dbConfig\)/);
});
