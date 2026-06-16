"use client";

// Coaching ▸ Coach Schedule — create & manage coaching schedules for members.
// Flow: pick member + package + start date + weekly cycle → Generate → review
// the auto-generated sessions (each gets an auto-assigned available coach) →
// override coaches / tweak the cycle and regenerate as needed → Submit.
//
// Coach assignment is SESSION-BASED: each session can have a different coach.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  CalendarDays,
  Sparkles,
  Trash2,
  AlertTriangle,
  Check,
  ArrowLeft,
  Clock,
} from "lucide-react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Select from "@/components/ui/select/Select";
import DatePicker from "@/components/ui/datepicker/DatePicker";
import TimePicker from "@/components/ui/datepicker/TimePicker";
import InputLabel from "@/components/ui/input/InputLabel";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { ModalDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast/ToastContext";
import { formatIDR } from "@/components/club-core/format";
import {
  getSchedulesAction,
  getCoachPackagesAction,
  getCoachingMemberOptionsAction,
  getCoachesAction,
  generateScheduleAction,
  getAvailableCoachesForSlotAction,
  createScheduleAction,
  deleteScheduleAction,
  reassignSessionCoachAction,
  type ScheduleRecord,
  type PackageRecord,
  type CoachRecord,
} from "@/app/(admin)/coaching/actions";
import {
  type CoachingCycle,
  generateSlots,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  WEEKDAY_LABELS,
} from "@/lib/coaching";

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtTime = (iso: string) => iso.slice(11, 16);

type View = "list" | "build";

export default function CoachScheduleManager() {
  const toast = useToast();
  const [view, setView] = useState<View>("list");

  // shared data
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [packages, setPackages] = useState<PackageRecord[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [coaches, setCoaches] = useState<CoachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<ScheduleRecord | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sch, pkg, mem, coa] = await Promise.all([
        getSchedulesAction(),
        getCoachPackagesAction({ activeOnly: true }),
        getCoachingMemberOptionsAction(),
        getCoachesAction(),
      ]);
      setSchedules(sch);
      setPackages(pkg);
      setMembers(mem);
      setCoaches(coa);
    } catch {
      toast.error("Gagal memuat data coaching.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    const res = await deleteScheduleAction(confirmDelete.id);
    setConfirmDelete(null);
    if (!res.success) {
      toast.error("Gagal menghapus jadwal.");
      return;
    }
    toast.info(`Jadwal ${confirmDelete.memberName} dihapus.`, "Terhapus");
    void loadAll();
  };

  const coachOptions = useMemo(
    () => coaches.map((c) => ({ value: c.id, label: c.name })),
    [coaches],
  );

  return (
    <PageScaffold
      title="Coach Schedule"
      subtitle="Buat & kelola jadwal coaching member. Sesi dibuat otomatis sesuai paket & siklus mingguan, dengan coach yang ditugaskan otomatis per sesi."
      requireAny={["coaching.view"]}
      actions={
        view === "list" ? (
          <Button
            variant="primary"
            sheen
            glow
            startIcon={<Plus className="h-4 w-4" />}
            onClick={() => setView("build")}
          >
            Jadwal Baru
          </Button>
        ) : (
          <Button variant="outline" startIcon={<ArrowLeft className="h-4 w-4" />} onClick={() => setView("list")}>
            Kembali ke daftar
          </Button>
        )
      }
    >
      {view === "build" ? (
        <ScheduleBuilder
          packages={packages}
          members={members}
          coaches={coaches}
          coachOptions={coachOptions}
          onCancel={() => setView("list")}
          onSaved={() => {
            setView("list");
            void loadAll();
          }}
        />
      ) : (
        <ScheduleList
          schedules={schedules}
          loading={loading}
          coachOptions={coachOptions}
          onDelete={(s) => setConfirmDelete(s)}
          onNew={() => setView("build")}
          onReassigned={loadAll}
        />
      )}

      <ModalDialog
        isOpen={confirmDelete != null}
        onClose={() => setConfirmDelete(null)}
        title="Hapus jadwal?"
        description={confirmDelete ? `Jadwal coaching "${confirmDelete.memberName}" beserta sesinya akan dihapus.` : undefined}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Batal</Button>
            <Button variant="primary" className="!bg-rose-500 hover:!bg-rose-600" onClick={doDelete}>Hapus</Button>
          </div>
        }
      >
        <p className="text-sm text-[var(--text-caption)]">Tindakan ini menghapus seluruh sesi pada jadwal tersebut.</p>
      </ModalDialog>
    </PageScaffold>
  );
}

