"use client";

// PadelHub — "New Booking" search-first flow (owner / front-desk staff).
// Step 1: pick a date + duration ("Mau booking kapan?") and click Cari.
// Step 2: shows every court that has an available slot for that date/duration,
//   with court + start-time filters. Duration options follow the club booking
//   step (slotMinutes) from master operating hours.
// Step 3: click a slot → member-pick modal (searchable). If the member isn't
//   found, "+ Member baru" opens a quick add-member modal prefilled with the
//   typed name; the new member is selected automatically. Confirm → booking.

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CalendarDays, Clock } from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import UiSelect from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import InputLabel from "@/components/ui/input/InputLabel";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import { useClubData } from "@/components/club-core/ClubDataContext";
import { useOperatingHours } from "@/context/OperatingHoursContext";
import QuickAddMemberModal from "./QuickAddMemberModal";
import {
  type Court,
  type AvailableSlot,
  courtAvailableSlots,
  hourToSlot,
  STORAGE_SLOT_MINUTES,
} from "@/data/padel/club/courts";
import { dateKey } from "@/data/padel/club/bookings";
import {
  mockMembers,
  memberTierMeta,
  type Member,
} from "@/data/padel/club/members";

const todayKey = "2026-06-02";
const pad = (n: number) => String(n).padStart(2, "0");
const LS_MEMBERS = "padelhub-club-members";

/** Build duration options as multiples of the club booking step (up to 3h). */
const buildDurations = (step: 30 | 60) => {
  const out: { value: string; label: string }[] = [];
  for (let m = step; m <= 180; m += step) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const label =
      h > 0 ? `${h} jam${min ? ` ${min} menit` : ""}` : `${min} menit`;
    out.push({ value: String(m), label });
  }
  return out;
};

/** Per-court availability result. */
interface CourtResult {
  court: Court;
  slots: AvailableSlot[];
}

/** A chosen slot pending member selection. */
interface BookingDraft {
  court: Court;
  slot: AvailableSlot;
}

