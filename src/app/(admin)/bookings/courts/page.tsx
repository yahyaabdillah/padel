"use client";

// PadelHub — New Booking step 2: court selection (separate page).
// Reached from /bookings/search after picking a date + start time. Lists every
// active court available at that exact slot. Internal team clicks a court →
// member-selection modal (searchable + "+ Register" addable) → payment page.

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Card from "@/components/ui/card/Card";
import Button from "@/components/ui/button/Button";
import UiSelect from "@/components/ui/select/Select";
import InputLabel from "@/components/ui/input/InputLabel";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import ToneBadge from "@/components/club-core/ToneBadge";
import { formatIDR } from "@/components/club-core/format";
import {
  ClubDataProvider,
  useClubData,
} from "@/components/club-core/ClubDataContext";
import QuickAddMemberModal from "@/components/booking/QuickAddMemberModal";
import { getMemberOptionsAction } from "@/app/(admin)/members/actions";
import {
  type Court,
  courtAvailableSlots,
  slotLabel,
  occupiedSlotsFor,
  type BlockingWindow,
} from "@/data/padel/club/courts";

const SESSION_MINUTES = 60;

/** A bookable member (from DB). */
interface MemberLite {
  id: string;
  name: string;
  phone: string;
  tier: string;
}

interface CourtOption {
  court: Court;
  price: number;
  hasPeak: boolean;
}