/* ════════════════════════ LIST ════════════════════════ */

const statusMeta: Record<string, { label: string; color: "success" | "info" | "warning" | "error" | "neutral" }> = {
  active: { label: "Aktif", color: "success" },
  completed: { label: "Selesai", color: "info" },
  cancelled: { label: "Batal", color: "error" },
  scheduled: { label: "Terjadwal", color: "success" },
  no_coach: { label: "Tanpa coach", color: "warning" },
};

const ScheduleList: React.FC<{
  schedules: ScheduleRecord[];
  loading: boolean;
  coachOptions: { value: string; label: string }[];
  onDelete: (s: ScheduleRecord) => void;
  onNew: () => void;
  onReassigned: () => void;
}> = ({ schedules, loading, coachOptions, onDelete, onNew, onReassigned }) => {
  const toast = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);

  const reassign = async (sessionId: string, coachId: string | null) => {
    const res = await reassignSessionCoachAction(sessionId, coachId);
    if (!res.success) {
      toast.error("Gagal mengganti coach.");
      return;
    }
    toast.success("Coach diperbarui.");
    onReassigned();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
        ))}
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <EmptyState
        title="Belum ada jadwal coaching"
        description="Buat jadwal pertama untuk men-generate sesi otomatis berdasarkan paket & siklus mingguan."
        action={<Button variant="primary" onClick={onNew}>Jadwal Baru</Button>}
      />
    );
  }

  return (
    <div className="space-y-4">
      {schedules.map((s) => {
        const open = expanded === s.id;
        const noCoachCount = s.sessions.filter((x) => !x.coachId).length;
        const sm = statusMeta[s.status] ?? statusMeta.active;
        return (
          <Card key={s.id} padding="none" className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-[var(--color-primary)]">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div>
                  <h5 className="text-base font-bold text-[var(--text-heading)]">{s.memberName}</h5>
                  <p className="text-xs text-[var(--text-caption)]">
                    {s.packageName} · {s.totalSessions} sesi · mulai {fmtDate(s.startDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge size="sm" color={sm.color} variant="light">{sm.label}</Badge>
                {noCoachCount > 0 && (
                  <Badge size="sm" color="warning" variant="light">{noCoachCount} tanpa coach</Badge>
                )}
                <span className="text-sm font-semibold text-[var(--text-heading)]">{formatIDR(s.price)}</span>
                <Button size="sm" variant="outline" onClick={() => setExpanded(open ? null : s.id)}>
                  {open ? "Tutup" : "Lihat sesi"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="!text-rose-500 hover:!bg-rose-50 dark:hover:!bg-rose-500/10"
                  onClick={() => onDelete(s)}
                  aria-label="Hapus jadwal"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {open && (
              <div className="border-t border-[var(--border-light)] bg-[var(--surface-muted)]/40 p-5">
                <div className="space-y-2">
                  {s.sessions.map((x) => {
                    const xm = statusMeta[x.status] ?? statusMeta.scheduled;
                    return (
                      <div
                        key={x.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--surface-muted)] text-xs font-bold text-[var(--text-caption)]">
                            {x.sequence}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-heading)]">
                              {fmtDate(x.start)}
                            </p>
                            <p className="text-xs text-[var(--text-caption)]">
                              {fmtTime(x.start)}–{fmtTime(x.end)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!x.coachId && (
                            <Badge size="sm" color="warning" variant="light">Tanpa coach</Badge>
                          )}
                          <div className="w-44">
                            <Select
                              options={[{ value: "", label: "— Tanpa coach —" }, ...coachOptions]}
                              value={x.coachId ?? ""}
                              size="sm"
                              clearable={false}
                              onChange={(v) => reassign(x.id, (v as string) || null)}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
};

/* ════════════════════════ BUILDER ════════════════════════ */

const ScheduleBuilder: React.FC<{
  packages: PackageRecord[];
  members: { id: string; name: string; phone: string }[];
  coaches: CoachRecord[];
  coachOptions: { value: string; label: string }[];
  onCancel: () => void;
  onSaved: () => void;
}> = ({ packages, members, coaches, coachOptions, onCancel, onSaved }) => {
  const toast = useToast();

  const [memberId, setMemberId] = useState("");
  const [packageId, setPackageId] = useState(packages[0]?.id ?? "");
  const [startDate, setStartDate] = useState<Date>(new Date());
  // per-weekday times: day → "HH:MM". Presence of a key = that day is selected.
  const [dayTimes, setDayTimes] = useState<Record<number, string>>({
    1: "18:00",
    3: "18:00",
    5: "18:00",
  });

  // A draft session carries a stable uid so deleting/appending rows doesn't
  // scramble per-row state (coach dropdowns are keyed by uid, not index).
  type DraftSession = {
    uid: string;
    start: string;
    end: string;
    day: number;
    coachId: string | null;
    coachName: string | null;
    available: { id: string; name: string }[];
  };

  const [sessions, setSessions] = useState<DraftSession[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const memberOptions = members.map((m) => ({ value: m.id, label: m.name, desc: m.phone }));
  const packageOptions = packages.map((p) => ({
    value: p.id,
    label: p.name,
    desc: `${p.sessions} sesi · ${formatIDR(p.price)}`,
  }));

  const coachNameById = useMemo(
    () => new Map(coaches.map((c) => [c.id, c.name])),
    [coaches],
  );

  const selectedDays = useMemo(
    () => WEEKDAY_ORDER.filter((d) => dayTimes[d] !== undefined),
    [dayTimes],
  );

  const toggleDay = (d: number) => {
    setSessions(null); // invalidate preview when cycle changes
    setDayTimes((prev) => {
      const next = { ...prev };
      if (next[d] !== undefined) delete next[d];
      else next[d] = "18:00";
      return next;
    });
  };

  const setDayTime = (d: number, time: string) => {
    setSessions(null);
    setDayTimes((prev) => ({ ...prev, [d]: time }));
  };

  const cycle: CoachingCycle = {
    slots: selectedDays.map((d) => ({ day: d, time: dayTimes[d] })),
    durationMin: pkg?.durationMin ?? 60,
  };

  let uidSeq = 0;
  const nextUid = () => `s-${Date.now().toString(36)}-${uidSeq++}`;

  /** Build a draft session from a generated slot: fetch its available coaches
   * and keep/auto-pick a coach. */
  const buildDraft = async (
    slot: { start: string; end: string; day: number },
    preferredCoachId: string | null,
    preferredCoachName: string | null,
  ): Promise<DraftSession> => {
    let available: { id: string; name: string }[] = [];
    try {
      available = await getAvailableCoachesForSlotAction({ start: slot.start, end: slot.end });
    } catch {
      available = [];
    }
    // resolve the coach: keep preferred if still valid, else first available
    let coachId = preferredCoachId;
    let coachName = preferredCoachName;
    if (coachId && !available.some((c) => c.id === coachId)) {
      // keep it visible in its own dropdown even if filtered out
      available = [{ id: coachId, name: coachName ?? coachNameById.get(coachId) ?? "—" }, ...available];
    } else if (!coachId && available.length > 0) {
      coachId = available[0].id;
      coachName = available[0].name;
    }
    return {
      uid: nextUid(),
      start: slot.start,
      end: slot.end,
      day: slot.day,
      coachId,
      coachName,
      available,
    };
  };

  const generate = async () => {
    if (!packageId) {
      toast.error("Pilih paket dulu.", "Belum lengkap");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Pilih minimal satu hari siklus.", "Belum lengkap");
      return;
    }
    setGenerating(true);
    const res = await generateScheduleAction({
      packageId,
      startDate: dateKey(startDate),
      cycle,
    });
    if (!res.success) {
      setGenerating(false);
      toast.error(res.error || "Gagal generate sesi.");
      return;
    }
    const drafts = await Promise.all(
      res.sessions.map((s) =>
        buildDraft({ start: s.start, end: s.end, day: s.day }, s.coachId, s.coachName),
      ),
    );
    setSessions(drafts);
    setGenerating(false);
    const noCoach = drafts.filter((s) => !s.coachId).length;
    if (noCoach > 0) {
      toast.warning(`${noCoach} sesi belum punya coach. Ubah siklus, hapus sesi, atau pilih coach manual.`, "Perlu perhatian");
    } else {
      toast.success("Sesi berhasil dibuat. Tinjau sebelum simpan.");
    }
  };

  /** Inline coach assignment for a previewed session. */
  const assignCoach = (uid: string, coachId: string | null) => {
    setSessions((prev) =>
      prev
        ? prev.map((s) =>
            s.uid === uid
              ? { ...s, coachId, coachName: coachId ? coachNameById.get(coachId) ?? null : null }
              : s,
          )
        : prev,
    );
  };

  /**
   * Delete / skip a draft session. To keep the package's session COUNT intact,
   * a replacement session is appended at the NEXT cycle date after the current
   * last session — so the rest of the schedule simply shifts forward by one
   * occurrence, no full regenerate needed.
   */
  const deleteSession = async (uid: string) => {
    if (!sessions) return;
    const remaining = sessions.filter((s) => s.uid !== uid);
    // Anchor the replacement AFTER the latest date in the FULL current list
    // (including the deleted one) so it always extends past the current end —
    // otherwise deleting the last row would regenerate the same date.
    const lastStart = sessions.reduce(
      (max, s) => (s.start > max ? s.start : max),
      sessions[0]?.start ?? `${dateKey(startDate)}T00:00:00`,
    );
    const afterDate = new Date(lastStart);
    afterDate.setDate(afterDate.getDate() + 1);
    const [nextSlot] = generateSlots(afterDate, cycle, 1);

    let appended: DraftSession | null = null;
    if (nextSlot) {
      appended = await buildDraft(
        { start: nextSlot.start, end: nextSlot.end, day: nextSlot.day },
        null,
        null,
      );
    }
    const next = appended ? [...remaining, appended] : remaining;
    // keep chronological order
    next.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    setSessions(next);
    toast.info(
      appended
        ? "Sesi dihapus — jadwal digeser ke pertemuan berikutnya."
        : "Sesi dihapus.",
    );
  };

  const submit = async () => {
    if (!sessions || saving) return;
    if (!memberId) {
      toast.error("Pilih member.", "Belum lengkap");
      return;
    }
    setSaving(true);
    const res = await createScheduleAction({
      memberId,
      packageId,
      startDate: dateKey(startDate),
      cycle,
      sessions: sessions.map((s, i) => ({
        sequence: i + 1,
        start: s.start,
        end: s.end,
        coachId: s.coachId,
      })),
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan jadwal.");
      return;
    }
    toast.success("Jadwal coaching tersimpan.", "Berhasil");
    onSaved();
  };

  const noCoachCount = sessions?.filter((s) => !s.coachId).length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ── Config ── */}
      <div className="lg:col-span-1">
        <Card padding="lg" className="lg:sticky lg:top-24">
          <h3 className="mb-4 text-base font-semibold text-[var(--text-heading)]">Pengaturan Jadwal</h3>
          <div className="space-y-5">
            <Select
              label="Member"
              labelInfo="Member yang akan mengikuti paket coaching."
              options={memberOptions}
              value={memberId}
              searchable
              placeholder="Pilih member"
              onChange={(v) => setMemberId(v as string)}
            />
            <Select
              label="Paket coaching"
              labelInfo="Jumlah sesi & durasi mengikuti paket."
              options={packageOptions}
              value={packageId}
              placeholder="Pilih paket"
              clearable={false}
              onChange={(v) => {
                setPackageId(v as string);
                setSessions(null);
              }}
            />
            <DatePicker
              label="Tanggal mulai"
              labelInfo="Sesi pertama mulai pada/atau setelah tanggal ini sesuai siklus."
              mode="single"
              value={startDate}
              onChange={(v) => {
                if (v instanceof Date) {
                  setStartDate(v);
                  setSessions(null);
                }
              }}
            />
            <div>
              <InputLabel
                label="Hari & jam siklus mingguan"
                tooltip="Pilih hari dalam seminggu. Tiap hari punya jamnya sendiri (mis. Rabu 13:00, Jumat 14:00)."
              />
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAY_ORDER.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={[
                      "h-9 w-11 rounded-lg text-xs font-semibold transition-colors",
                      dayTimes[d] !== undefined
                        ? "bg-[var(--color-primary)] text-white"
                        : "bg-[var(--surface-muted)] text-[var(--text-caption)] hover:text-[var(--text-heading)]",
                    ].join(" ")}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                ))}
              </div>

              {/* per-day time rows */}
              {selectedDays.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {selectedDays.map((d) => (
                    <div
                      key={d}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-[var(--text-heading)]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
                          {WEEKDAY_SHORT[d]}
                        </span>
                        {WEEKDAY_LABELS[d]}
                      </span>
                      <div className="w-32">
                        <TimePicker
                          value={dayTimes[d]}
                          minuteStep={30}
                          placeholder="Jam"
                          onChange={(v) => setDayTime(d, v || "18:00")}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">
                  Belum ada hari dipilih.
                </p>
              )}
            </div>
            {pkg && (
              <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-caption)]">
                <div className="flex justify-between">
                  <span>Total sesi</span>
                  <span className="font-semibold text-[var(--text-heading)]">{pkg.sessions}x</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Durasi / sesi</span>
                  <span className="font-semibold text-[var(--text-heading)]">{pkg.durationMin} menit</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Biaya paket</span>
                  <span className="font-semibold text-[var(--text-heading)]">{formatIDR(pkg.price)}</span>
                </div>
              </div>
            )}

            <Button
              variant="primary"
              sheen
              fullWidth
              startIcon={<Sparkles className="h-4 w-4" />}
              onClick={generate}
              disabled={generating}
            >
              {generating ? "Membuat sesi…" : sessions ? "Generate ulang" : "Generate sesi"}
            </Button>
          </div>
        </Card>
      </div>

      {/* ── Review ── */}
      <div className="lg:col-span-2">
        <Card padding="lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold text-[var(--text-heading)]">Tinjau Sesi</h3>
            {sessions && (
              <span className="text-xs text-[var(--text-caption)]">{sessions.length} sesi</span>
            )}
          </div>

          {!sessions ? (
            <EmptyState
              title="Belum ada sesi"
              description="Atur paket & siklus di kiri, lalu klik Generate sesi untuk melihat hasilnya di sini."
            />
          ) : (
            <>
              {noCoachCount > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {noCoachCount} sesi belum ada coach tersedia. Ubah hari/jam siklus lalu generate ulang,
                    atau pilih coach manual per sesi.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {sessions.map((s, idx) => {
                  const options = [
                    { value: "", label: "— Tanpa coach —" },
                    ...s.available.map((c) => ({ value: c.id, label: c.name })),
                  ];
                  return (
                    <div
                      key={s.uid}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-light)] text-xs font-bold text-[var(--color-primary)]">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-heading)]">
                            {WEEKDAY_LABELS[s.day]}, {fmtDate(s.start)}
                          </p>
                          <p className="flex items-center gap-1 text-xs text-[var(--text-caption)]">
                            <Clock className="h-3 w-3" /> {fmtTime(s.start)}–{fmtTime(s.end)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!s.coachId && (
                          <Badge size="sm" color="warning" variant="light">Tanpa coach</Badge>
                        )}
                        <div className="w-52">
                          <Select
                            options={options}
                            value={s.coachId ?? ""}
                            size="sm"
                            searchable
                            clearable={false}
                            placeholder={s.available.length ? "Pilih coach" : "Tidak ada coach tersedia"}
                            onChange={(v) => assignCoach(s.uid, (v as string) || null)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteSession(s.uid)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-500/10"
                          aria-label="Hapus sesi & geser ke pertemuan berikutnya"
                          title="Hapus / lewati sesi ini — jadwal digeser ke pertemuan berikutnya"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--border-default)] pt-5">
                <Button variant="outline" onClick={onCancel}>Batal</Button>
                <Button
                  variant="primary"
                  sheen
                  glow
                  startIcon={<Check className="h-4 w-4" />}
                  onClick={submit}
                  disabled={saving}
                >
                  {saving ? "Menyimpan…" : "Konfirmasi & Simpan Jadwal"}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