export default function NewBookingSearch() {
  const router = useRouter();
  const toast = useToast();
  const { courts, bookings, addBooking, isReady } = useClubData();
  const { slotMinutes, isReady: hoursReady } = useOperatingHours();

  const durationOptions = useMemo(
    () => buildDurations(slotMinutes),
    [slotMinutes],
  );

  const [date, setDate] = useState<Date>(
    () => new Date(`${todayKey}T00:00:00`),
  );
  const [duration, setDuration] = useState<number>(slotMinutes === 30 ? 90 : 60);
  const [results, setResults] = useState<CourtResult[] | null>(null);
  const [searchedMeta, setSearchedMeta] = useState<{
    dateKey: string;
    duration: number;
  } | null>(null);

  // result filters
  const [filterCourt, setFilterCourt] = useState<string>("all");
  /** start-time filter as "HH:MM" ("" = semua jam) */
  const [filterTime, setFilterTime] = useState<string>("");

  // members (seed + locally created)
  const [extraMembers, setExtraMembers] = useState<Member[]>([]);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LS_MEMBERS);
      if (raw) {
        const parsed = JSON.parse(raw) as Member[];
        if (Array.isArray(parsed)) setExtraMembers(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const allMembers = useMemo(
    () => [...extraMembers, ...mockMembers],
    [extraMembers],
  );

  // member-selection flow state
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");

  const activeCourts = useMemo(
    () => courts.filter((c) => c.status === "active"),
    [courts],
  );

  const durationValid = durationOptions.some((d) => Number(d.value) === duration);
  const effectiveDuration = durationValid
    ? duration
    : Number(durationOptions[0]?.value ?? 60);

  const runSearch = () => {
    const key = dateKey(date);
    const day = date.getDay();

    const found: CourtResult[] = activeCourts
      .map((court) => {
        const occupied = new Set<number>();
        bookings
          .filter(
            (b) =>
              b.courtId === court.id &&
              b.status !== "cancelled" &&
              b.start.startsWith(key),
          )
          .forEach((b) => {
            const sh = Number(b.start.slice(11, 13));
            const sm = Number(b.start.slice(14, 16));
            const eh = Number(b.end.slice(11, 13));
            const em = Number(b.end.slice(14, 16));
            const startSlot = hourToSlot(sh) + (sm >= 30 ? 1 : 0);
            const endSlot = hourToSlot(eh) + (em > 30 ? 2 : em > 0 ? 1 : 0);
            for (let s = startSlot; s < endSlot; s++) occupied.add(s);
          });

        const slots = courtAvailableSlots(
          court,
          day,
          effectiveDuration,
          occupied,
          slotMinutes,
        );
        return { court, slots };
      })
      .filter((r) => r.slots.length > 0);

    setSearchedMeta({ dateKey: key, duration: effectiveDuration });
    setFilterCourt("all");
    setFilterTime("");
    setResults(found);
  };

  const timeToSlot = (t: string): number | null => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return null;
    return hourToSlot(Number(m[1])) + (Number(m[2]) >= 30 ? 1 : 0);
  };

  const filteredResults = useMemo(() => {
    if (!results) return [];
    const fromSlot = filterTime ? timeToSlot(filterTime) : null;
    return results
      .filter((r) => filterCourt === "all" || r.court.id === filterCourt)
      .map((r) => ({
        ...r,
        slots:
          fromSlot == null
            ? r.slots
            : r.slots.filter((s) => s.startSlot >= fromSlot),
      }))
      .filter((r) => r.slots.length > 0);
  }, [results, filterCourt, filterTime]);

  // ── slot → member selection ──
  const pickSlot = (court: Court, slot: AvailableSlot) => {
    setDraft({ court, slot });
    setSelectedMemberId("");
  };

  const memberOptions = useMemo(
    () =>
      allMembers.map((m) => ({
        value: m.id,
        label: m.name,
        desc: `${memberTierMeta[m.tier].label} · ${m.phone || "tanpa telepon"}`,
      })),
    [allMembers],
  );

  const onMemberCreated = (member: Member) => {
    setExtraMembers((prev) => [member, ...prev]);
    setSelectedMemberId(member.id);
    toast.success(`${member.name} ditambahkan`, "Member baru");
  };

  const confirmBooking = () => {
    if (!draft || !searchedMeta || !selectedMemberId) return;
    const member = allMembers.find((m) => m.id === selectedMemberId);
    if (!member) return;

    const { court, slot } = draft;
    const startH = Math.floor(slot.startSlot / 2);
    const startM = (slot.startSlot % 2) * 30;
    const endSlot = slot.startSlot + Math.ceil(searchedMeta.duration / STORAGE_SLOT_MINUTES);
    const endH = Math.floor(endSlot / 2);
    const endM = (endSlot % 2) * 30;

    const key = searchedMeta.dateKey;
    const startIso = `${key}T${pad(startH)}:${pad(startM)}:00`;
    const endIso = `${key}T${pad(endH)}:${pad(endM)}:00`;

    addBooking({
      courtId: court.id,
      start: startIso,
      end: endIso,
      type: member.tier === "daily" ? "walk_in" : "member",
      status: "confirmed",
      customer: member.name,
      memberId: member.id,
      partySize: court.format === "single" ? 2 : 4,
      price: slot.price,
      createdBy: "Front desk",
    });

    toast.success(
      `${court.name} · ${slot.startLabel}–${slot.endLabel} untuk ${member.name}.`,
      "Booking dikonfirmasi",
    );
    setDraft(null);
    setSelectedMemberId("");
    // refresh availability so the just-booked slot disappears
    runSearch();
  };

  if (!isReady || !hoursReady) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        </div>
      </Card>
    );
  }

  const draftMember = allMembers.find((m) => m.id === selectedMemberId);

  return (
    <div className="space-y-6">
      {/* ── Search form ── */}
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
          <h3 className="text-lg font-semibold text-[var(--text-heading)]">
            Mau booking kapan?
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          <DatePicker
            label="Tanggal main"
            labelInfo="Tanggal bermain. Tidak bisa memilih tanggal di masa lalu."
            mode="single"
            value={date}
            minDate={new Date(`${todayKey}T00:00:00`)}
            onChange={(v) => {
              if (v instanceof Date) {
                setDate(v);
                setResults(null);
              }
            }}
          />

          <UiSelect
            label="Durasi main"
            labelInfo={`Lama sewa. Mengikuti durasi slot booking klub (${slotMinutes} menit), jadi pilihannya kelipatan ${slotMinutes} menit.`}
            options={durationOptions}
            value={String(effectiveDuration)}
            clearable={false}
            onChange={(v) => {
              setDuration(Number(v));
              setResults(null);
            }}
          />

          <Button
            variant="primary"
            sheen
            glow
            startIcon={<Search className="h-4 w-4" />}
            onClick={runSearch}
            className="h-11"
          >
            Cari
          </Button>
        </div>
      </Card>

      {/* ── Results ── */}
      {results !== null && (
        <Card padding="lg">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-heading)]">
                Lapangan tersedia
              </h3>
              {searchedMeta && (
                <p className="mt-0.5 text-xs text-[var(--text-caption)]">
                  {searchedMeta.dateKey} · durasi {searchedMeta.duration} menit ·{" "}
                  {filteredResults.length} lapangan
                </p>
              )}
            </div>

            {/* filters */}
            {results.length > 0 && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <InputLabel
                    label="Filter lapangan"
                    tooltip="Tampilkan hanya lapangan tertentu."
                  />
                  <UiSelect
                    options={[
                      { value: "all", label: "Semua lapangan" },
                      ...results.map((r) => ({
                        value: r.court.id,
                        label: r.court.name,
                      })),
                    ]}
                    value={filterCourt}
                    clearable={false}
                    searchable
                    onChange={(v) => setFilterCourt(v as string)}
                  />
                </div>
                <div className="w-44">
                  <TimePicker
                    label="Mulai dari jam"
                    value={filterTime}
                    minuteStep={slotMinutes}
                    placeholder="Semua jam"
                    onChange={(v) => setFilterTime(v)}
                  />
                </div>
              </div>
            )}
          </div>

          {filteredResults.length === 0 ? (
            <EmptyState
              title="Tidak ada slot tersedia"
              description="Coba ubah tanggal, durasi, atau filter untuk menemukan lapangan yang kosong."
            />
          ) : (
            <div className="space-y-4">
              {filteredResults.map(({ court, slots }) => (
                <div
                  key={court.id}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                      style={{ background: court.color }}
                    >
                      {court.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-heading)]">
                        {court.name}
                      </p>
                      <p className="truncate text-xs text-[var(--text-caption)]">
                        {court.environment} · {formatIDR(court.priceOffPeak, true)}–
                        {formatIDR(court.pricePeak, true)}/jam
                      </p>
                    </div>
                    <span className="ml-auto shrink-0">
                      <ToneBadge tone="success">{slots.length} slot</ToneBadge>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.startSlot}
                        type="button"
                        onClick={() => pickSlot(court, s)}
                        className="group flex flex-col items-center rounded-xl border border-[var(--border-default)] px-3 py-2 text-center transition-all hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                        title={`Booking ${s.startLabel}–${s.endLabel}`}
                      >
                        <span className="flex items-center gap-1 text-sm font-semibold text-[var(--text-heading)]">
                          <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                          {s.startLabel}–{s.endLabel}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-caption)]">
                          {formatIDR(s.price, true)}
                          {s.hasPeak && <ToneBadge tone="primary">peak</ToneBadge>}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── Member-selection modal ── */}
      <ModalDialog
        isOpen={draft != null}
        onClose={() => setDraft(null)}
        title="Pilih Member"
        description={
          draft && searchedMeta
            ? `${draft.court.name} · ${searchedMeta.dateKey} · ${draft.slot.startLabel}–${draft.slot.endLabel}`
            : undefined
        }
        size="md"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--text-heading)]">
              {draft ? formatIDR(draft.slot.price) : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDraft(null)}>
                Batal
              </Button>
              <Button
                variant="primary"
                sheen
                disabled={!selectedMemberId}
                onClick={confirmBooking}
              >
                Konfirmasi Booking
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <InputLabel
              label="Member"
              tooltip="Cari member terdaftar. Jika belum ada, ketik namanya lalu klik tombol tambah member baru."
            />
            <UiSelect
              searchable
              addable
              placeholder="Cari nama member…"
              options={memberOptions}
              value={selectedMemberId}
              onChange={(v) => setSelectedMemberId(v as string)}
              onAddClick={(label) => {
                setPrefillName(label);
                setAddMemberOpen(true);
              }}
            />
            <p className="mt-1.5 text-xs text-[var(--text-caption)]">
              Tidak ketemu? Ketik nama lalu pilih “+ Tambah …” untuk daftar member baru.
            </p>
          </div>

          {draftMember && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                  style={{ background: memberTierMeta[draftMember.tier].color }}
                >
                  {memberTierMeta[draftMember.tier].label}
                </span>
                <span className="text-sm font-medium text-[var(--text-heading)]">
                  {draftMember.name}
                </span>
              </div>
              {draftMember.phone && (
                <p className="mt-1 text-xs text-[var(--text-caption)]">
                  {draftMember.phone}
                </p>
              )}
            </div>
          )}
        </div>
      </ModalDialog>

      {/* ── Quick add-member modal ── */}
      <QuickAddMemberModal
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        initialName={prefillName}
        onCreated={onMemberCreated}
      />
    </div>
  );
}
