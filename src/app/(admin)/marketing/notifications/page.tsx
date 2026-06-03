"use client";

import React, { useMemo, useState } from "react";
import PageScaffold from "@/components/club-engage/PageScaffold";
import StatCard from "@/components/club-engage/StatCard";
import { formatNumber, pct } from "@/components/club-engage/format";
import Card from "@/components/ui/card/Card";
import Badge from "@/components/ui/badge/Badge";
import Button from "@/components/ui/button/Button";
import Select from "@/components/ui/select/Select";
import TextInput from "@/components/ui/input/TextInput";
import Textarea from "@/components/ui/input/Textarea";
import { useToast } from "@/components/ui/toast/ToastContext";
import {
  notificationCampaigns as seed,
  notifChannelMeta,
  notifStatusMeta,
  audienceOptions,
  type NotificationCampaign,
  type NotifChannel,
} from "@/data/padel/engage/marketing";

const channels: NotifChannel[] = ["whatsapp", "email", "push"];

// rough recipient size per audience for the composer estimate
const audienceSize: Record<string, number> = {
  "All members": 482,
  "New signups": 38,
  "Pro & Elite": 210,
  "Casual members": 244,
  "Intermediate players": 156,
  "Expiring this month": 64,
  "Inactive 30+ days": 91,
};

