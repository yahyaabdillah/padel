"use client";

import React, { useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatIDR } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import { ModalDialog } from "@/components/ui/modal";
import BarChart from "@/components/ui/chart/BarChart";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  coaches,
  coachingEarningsTrend,
  type Coach,
  type CoachStatus,
} from "@/data/padel/engage/coaches";

const StarIcon = () => (
  <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 00.95.69h4.4c.97 0 1.37 1.24.59 1.81l-3.56 2.59a1 1 0 00-.36 1.12l1.36 4.18c.3.92-.76 1.69-1.54 1.12l-3.56-2.59a1 1 0 00-1.18 0l-3.56 2.59c-.78.57-1.84-.2-1.54-1.12l1.36-4.18a1 1 0 00-.36-1.12L1.4 9.6c-.78-.57-.38-1.81.59-1.81h4.4a1 1 0 00.95-.69L9.05 2.93z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" /></svg>
);
const WalletIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 12V7H5a2 2 0 010-4h14v4M3 5v14a2 2 0 002 2h16v-5M18 12a2 2 0 100 4h4v-4h-4z" /></svg>
);
const ClockIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const WhistleIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 11a6 6 0 1112 0 6 6 0 01-12 0zm12-1l6-3m-6 5h6" /></svg>
);

const statusMeta: Record<CoachStatus, { label: string; tone: "success" | "warning" }> = {
  active: { label: "Active", tone: "success" },
  on_leave: { label: "On Leave", tone: "warning" },
};

export default function CoachingPage() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Coach | null>(null);
  const toast = useToast();

  const filtered = useMemo(() => {
    if (filter === "active") return coaches.filter((c) => c.status === "active");
    if (filter === "leave") return coaches.filter((c) => c.status === "on_leave");
    return coaches;
  }, [filter]);

  const totals = useMemo(() => {
    const active = coaches.filter((c) => c.status === "active").length;
    const earnings = coaches.reduce((s, c) => s + c.earningsThisMonth, 0);
    const sessions = coaches.reduce((s, c) => s + c.sessionsThisMonth, 0);
    const hours = coaches.reduce((s, c) => s + c.hoursThisMonth, 0);
    return { active, earnings, sessions, hours };
  }, []);

  return (
    <PageScaffold
      title="Coaches"
      subtitle="Your coaching roster, monthly activity and earnings at a glance."
      requireAny={["coaching.view"]}
      actions={
        <Button
          variant="primary"
          sheen
          startIcon={<span className="text-base leading-none">+</span>}
          onClick={() =>
            toast.info("Coach onboarding flow coming soon — invite link sent to roster.", "Add Coach")
          }
        >
          Add Coach
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active Coaches" value={totals.active} icon={<UsersIcon />} accent="primary" delta="+1" hint="vs last month" />
          <StatCard label="Sessions (MTD)" value={totals.sessions} icon={<WhistleIcon />} accent="secondary" delta="+12%" hint="vs last month" />
          <StatCard label="Coaching Hours" value={`${totals.hours}h`} icon={<ClockIcon />} accent="accent" delta="+8%" hint="vs last month" />
          <StatCard label="Earnings (MTD)" value={formatIDR(totals.earnings, true)} icon={<WalletIcon />} accent="amber" delta="+15%" hint="vs last month" />
        </div>

        {/* Earnings chart */}
        <Card title="Coaching Revenue" desc="Classes vs personal training (IDR millions, last 6 months)">
          <BarChart
            categories={coachingEarningsTrend.categories}
            series={coachingEarningsTrend.series}
            colors={["#6D5BFF", "#14B8A6"]}
            stacked
            height={300}
          />
        </Card>

        {/* Roster */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">Coaching Roster</h3>
          <Tabs
            variant="segment"
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "All", badge: coaches.length },
              { value: "active", label: "Active" },
              { value: "leave", label: "On Leave" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((coach) => (
            <Card key={coach.id} variant="accent-top" hover padding="md" className="flex flex-col">
              <div className="flex items-start gap-3">
                <EngageAvatar src={coach.avatar} name={coach.name} size={52} ring />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="truncate font-semibold text-[var(--text-heading)]">{coach.name}</h4>
                    <Badge size="sm" color={statusMeta[coach.status].tone} variant="light" dot>
                      {statusMeta[coach.status].label}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-[var(--color-primary)]">{coach.level}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-[var(--text-caption)]">
                    <StarIcon />
                    <span className="font-semibold text-[var(--text-heading)]">{coach.rating.toFixed(1)}</span>
                    <span>({coach.reviews})</span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {coach.specialties.map((s) => (
                  <span key={s} className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-caption)]">
                    {s}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-[var(--surface-muted)] p-3 text-center">
                <div>
                  <p className="text-sm font-bold text-[var(--text-heading)]">{coach.sessionsThisMonth}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Sessions</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-heading)]">{coach.activeClients}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Clients</p>
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-heading)]">{formatIDR(coach.earningsThisMonth, true)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Earned</p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                fullWidth
                className="mt-4"
                onClick={() => setSelected(coach)}
              >
                View Profile
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <ModalDialog
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description={selected ? `${selected.level} · joined ${new Date(selected.joinedAt).getFullYear()}` : ""}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button
              variant="primary"
              sheen
              onClick={() => {
                toast.success(`Session assigned to ${selected?.name}.`, "Assigned");
                setSelected(null);
              }}
            >
              Assign Session
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <EngageAvatar src={selected.avatar} name={selected.name} size={64} ring />
              <div>
                <div className="flex items-center gap-1 text-sm">
                  <StarIcon />
                  <span className="font-semibold text-[var(--text-heading)]">{selected.rating.toFixed(2)}</span>
                  <span className="text-[var(--text-caption)]">/ 5 · {selected.reviews} reviews</span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-[var(--color-primary)]">
                  {formatIDR(selected.ratePerHour)} / hour
                </p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-[var(--text-body)]">{selected.bio}</p>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Specialties</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.specialties.map((s) => (
                  <Badge key={s} color="primary" variant="light">{s}</Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {selected.certifications.map((c) => (
                  <Badge key={c} color="secondary" variant="light">{c}</Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { l: "Sessions", v: selected.sessionsThisMonth },
                { l: "Hours", v: `${selected.hoursThisMonth}h` },
                { l: "Clients", v: selected.activeClients },
                { l: "Earned", v: formatIDR(selected.earningsThisMonth, true) },
              ].map((m) => (
                <div key={m.l} className="rounded-xl border border-[var(--border-light)] p-3 text-center">
                  <p className="text-lg font-bold text-[var(--text-heading)]">{m.v}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{m.l} (MTD)</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </ModalDialog>
    </PageScaffold>
  );
}