function CourtPickerInner() {
  const router = useRouter();
  const toast = useToast();
  const params = useSearchParams();
  const { courts, bookings, maintenance, isReady } = useClubData();

  const bookingDate = params.get("date") ?? "";
  const startSlot = Number(params.get("slot") ?? "-1");
  const startLabel = startSlot >= 0 ? slotLabel(startSlot) : "";
  const endLabel = startSlot >= 0 ? slotLabel(startSlot + SESSION_MINUTES / 30) : "";

  // members loaded live from the tenant DB
  const [members, setMembers] = useState<MemberLite[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const rows = await getMemberOptionsAction();
        setMembers(rows);
      } catch {
        /* ignore — empty list */
      }
    })();
  }, []);

  // courts available at the exact chosen slot
  const available: CourtOption[] = useMemo(() => {
    if (startSlot < 0 || !bookingDate) return [];
    const day = new Date(`${bookingDate}T00:00:00`).getDay();
    const activeCourts = courts.filter((c) => c.status === "active");
    const blockers: BlockingWindow[] = [
      ...bookings
        .filter((b) => b.status !== "cancelled")
        .map((b) => ({ courtId: b.courtId, start: b.start, end: b.end })),
      ...maintenance.map((m) => ({ courtId: m.courtId, start: m.start, end: m.end })),
    ];
    const out: CourtOption[] = [];
    for (const court of activeCourts) {
      const occupied = occupiedSlotsFor(court.id, bookingDate, blockers);
      const slot = courtAvailableSlots(
        court,
        day,
        SESSION_MINUTES,
        occupied,
        SESSION_MINUTES,
      ).find((s) => s.startSlot === startSlot);
      if (slot) out.push({ court, price: slot.price, hasPeak: slot.hasPeak });
    }
    return out;
  }, [courts, bookings, maintenance, bookingDate, startSlot]);

  // member-selection flow
  const [pickedCourt, setPickedCourt] = useState<CourtOption | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [prefillName, setPrefillName] = useState("");

  const memberOptions = useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.name,
        desc: m.phone || "tanpa telepon",
      })),
    [members],
  );

  const onMemberCreated = (member: { id: string; name: string; phone: string; tier: string }) => {
    setMembers((prev) => [member, ...prev]);
    setSelectedMemberId(member.id);
    toast.success(`${member.name} ditambahkan`, "Member baru");
  };

  const pickCourt = (opt: CourtOption) => {
    setPickedCourt(opt);
    setSelectedMemberId("");
  };

  const confirmMember = () => {
    if (!pickedCourt || !selectedMemberId) return;
    const member = members.find((m) => m.id === selectedMemberId);
    if (!member) return;
    const next = new URLSearchParams({
      court: pickedCourt.court.id,
      date: bookingDate,
      slots: String(startSlot),
      member: member.id,
    });
    router.push(`/bookings/payment?${next.toString()}`);
  };

  const draftMember = members.find((m) => m.id === selectedMemberId);

  if (!isReady) {
    return (
      <Card padding="lg">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded-lg bg-[var(--surface-muted)]" />
          <div className="h-40 w-full animate-pulse rounded-xl bg-[var(--surface-muted)]" />
        </div>
      </Card>
    );
  }

  if (startSlot < 0 || !bookingDate) {
    return (
      <Card padding="lg">
        <div className="py-10 text-center">
          <p className="text-sm text-[var(--text-caption)]">
            Data pencarian tidak lengkap atau sudah kedaluwarsa.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={() => router.push("/bookings/search")}>
              Kembali ke pencarian
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card padding="lg">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-heading)]">
              Pilih lapangan
            </h3>
            <p className="mt-0.5 text-xs text-[var(--text-caption)]">
              {bookingDate} · {startLabel}–{endLabel} · {available.length} lapangan tersedia
            </p>
          </div>
          <Button
            variant="outline"
            startIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => router.push("/bookings/search")}
          >
            Ganti jam
          </Button>
        </div>

        {available.length === 0 ? (
          <EmptyState
            title="Tidak ada lapangan tersedia"
            description="Semua lapangan di jam ini sudah terisi. Kembali dan pilih jam lain."
          />
        ) : (
          <div className="space-y-3">
            {available.map(({ court, price, hasPeak }) => (
              <button
                key={court.id}
                type="button"
                onClick={() => pickCourt({ court, price, hasPeak })}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-left transition-all hover:border-[var(--color-primary)] hover:ring-1 hover:ring-[var(--color-primary)]"
              >
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
                    {court.environment} · {court.wall} · {court.format}
                  </p>
                </div>
                <span className="ml-auto flex shrink-0 items-center gap-2">
                  {hasPeak && <ToneBadge tone="primary">peak</ToneBadge>}
                  <span className="text-sm font-bold text-[var(--text-heading)]">
                    {formatIDR(price, true)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ── Member-selection modal ── */}
      <ModalDialog
        isOpen={pickedCourt != null}
        onClose={() => setPickedCourt(null)}
        title="Pilih Member"
        description={
          pickedCourt
            ? `${pickedCourt.court.name} · ${bookingDate} · ${startLabel}–${endLabel}`
            : undefined
        }
        size="md"
        footer={
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[var(--text-heading)]">
              {pickedCourt ? formatIDR(pickedCourt.price) : ""}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPickedCourt(null)}>
                Batal
              </Button>
              <Button
                variant="primary"
                sheen
                disabled={!selectedMemberId}
                onClick={confirmMember}
              >
                Lanjut Bayar
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <InputLabel
              label="Member"
              tooltip="Cari member terdaftar. Jika belum ada, ketik namanya lalu klik tombol register member."
            />
            <UiSelect
              searchable
              addable
              addLabelPrefix="Register"
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
              Tidak ketemu? Ketik nama lalu pilih “+ Register …” untuk daftar member baru.
            </p>
          </div>

          {draftMember && (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-3">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-full bg-[var(--color-primary)] px-2 py-0.5 text-xs font-semibold text-white">
                  Member
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

      {/* ── Quick register-member modal ── */}
      <QuickAddMemberModal
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        initialName={prefillName}
        onCreated={onMemberCreated}
      />
    </div>
  );
}

export default function BookingCourtsPage() {
  return (
    <ClubDataProvider>
      <div>
        <PageBreadcrumb pageTitle="Pilih Lapangan" />
        <Suspense fallback={null}>
          <CourtPickerInner />
        </Suspense>
      </div>
    </ClubDataProvider>
  );
}
