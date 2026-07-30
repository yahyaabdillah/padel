import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  areSlotsConsecutive,
  availabilityRangeForCandidateSlot,
  bookingSlotStartsForSchedules,
  groupSlotsByTimeGroups,
  intervalsOverlap,
  isSlotPast,
  resetCourtForSlots,
  resetFlowForDate,
  selectedSlotsToRange,
  type BookingFlowState,
} from "./booking-flow";

test("satu slot menghasilkan rentang booking 60 menit", () => {
  assert.deepEqual(selectedSlotsToRange([16]), {
    startSlot: 16,
    endSlot: 18,
  });
});

test("dua slot berurutan menjadi satu rentang kontinu", () => {
  assert.equal(areSlotsConsecutive([16, 18]), true);
  assert.deepEqual(selectedSlotsToRange([18, 16]), {
    startSlot: 16,
    endSlot: 20,
  });
});

test("slot kandidat berurutan memakai rentang gabungan untuk availability", () => {
  assert.deepEqual(availabilityRangeForCandidateSlot([30], 32), {
    startSlot: 30,
    endSlot: 34,
  });
  assert.deepEqual(availabilityRangeForCandidateSlot([32], 30), {
    startSlot: 30,
    endSlot: 34,
  });
  assert.deepEqual(availabilityRangeForCandidateSlot([30], 34), {
    startSlot: 34,
    endSlot: 36,
  });
});

test("court dengan bentrok pada slot kedua tidak tersedia untuk seluruh rentang", () => {
  const selectedStart = new Date("2026-07-28T08:00:00+07:00");
  const selectedEnd = new Date("2026-07-28T10:00:00+07:00");
  const occupiedStart = new Date("2026-07-28T09:00:00+07:00");
  const occupiedEnd = new Date("2026-07-28T10:00:00+07:00");

  assert.equal(
    intervalsOverlap(occupiedStart, occupiedEnd, selectedStart, selectedEnd),
    true,
  );
});

test("court yang kosong pada semua slot tetap tersedia", () => {
  const selectedStart = new Date("2026-07-28T08:00:00+07:00");
  const selectedEnd = new Date("2026-07-28T10:00:00+07:00");
  const occupiedStart = new Date("2026-07-28T10:00:00+07:00");
  const occupiedEnd = new Date("2026-07-28T11:00:00+07:00");

  assert.equal(
    intervalsOverlap(occupiedStart, occupiedEnd, selectedStart, selectedEnd),
    false,
  );
});

test("slot tidak berurutan ditolak", () => {
  assert.equal(areSlotsConsecutive([16, 20]), false);
  assert.equal(selectedSlotsToRange([16, 20]), null);
});

test("batas interval yang bersentuhan tidak dianggap bentrok", () => {
  assert.equal(
    intervalsOverlap(
      new Date("2026-07-28T10:00:00+07:00"),
      new Date("2026-07-28T11:00:00+07:00"),
      new Date("2026-07-28T08:00:00+07:00"),
      new Date("2026-07-28T10:00:00+07:00"),
    ),
    false,
  );
});

test("slot hari ini yang sudah lewat dinonaktifkan dalam timezone aplikasi", () => {
  const now = new Date("2026-07-27T02:15:00Z"); // 09:15 Asia/Jakarta
  assert.equal(isSlotPast("2026-07-27", 18, now), true);
  assert.equal(isSlotPast("2026-07-27", 20, now), false);
});

test("mengganti tanggal mereset slot dan court", () => {
  const nextDate = new Date("2026-07-29T00:00:00+07:00");
  assert.deepEqual(resetFlowForDate(nextDate), {
    selectedDate: nextDate,
    selectedSlotIds: [],
    selectedCourtId: null,
  });
});

test("mengganti slot mereset court", () => {
  const state: BookingFlowState = {
    selectedDate: new Date("2026-07-28T00:00:00+07:00"),
    selectedSlotIds: [16],
    selectedCourtId: "court-a",
  };
  assert.deepEqual(resetCourtForSlots(state, [16, 18]), {
    ...state,
    selectedSlotIds: [16, 18],
    selectedCourtId: null,
  });
});

test("create booking memakai serializable transaction dan retry konflik", () => {
  const source = readFileSync(
    "src/app/(admin)/bookings/actions.ts",
    "utf8",
  );
  assert.match(source, /isolationLevel:\s*"Serializable"/);
  assert.match(source, /code === "P2034"/);
  assert.match(source, /BOOKING_CONFLICT/);
});

test("slot dikelompokkan mengikuti master group waktu dan sort order", () => {
  const grouped = groupSlotsByTimeGroups(
    [{ startSlot: 14 }, { startSlot: 24 }, { startSlot: 36 }],
    [
      {
        id: "siang",
        name: "Siang",
        startHour: 12,
        endHour: 17,
        color: "#F59E0B",
        sortOrder: 2,
      },
      {
        id: "pagi",
        name: "Pagi",
        startHour: 6,
        endHour: 12,
        color: "#14B8A6",
        sortOrder: 1,
      },
    ],
  );

  assert.deepEqual(
    grouped.map((group) => ({
      id: group.id,
      slots: group.slots.map((slot) => slot.startSlot),
    })),
    [
      { id: "pagi", slots: [14] },
      { id: "siang", slots: [24] },
      { id: "__other", slots: [36] },
    ],
  );
});

test("pilihan waktu hanya memuat sesi 60 menit yang dibuka oleh jadwal lapangan", () => {
  const closed = Array.from({ length: 48 }, () => "closed");
  const openNineToEleven = [...closed];
  openNineToEleven[18] = "regular";
  openNineToEleven[19] = "regular";
  openNineToEleven[20] = "peak";
  openNineToEleven[21] = "peak";

  assert.deepEqual(
    bookingSlotStartsForSchedules(
      [[{ day: 4, available: true, slots: openNineToEleven }]],
      4,
    ),
    [18, 20],
  );
});

test("slot tetap ditampilkan bila jadwal buka meskipun availability transaksi nanti penuh", () => {
  const slots = Array.from({ length: 48 }, () => "closed");
  slots[20] = "regular";
  slots[21] = "regular";

  assert.deepEqual(
    bookingSlotStartsForSchedules(
      [[{ day: 4, available: true, slots }]],
      4,
    ),
    [20],
  );
});

test("action master grouping membaca cookie sesi bertanda tangan", () => {
  const source = readFileSync(
    "src/app/(admin)/settings/hours/group-actions.ts",
    "utf8",
  );
  assert.match(source, /import\s+\{\s*readSession/);
  assert.match(source, /const session = await readSession\(\)/);
  assert.doesNotMatch(source, /JSON\.parse\(raw\)/);
});
