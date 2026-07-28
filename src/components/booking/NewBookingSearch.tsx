"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  RefreshCw,
} from "lucide-react";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import EmptyState from "@/components/ui/feedback/EmptyState";
import UiSelect from "@/components/ui/select/Select";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { formatIDR } from "@/components/club-core/format";
import QuickAddMemberModal from "@/components/booking/QuickAddMemberModal";
import {
  getBookingAvailabilityAction,
  type AvailableBookingCourt,
  type BookingAvailabilityResult,
} from "@/app/(admin)/bookings/actions";
import {
  areSlotsConsecutive,
  dateKeyInTimeZone,
  groupSlotsByTimeGroups,
  normalizeSelectedSlots,
} from "@/lib/booking-flow";
import { dateKey as toDateKey } from "@/data/padel/club/bookings";
import type { TimeGroup } from "@/app/(admin)/settings/hours/group-actions";

interface MemberLite {
  id: string;
  name: string;
  phone: string;
  tier: string;
}

const initialDateKey = dateKeyInTimeZone();

interface NewBookingSearchProps {
  initialAvailability?: BookingAvailabilityResult["data"];
  initialMembers: MemberLite[];
  initialTimeGroups: TimeGroup[];
  initialError?: string;
}

export default function NewBookingSearch({
  initialAvailability,
  initialMembers,
  initialTimeGroups,
  initialError,
}: NewBookingSearchProps) {
  const router = useRouter();
  const toast = useToast();
  const [date, setDate] = useState(
    () => new Date(`${initialDateKey}T00:00:00`),
  );
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [availability, setAvailability] =
    useState<BookingAvailabilityResult["data"]>(initialAvailability);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(
    initialError ?? null,
  );
  const [members, setMembers] = useState<MemberLite[]>(initialMembers);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const availabilityRequest = useRef(0);

  const selectedDateKey = toDateKey(date);

  const loadAvailability = useCallback(
    async (dateKey: string, slots: number[], kind: "slots" | "courts") => {
      const requestId = ++availabilityRequest.current;
      if (kind === "slots") setLoadingSlots(true);
      else setLoadingCourts(true);
      setRequestError(null);
      try {
        const result = await getBookingAvailabilityAction({
          dateKey,
          selectedSlots: slots,
        });
        if (requestId !== availabilityRequest.current) return;
        if (!result.success || !result.data) {
          setRequestError(
            result.error?.message ??
              "Gagal memuat ketersediaan lapangan. Silakan coba kembali.",
          );
          return;
        }
        setAvailability(result.data);
        setSelectedCourtId((current) =>
          current &&
          !result.data!.courts.some((court) => court.id === current)
            ? null
            : current,
        );
      } catch {
        if (requestId !== availabilityRequest.current) return;
        setRequestError(
          "Gagal memuat ketersediaan lapangan. Silakan coba kembali.",
        );
      } finally {
        if (requestId === availabilityRequest.current) {
          setLoadingSlots(false);
          setLoadingCourts(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedSlots.length === 0) return;
    const timeout = window.setTimeout(() => {
      void loadAvailability(selectedDateKey, selectedSlots, "courts");
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [selectedDateKey, selectedSlots, loadAvailability]);

  const selectedCourt = availability?.courts.find(
    (court) => court.id === selectedCourtId,
  );
  const durationHours = (availability?.durationMinutes ?? 0) / 60;
  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: member.name,
        desc: member.phone || "tanpa telepon",
      })),
    [members],
  );
  const groupedSlots = useMemo(
    () =>
      groupSlotsByTimeGroups(
        availability?.slots ?? [],
        initialTimeGroups,
      ),
    [availability?.slots, initialTimeGroups],
  );

  const changeDate = (value: Date) => {
    const nextKey = toDateKey(value);
    setDate(value);
    setSelectedSlots([]);
    setSelectedCourtId(null);
    setAvailability(undefined);
    void loadAvailability(nextKey, [], "slots");
  };

  const toggleSlot = (startSlot: number) => {
    const selected = selectedSlots.includes(startSlot);
    const next = normalizeSelectedSlots(
      selected
        ? selectedSlots.filter((slot) => slot !== startSlot)
        : [...selectedSlots, startSlot],
    );
    if (next.length > 1 && !areSlotsConsecutive(next)) {
      toast.warning(
        "Pilih slot yang menempel pada waktu yang sudah dipilih.",
        "Slot harus berurutan",
      );
      return;
    }
    setSelectedCourtId(null);
    setSelectedSlots(next);
  };

  const openConfirmation = (court: AvailableBookingCourt) => {
    setSelectedCourtId(court.id);
    setSelectedMemberId("");
    setMemberModalOpen(true);
  };

  const continueToPayment = () => {
    if (!selectedCourt || !selectedMemberId || selectedSlots.length === 0) return;
    const params = new URLSearchParams({
      court: selectedCourt.id,
      date: selectedDateKey,
      slots: selectedSlots.join(","),
      member: selectedMemberId,
    });
    router.push(`/bookings/payment?${params.toString()}`);
  };

  const resetTime = () => {
    setSelectedSlots([]);
    setSelectedCourtId(null);
    void loadAvailability(selectedDateKey, [], "slots");
  };

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <div className="mb-5 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-[var(--color-primary)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-heading)]">
              Pilih tanggal
            </h2>
            <p className="text-xs text-[var(--text-caption)]">
              Slot yang sudah lewat otomatis tidak dapat dipilih.
            </p>
          </div>
        </div>
        <div className="max-w-sm">
          <DatePicker
            label="Tanggal main"
            mode="single"
            value={date}
            minDate={new Date(`${initialDateKey}T00:00:00`)}
            onChange={(value) => {
              if (value instanceof Date) changeDate(value);
            }}
          />
        </div>
      </Card>

      <section className="space-y-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--text-heading)]">
                Pilih waktu
              </h2>
              <p className="text-xs text-[var(--text-caption)]">
                Pilih satu atau beberapa slot 60 menit yang berurutan.
              </p>
            </div>
          </div>
          {selectedSlots.length > 0 && (
            <Button variant="ghost" size="sm" onClick={resetTime}>
              Reset
            </Button>
          )}
        </div>

        {loadingSlots ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-8">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded-lg bg-[var(--surface-muted)]"
              />
            ))}
          </div>
        ) : requestError && !availability ? (
          <EmptyState
            title="Jadwal gagal dimuat"
            description={requestError}
            action={
              <Button
                variant="outline"
                startIcon={<RefreshCw className="h-4 w-4" />}
                onClick={() =>
                  void loadAvailability(selectedDateKey, [], "slots")
                }
              >
                Coba lagi
              </Button>
            }
          />
        ) : availability?.slots.length === 0 ? (
          <EmptyState
            title="Tidak ada slot waktu"
            description="Tidak ada slot waktu yang tersedia pada tanggal ini."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,max-content)]">
            {groupedSlots.map((group) => (
              <section
                key={group.id}
                className="min-w-0 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] p-3 lg:w-fit"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                  <h3 className="text-sm font-semibold text-[var(--text-heading)]">
                    {group.name}
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">
                    {group.slots.length} slot
                  </span>
                </div>
                <div className="grid grid-cols-[repeat(2,minmax(0,7rem))] justify-start gap-1.5">
                  {group.slots.map((slot) => {
                    const active = selectedSlots.includes(slot.startSlot);
                    const disabled = !slot.available || slot.past;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleSlot(slot.startSlot)}
                        aria-label={`${slot.startTime}-${slot.endTime}, ${
                          slot.past
                            ? "sudah lewat"
                            : slot.available
                              ? `${slot.courtCount} lapangan tersedia`
                              : "penuh"
                        }`}
                        className={[
                          "relative flex h-11 w-full flex-col items-center justify-center rounded-lg border px-2 text-xs transition-colors",
                          active
                            ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                            : disabled
                              ? "cursor-not-allowed border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] opacity-60"
                              : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-heading)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]",
                        ].join(" ")}
                      >
                        <span className="truncate font-semibold leading-none">
                          {slot.startTime}
                        </span>
                        <span
                          className={[
                            "mt-0.5 truncate text-[10px] leading-none",
                            active
                              ? "text-white/80"
                              : "text-[var(--text-caption)]",
                          ].join(" ")}
                        >
                          {slot.past
                            ? "Lewat"
                            : slot.available
                              ? `${slot.courtCount} lap.`
                              : "Penuh"}
                        </span>
                        {active && (
                          <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        {selectedSlots.length > 0 && availability?.selectedStartTime && (
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--border-light)] pt-4 sm:max-w-md">
            <div>
              <p className="text-xs text-[var(--text-caption)]">Waktu dipilih</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-heading)]">
                {availability.selectedStartTime}-{availability.selectedEndTime}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-caption)]">Durasi</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-heading)]">
                {durationHours} jam
              </p>
            </div>
          </div>
        )}
      </section>

      {selectedSlots.length > 0 && (
        <Card padding="lg">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-[var(--color-primary)]" />
            <div>
              <h2 className="text-base font-semibold text-[var(--text-heading)]">
                Pilih lapangan
              </h2>
              <p className="text-xs text-[var(--text-caption)]">
                Hanya lapangan yang kosong selama seluruh durasi ditampilkan.
              </p>
            </div>
          </div>

          {loadingCourts ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--text-caption)]">
                Sedang mencari lapangan yang tersedia...
              </p>
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="h-20 animate-pulse rounded-lg bg-[var(--surface-muted)]"
                />
              ))}
            </div>
          ) : requestError ? (
            <EmptyState
              title="Ketersediaan gagal dimuat"
              description={requestError}
              action={
                <Button
                  variant="outline"
                  onClick={() =>
                    void loadAvailability(
                      selectedDateKey,
                      selectedSlots,
                      "courts",
                    )
                  }
                >
                  Coba lagi
                </Button>
              }
            />
          ) : availability?.courts.length === 0 ? (
            <EmptyState
              title="Tidak ada lapangan yang tersedia"
              description="Tidak ada lapangan yang tersedia untuk seluruh waktu yang dipilih. Silakan pilih waktu lain."
              action={
                <Button variant="outline" onClick={resetTime}>
                  Ubah pilihan waktu
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {availability?.courts.map((court) => (
                <button
                  key={court.id}
                  type="button"
                  onClick={() => openConfirmation(court)}
                  className="flex w-full items-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-left transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)]"
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                    style={{ backgroundColor: court.color }}
                  >
                    {court.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--text-heading)]">
                      {court.name}
                    </p>
                    <p className="truncate text-xs text-[var(--text-caption)]">
                      {court.environment} · {court.format} ·{" "}
                      {formatIDR(court.pricePerHour, true)}/jam
                    </p>
                  </div>
                  <span className="ml-auto flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-[var(--text-heading)]">
                      {formatIDR(court.price)}
                    </span>
                    <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                  </span>
                </button>
              ))}
          </div>
        )}
        </Card>
      )}

      <ModalDialog
        isOpen={memberModalOpen}
        onClose={() => setMemberModalOpen(false)}
        title="Konfirmasi booking"
        description="Pilih pelanggan sebelum melanjutkan ke pembayaran."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setMemberModalOpen(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              sheen
              disabled={!selectedMemberId || !selectedCourt}
              endIcon={<ChevronRight className="h-4 w-4" />}
              onClick={continueToPayment}
            >
              Lanjut pembayaran
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-[var(--surface-muted)] p-4">
            <div>
              <p className="text-xs text-[var(--text-caption)]">Tanggal</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-heading)]">
                {selectedDateKey}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-caption)]">Waktu</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-heading)]">
                {availability?.selectedStartTime}-{availability?.selectedEndTime}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-caption)]">Lapangan</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-heading)]">
                {selectedCourt?.name}
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-caption)]">Subtotal</p>
              <p className="mt-1 text-sm font-semibold text-[var(--text-heading)]">
                {formatIDR(selectedCourt?.price ?? 0)}
              </p>
            </div>
          </div>
          <UiSelect
            label="Pelanggan"
            options={memberOptions}
            value={selectedMemberId}
            searchable
            addable
            addLabelPrefix="Register"
            placeholder="Cari nama atau nomor telepon"
            onChange={(value) => setSelectedMemberId(String(value))}
            onAddClick={(query) => {
              setPrefillName(query);
              setAddMemberOpen(true);
            }}
          />
        </div>
      </ModalDialog>

      <QuickAddMemberModal
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        initialName={prefillName}
        onCreated={(member) => {
          setMembers((current) => [member, ...current]);
          setSelectedMemberId(member.id);
          setAddMemberOpen(false);
        }}
      />
    </div>
  );
}