export default function NotificationsPage() {
  const toast = useToast();
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>(seed);

  const [channel, setChannel] = useState<NotifChannel>("whatsapp");
  const [audience, setAudience] = useState(audienceOptions[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const recipients = audienceSize[audience] ?? 0;
  const charLimit = channel === "whatsapp" ? 1024 : channel === "push" ? 178 : 5000;

  const stats = useMemo(() => {
    const sent = campaigns.filter((c) => c.status === "sent");
    const totalReach = sent.reduce((s, c) => s + c.recipients, 0);
    const avgOpen = sent.length ? sent.reduce((s, c) => s + (c.openRate ?? 0), 0) / sent.length : 0;
    const scheduled = campaigns.filter((c) => c.status === "scheduled").length;
    return { sent: sent.length, totalReach, avgOpen, scheduled };
  }, [campaigns]);

  const send = (asDraft: boolean, scheduled = false) => {
    if (!title.trim() || !body.trim()) {
      toast.warning("Add a title and message before sending.");
      return;
    }
    const status = asDraft ? "draft" : scheduled ? "scheduled" : "sent";
    const newCampaign: NotificationCampaign = {
      id: `ntf-${Date.now()}`,
      title: title.trim(),
      channel,
      status,
      audience,
      recipients,
      preview: body.trim(),
      ...(status === "sent" ? { sentAt: "just now", openRate: 0, clickRate: 0 } : {}),
      ...(status === "scheduled" ? { scheduledAt: "2026-06-06 10:00" } : {}),
    };
    setCampaigns((prev) => [newCampaign, ...prev]);
    toast.success(
      asDraft
        ? "Saved as draft."
        : scheduled
          ? `Scheduled to ${formatNumber(recipients)} recipients.`
          : `Sent to ${formatNumber(recipients)} recipients (dummy).`,
    );
    setTitle("");
    setBody("");
  };

  return (
    <PageScaffold
      title="Notifications"
      subtitle="Compose WhatsApp, email and push campaigns to your members. Sending is simulated — no messages leave the app."
      requireAny={["marketing.view"]}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Campaigns Sent" value={stats.sent} accent="primary" />
          <StatCard label="Total Reach" value={formatNumber(stats.totalReach)} accent="secondary" />
          <StatCard label="Avg Open Rate" value={pct(stats.avgOpen)} accent="accent" />
          <StatCard label="Scheduled" value={stats.scheduled} accent="amber" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Composer */}
          <Card title="Compose Campaign" desc="Create a new broadcast" padding="md" className="lg:col-span-3">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-medium text-[var(--text-body)]">Channel</p>
                <div className="grid grid-cols-3 gap-2">
                  {channels.map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                        channel === ch
                          ? "border-[var(--color-primary)] bg-[var(--color-primary-light)] text-[var(--color-primary)]"
                          : "border-[var(--border-default)] text-[var(--text-caption)] hover:border-[var(--color-primary)]/50"
                      }`}
                    >
                      <span className="text-lg">{notifChannelMeta[ch].emoji}</span>
                      {notifChannelMeta[ch].label}
                    </button>
                  ))}
                </div>
              </div>

              <Select
                label="Audience"
                value={audience}
                searchable
                onChange={(v) => setAudience(v as string)}
                options={audienceOptions.map((a) => ({ value: a, label: a, desc: `~${formatNumber(audienceSize[a] ?? 0)} recipients` }))}
              />

              <TextInput label="Campaign title" placeholder="e.g. Weekend Court Availability" value={title} onChange={setTitle} />

              <div>
                <Textarea
                  label="Message"
                  placeholder="Write your message…"
                  value={body}
                  onChange={setBody}
                  rows={5}
                  maxLength={charLimit}
                  showCount
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="primary" sheen onClick={() => send(false)}>Send Now</Button>
                <Button variant="soft" onClick={() => send(false, true)}>Schedule</Button>
                <Button variant="ghost" onClick={() => send(true)}>Save Draft</Button>
              </div>
            </div>
          </Card>

          {/* Live preview */}
          <Card title="Preview" desc={`${notifChannelMeta[channel].label} · ${formatNumber(recipients)} recipients`} padding="md" className="lg:col-span-2">
            <div className="rounded-2xl bg-[var(--surface-muted)] p-4">
              {channel === "whatsapp" && (
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-emerald-500/90 p-3 text-white shadow-theme-sm">
                  {title && <p className="text-sm font-bold">{title}</p>}
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{body || "Your message will appear here…"}</p>
                  <p className="mt-1 text-right text-[10px] text-white/70">12:30 ✓✓</p>
                </div>
              )}
              {channel === "email" && (
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-theme-sm">
                  <div className="border-b border-[var(--border-light)] px-3 py-2">
                    <p className="text-xs text-[var(--text-muted)]">From: SmashCourt &lt;hello@smashcourt.id&gt;</p>
                    <p className="text-sm font-bold text-[var(--text-heading)]">{title || "Subject line…"}</p>
                  </div>
                  <p className="whitespace-pre-wrap p-3 text-sm text-[var(--text-body)]">{body || "Your email body will appear here…"}</p>
                </div>
              )}
              {channel === "push" && (
                <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-3 shadow-theme-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--color-primary)] text-xs font-bold text-white">PH</span>
                    <span className="text-xs font-semibold text-[var(--text-heading)]">PadelHub</span>
                    <span className="ml-auto text-[10px] text-[var(--text-muted)]">now</span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-[var(--text-heading)]">{title || "Notification title…"}</p>
                  <p className="text-sm text-[var(--text-body)]">{body || "Notification body…"}</p>
                </div>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
              Estimated delivery to <span className="font-semibold text-[var(--text-heading)]">{formatNumber(recipients)}</span> {audience.toLowerCase()}.
            </p>
          </Card>
        </div>

        {/* History */}
        <Card title="Campaign History" padding="none">
          <div className="divide-y divide-[var(--border-light)]">
            {campaigns.map((c) => (
              <div key={c.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-lg">
                  {notifChannelMeta[c.channel].emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--text-heading)]">{c.title}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">{c.preview}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                  <span className="text-xs text-[var(--text-caption)]">{c.audience}</span>
                  <span className="text-xs font-medium text-[var(--text-body)]">{formatNumber(c.recipients)}</span>
                  {c.status === "sent" && c.openRate !== undefined && (
                    <span className="text-xs text-[var(--text-caption)]">{pct(c.openRate)} open</span>
                  )}
                  <Badge size="sm" color={notifStatusMeta[c.status].tone} variant="light" dot>{notifStatusMeta[c.status].label}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageScaffold>
  );
}
