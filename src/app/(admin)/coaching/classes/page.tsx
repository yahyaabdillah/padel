"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatIDR } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { ModalDialog } from "@/components/ui/modal";
import { useNotifications } from "@/context/NotificationContext";
import ClassChip from "@/components/classes/ClassChip";
import ClassFormDrawer from "@/components/classes/ClassFormDrawer";
import ClassEnrollDrawer from "@/components/classes/ClassEnrollDrawer";
import {
  coachById,
  weekDays,
  dayFull,
  seedManagedClasses,
  toDraft,
  nextChipColor,
  classStatusMeta,
  STORAGE_KEY,
  type ManagedClass,
  type ClassDraft,
  type WeekDay,
} from "@/data/padel/engage/classes";
import { memberById } from "@/data/padel/club/members";

const genId = () =>
  `cls-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

const CalendarIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const SeatIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>
);
const CashIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.66 0-3 .9-3 2s1.34 2 3 2 3 .9 3 2-1.34 2-3 2m0-8V6m0 10v-2m0 2c1.66 0 3-.9 3-2M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
);

export default function ClassesPage() {
  const { push } = useNotifications();
  const [view, setView] = useState("week");
  const [classes, setClasses] = useState<ManagedClass[]>(() => seedManagedClasses());

  // manage modal target (id) + the two drawers
  const [manageId, setManageId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editTarget, setEditTarget] = useState<{ id: string; draft: ClassDraft } | null>(null);
  const [enrollId, setEnrollId] = useState<string | null>(null);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ManagedClass[];
        if (Array.isArray(parsed) && parsed.length) setClasses(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: ManagedClass[]) => {
    setClasses(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const manageTarget = manageId ? classes.find((c) => c.id === manageId) ?? null : null;
  const enrollTarget = enrollId ? classes.find((c) => c.id === enrollId) ?? null : null;

  /* ── CRUD ── */
  const handleCreate = (draft: ClassDraft) => {
    const created: ManagedClass = {
      ...draft,
      id: genId(),
      enrolled: 0,
      color: nextChipColor(classes.length),
      status: "active",
    };
    persist([created, ...classes]);
    setFormOpen(false);
    push({
      type: "system",
      title: "Class created",
      message: `${created.title} added to the ${dayFull[created.day]} schedule.`,
    });
  };

  const handleEdit = (draft: ClassDraft) => {
    if (!editTarget) return;
    persist(
      classes.map((c) =>
        c.id === editTarget.id
          ? { ...c, ...draft, enrolled: Math.min(c.enrolled, draft.capacity) }
          : c,
      ),
    );
    setFormOpen(false);
    setEditTarget(null);
    push({
      type: "system",
      title: "Class updated",
      message: `${draft.title} schedule saved.`,
    });
  };

  const toggleCancel = (cls: ManagedClass) => {
    const nextStatus = cls.status === "active" ? "cancelled" : "active";
    persist(
      classes.map((c) => (c.id === cls.id ? { ...c, status: nextStatus } : c)),
    );
    setManageId(null);
    push({
      type: "system",
      title: nextStatus === "cancelled" ? "Class cancelled" : "Class reactivated",
      message: `${cls.title} is now ${nextStatus}.`,
    });
  };

  const handleDelete = (cls: ManagedClass) => {
    persist(classes.filter((c) => c.id !== cls.id));
    setManageId(null);
    push({
      type: "system",
      title: "Class removed",
      message: `${cls.title} deleted from the schedule.`,
    });
  };

  /* ── Enrollment ── */
  const handleEnroll = (args: {
    memberId: string;
    finalPrice: number;
    discount: number;
    promoCode: string;
  }) => {
    if (!enrollTarget) return;
    persist(
      classes.map((c) =>
        c.id === enrollTarget.id
          ? { ...c, enrolled: Math.min(c.capacity, c.enrolled + 1) }
          : c,
      ),
    );
    const member = memberById(args.memberId);
    setEnrollId(null);
    push({
      type: "payment",
      title: "Enrollment confirmed",
      message: `${member?.name ?? "Member"} enrolled in ${enrollTarget.title} — ${formatIDR(args.finalPrice)}${
        args.discount > 0 ? ` (saved ${formatIDR(args.discount)}${args.promoCode ? ` · ${args.promoCode}` : ""})` : ""
      }.`,
    });
  };

  const openCreate = () => {
    setFormMode("create");
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (cls: ManagedClass) => {
    setFormMode("edit");
    setEditTarget({ id: cls.id, draft: toDraft(cls) });
    setManageId(null);
    setFormOpen(true);
  };

  const openEnroll = (cls: ManagedClass) => {
    setManageId(null);
    setEnrollId(cls.id);
  };

  /* ── Derived ── */
  const activeClasses = useMemo(
    () => classes.filter((c) => c.status === "active"),
    [classes],
  );

  const byDay = useMemo(() => {
    const map: Record<WeekDay, ManagedClass[]> = {
      Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [], Sun: [],
    };
    classes.forEach((c) => map[c.day].push(c));
    weekDays.forEach((d) => map[d].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [classes]);

  const stats = useMemo(() => {
    const seats = activeClasses.reduce((s, c) => s + c.capacity, 0);
    const enrolled = activeClasses.reduce((s, c) => s + c.enrolled, 0);
    const weeklyRevenue = activeClasses.reduce((s, c) => s + c.enrolled * c.pricePerSession, 0);
    return {
      total: activeClasses.length,
      fill: seats ? Math.round((enrolled / seats) * 100) : 0,
      enrolled,
      seats,
      weeklyRevenue,
    };
  }, [activeClasses]);

  return (
    <PageScaffold
      title="Classes & Clinics"
      subtitle="Weekly group classes, clinics and academy programs. Tap a class to enroll, edit or cancel."
      requireAny={["coaching.view"]}
      actions={
        <>
          <Tabs
            variant="segment"
            size="sm"
            value={view}
            onChange={setView}
            items={[
              { value: "week", label: "Week" },
              { value: "list", label: "List" },
            ]}
          />
          <Button
            variant="primary"
            sheen
            startIcon={<span className="text-base leading-none">+</span>}
            onClick={openCreate}
          >
            New Class
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Classes" value={stats.total} icon={<CalendarIcon />} accent="primary" />
          <StatCard label="Seats Filled" value={`${stats.enrolled}/${stats.seats}`} icon={<SeatIcon />} accent="secondary" />
          <StatCard label="Fill Rate" value={`${stats.fill}%`} icon={<SeatIcon />} accent="accent" delta="+6%" hint="vs last week" />
          <StatCard label="Weekly Revenue" value={formatIDR(stats.weeklyRevenue, true)} icon={<CashIcon />} accent="amber" delta="+9%" hint="vs last week" />
        </div>

        {view === "week" ? (
          <Card padding="md" title="This Week" desc="Group classes & clinics across all courts">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {weekDays.map((day) => (
                <div key={day} className="rounded-xl bg-[var(--surface-muted)]/50 p-2">
                  <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-caption)]">
                    {day}
                  </p>
                  <div className="space-y-2">
                    {byDay[day].length === 0 ? (
                      <p className="px-1 py-4 text-center text-[11px] text-[var(--text-muted)]">No classes</p>
                    ) : (
                      byDay[day].map((cls) => (
                        <ClassChip key={cls.id} cls={cls} onClick={() => setManageId(cls.id)} />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {classes.map((cls) => {
              const coach = coachById(cls.coachId);
              const full = cls.enrolled >= cls.capacity;
              const cancelled = cls.status === "cancelled";
              return (
                <Card key={cls.id} hover padding="md" className="cursor-pointer">
                  <div onClick={() => setManageId(cls.id)} className={cancelled ? "opacity-65" : ""}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className={`font-semibold text-[var(--text-heading)] ${cancelled ? "line-through" : ""}`}>
                          {cls.title}
                        </h4>
                        <p className="text-xs text-[var(--text-caption)]">{dayFull[cls.day]} · {cls.startTime}–{cls.endTime}</p>
                      </div>
                      <Badge size="sm" color={cancelled ? "error" : "primary"} variant="light">
                        {cancelled ? "Cancelled" : cls.type}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <EngageAvatar src={coach?.avatar} name={coach?.name ?? ""} size={28} />
                      <span className="text-xs text-[var(--text-body)]">{coach?.name}</span>
                      <span className="ml-auto text-xs text-[var(--text-muted)]">{cls.court}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge size="sm" color="neutral" variant="light">{cls.level}</Badge>
                      <span className={`text-xs font-semibold ${full ? "text-rose-500" : "text-emerald-500"}`}>
                        {cls.enrolled}/{cls.capacity} enrolled
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Manage modal — FEW actions → Modal (per UI rule) */}
      <ModalDialog
        isOpen={!!manageTarget}
        onClose={() => setManageId(null)}
        title={manageTarget?.title}
        description={
          manageTarget
            ? `${dayFull[manageTarget.day]} · ${manageTarget.startTime}–${manageTarget.endTime} · ${manageTarget.court}`
            : ""
        }
        size="md"
      >
        {manageTarget && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge color={classStatusMeta[manageTarget.status].tone} variant="light">
                {classStatusMeta[manageTarget.status].label}
              </Badge>
              <Badge color="primary" variant="light">{manageTarget.type}</Badge>
              <Badge color="secondary" variant="light">{manageTarget.level}</Badge>
              <Badge color="neutral" variant="light">{formatIDR(manageTarget.pricePerSession)} / session</Badge>
            </div>

            {(() => {
              const coach = coachById(manageTarget.coachId);
              return (
                <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-muted)] p-3">
                  <EngageAvatar src={coach?.avatar} name={coach?.name ?? ""} size={44} />
                  <div>
                    <p className="font-semibold text-[var(--text-heading)]">{coach?.name}</p>
                    <p className="text-xs text-[var(--color-primary)]">{coach?.level}</p>
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-caption)]">Enrollment</span>
                <span className="font-semibold text-[var(--text-heading)]">
                  {manageTarget.enrolled}/{manageTarget.capacity}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)] transition-all"
                  style={{ width: `${Math.min(100, (manageTarget.enrolled / manageTarget.capacity) * 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                variant="primary"
                sheen
                fullWidth
                disabled={manageTarget.status !== "active" || manageTarget.enrolled >= manageTarget.capacity}
                onClick={() => openEnroll(manageTarget)}
              >
                {manageTarget.enrolled >= manageTarget.capacity ? "Class Full" : "Enroll Member"}
              </Button>
              <Button variant="outline" fullWidth onClick={() => openEdit(manageTarget)}>
                Edit
              </Button>
              <Button variant="ghost" fullWidth onClick={() => toggleCancel(manageTarget)}>
                {manageTarget.status === "active" ? "Cancel Class" : "Reactivate"}
              </Button>
              <Button
                variant="outline"
                fullWidth
                className="!border-rose-300 !text-rose-600 hover:!bg-rose-50 dark:!border-rose-500/40 dark:!text-rose-400"
                onClick={() => handleDelete(manageTarget)}
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Create / Edit drawer */}
      <ClassFormDrawer
        isOpen={formOpen}
        mode={formMode}
        initial={editTarget?.draft}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        onSubmit={formMode === "create" ? handleCreate : handleEdit}
      />

      {/* Enroll drawer */}
      <ClassEnrollDrawer
        isOpen={!!enrollTarget}
        cls={enrollTarget}
        onClose={() => setEnrollId(null)}
        onEnroll={handleEnroll}
      />
    </PageScaffold>
  );
}
