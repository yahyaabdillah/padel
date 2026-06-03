"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import EngageAvatar from "@/components/club-engage/EngageAvatar";
import { formatIDR, formatDateLong } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Tabs from "@/components/ui/tabs/Tabs";
import EmptyState from "@/components/ui/feedback/EmptyState";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  ptSessions as seedSessions,
  ptStatusMeta,
  coachById,
  type PTSession,
  type PTStatus,
} from "@/data/padel/engage/coaches";

const tones = ptStatusMeta;

const PlusIcon = () => <span className="text-base leading-none">+</span>;

export default function PTPage() {
  const toast = useToast();
  const router = useRouter();
  const [sessions, setSessions] = useState<PTSession[]>(seedSessions);
  const [filter, setFilter] = useState<"all" | PTStatus>("all");

  const filtered = useMemo(
    () => (filter === "all" ? sessions : sessions.filter((s) => s.status === filter)),
    [sessions, filter],
  );

  const stats = useMemo(() => {
    const upcoming = sessions.filter((s) => s.status === "confirmed" || s.status === "pending").length;
    const revenue = sessions.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + s.price, 0);
    const hours = sessions.filter((s) => s.status !== "cancelled").reduce((sum, s) => sum + s.durationMin, 0) / 60;
    return { upcoming, revenue, hours, total: sessions.length };
  }, [sessions]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: sessions.length };
    (["confirmed", "pending", "completed", "cancelled"] as PTStatus[]).forEach(
      (st) => (c[st] = sessions.filter((s) => s.status === st).length),
    );
    return c;
  }, [sessions]);

  return (
    <PageScaffold
      title="Personal Training"
      subtitle="One-on-one and pair coaching sessions. Book, confirm and track PT revenue."
      requireAny={["coaching.view"]}
      actions={
        <Button
          variant="primary"
          sheen
          startIcon={<PlusIcon />}
          onClick={() => router.push("/coaching/pt/book")}
        >
          Book PT Session
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Upcoming Sessions" value={stats.upcoming} accent="primary" />
          <StatCard label="Total Sessions" value={stats.total} accent="secondary" />
          <StatCard label="PT Hours (booked)" value={`${stats.hours.toFixed(1)}h`} accent="accent" />
          <StatCard label="PT Revenue" value={formatIDR(stats.revenue, true)} accent="amber" delta="+11%" hint="vs last month" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-[var(--text-heading)]">Sessions</h3>
          <Tabs
            variant="pill"
            size="sm"
            value={filter}
            onChange={(v) => setFilter(v as typeof filter)}
            items={[
              { value: "all", label: "All", badge: counts.all },
              { value: "confirmed", label: "Confirmed", badge: counts.confirmed },
              { value: "pending", label: "Pending", badge: counts.pending },
              { value: "completed", label: "Completed", badge: counts.completed },
              { value: "cancelled", label: "Cancelled", badge: counts.cancelled },
            ]}
          />
        </div>

        {filtered.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              title="No sessions here"
              description="There are no personal training sessions matching this filter yet."
              action={<Button variant="primary" onClick={() => router.push("/coaching/pt/book")}>Book a session</Button>}
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filtered.map((s) => {
              const coach = coachById(s.coachId);
              return (
                <Card key={s.id} hover padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <EngageAvatar src={s.clientAvatar} name={s.clientName} size={44} />
                      <div>
                        <p className="font-semibold text-[var(--text-heading)]">{s.clientName}</p>
                        <p className="text-xs text-[var(--text-caption)]">{s.focus}</p>
                      </div>
                    </div>
                    <Badge size="sm" color={tones[s.status].tone === "neutral" ? "neutral" : tones[s.status].tone} variant="light" dot>
                      {tones[s.status].label}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Date</p>
                      <p className="font-medium text-[var(--text-body)]">{formatDateLong(s.date)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Time</p>
                      <p className="font-medium text-[var(--text-body)]">{s.startTime} · {s.durationMin}m</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Court</p>
                      <p className="font-medium text-[var(--text-body)]">{s.court}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">Price</p>
                      <p className="font-semibold text-[var(--color-primary)]">{formatIDR(s.price, true)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border-light)] pt-3">
                    <div className="flex items-center gap-2">
                      <EngageAvatar src={coach?.avatar} name={coach?.name ?? ""} size={26} />
                      <span className="text-xs text-[var(--text-caption)]">Coach {coach?.name.split(" ")[0]}</span>
                      {s.players === 2 && <Badge size="sm" color="info" variant="light">Pair</Badge>}
                    </div>
                    {s.status === "pending" && (
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => {
                          setSessions((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: "confirmed" } : x)));
                          toast.success("Session confirmed.");
                        }}
                      >
                        Confirm
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageScaffold>
  );
}
