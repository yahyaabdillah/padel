"use client";

import React, { useState } from "react";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Avatar from "@/components/ui/avatar/Avatar";
import Switch from "@/components/ui/switch/Switch";
import TextInput from "@/components/ui/input/TextInput";
import UiSelect from "@/components/ui/select/Select";
import { useToast } from "@/components/ui/toast/ToastContext";
import { useRole } from "@/context/RoleContext";
import {
  walletState,
  leaderboard,
  memberMatchResults,
  prettyDateLong,
} from "@/data/padel/member";
import { CheckIcon } from "@/components/member/icons";

export default function MemberProfilePage() {
  const toast = useToast();
  const { currentUser, currentRoleLabel } = useRole();
  const me = leaderboard.find((p) => p.isMe);

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone ?? "");
  const [hand, setHand] = useState("right");
  const [position, setPosition] = useState("right");
  const [level, setLevel] = useState("intermediate");

  const [prefs, setPrefs] = useState({
    bookingReminders: true,
    openPlayInvites: true,
    promos: false,
    leaderboard: true,
  });

  const save = () => toast.success("Profile saved (demo)", "Updated");
  const cancel = () => {
    setName(currentUser.name);
    setEmail(currentUser.email);
    setPhone(currentUser.phone ?? "");
    setHand("right");
    setPosition("right");
    setLevel("intermediate");
    setPrefs({ bookingReminders: true, openPlayInvites: true, promos: false, leaderboard: true });
    toast.info("Changes discarded", "Reverted");
  };

  return (
    <div>
      <PageBreadCrumb pageTitle="Profile" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* identity card */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center">
            <div className="relative mx-auto w-fit">
              <Avatar src={currentUser.avatar} name={currentUser.name} size="xl" />
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[var(--surface-card)] bg-emerald-500" />
            </div>
            <h3 className="mt-3 text-lg font-bold text-[var(--text-heading)]">{currentUser.name}</h3>
            <p className="text-sm text-[var(--text-caption)]">{currentUser.email}</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="light" color="primary">
                {currentUser.membershipTier ?? "Casual"}
              </Badge>
              <Badge variant="light" color="neutral">
                {currentRoleLabel}
              </Badge>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--border-light)] pt-4 text-center">
              <Stat label="Rank" value={`#${me?.rank ?? "–"}`} />
              <Stat label="Played" value={me?.played ?? 0} />
              <Stat label="Win %" value={`${me?.winRate ?? 0}%`} />
            </div>
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Member since {prettyDateLong(walletState.memberSince)}
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <h4 className="mb-3 font-semibold text-[var(--text-heading)]">Recent form</h4>
            <div className="flex gap-1.5">
              {memberMatchResults.slice(0, 6).map((m) => (
                <span
                  key={m.id}
                  title={`${m.scoreFor}-${m.scoreAgainst}`}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${
                    m.outcome === "win"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : m.outcome === "loss"
                        ? "bg-red-50 text-red-500 dark:bg-red-500/15"
                        : "bg-amber-50 text-amber-600 dark:bg-amber-500/15"
                  }`}
                >
                  {m.outcome === "win" ? "W" : m.outcome === "loss" ? "L" : "D"}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* editable details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
            <h4 className="mb-4 font-semibold text-[var(--text-heading)]">Personal information</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextInput label="Full name" value={name} onChange={setName} />
              <TextInput label="Email" type="email" value={email} onChange={setEmail} />
              <TextInput label="Phone" value={phone} onChange={setPhone} />
              <UiSelect
                label="Skill level"
                value={level}
                searchable
                onChange={(v) => setLevel(v as string)}
                options={[
                  { value: "beginner", label: "Beginner" },
                  { value: "intermediate", label: "Intermediate" },
                  { value: "advanced", label: "Advanced" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
            <h4 className="mb-4 font-semibold text-[var(--text-heading)]">Playing style</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <UiSelect
                label="Dominant hand"
                value={hand}
                searchable
                onChange={(v) => setHand(v as string)}
                options={[
                  { value: "right", label: "Right-handed" },
                  { value: "left", label: "Left-handed" },
                ]}
              />
              <UiSelect
                label="Preferred court side"
                value={position}
                searchable
                onChange={(v) => setPosition(v as string)}
                options={[
                  { value: "right", label: "Right (drive)" },
                  { value: "left", label: "Left (backhand)" },
                  { value: "both", label: "Both / flexible" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
            <h4 className="mb-4 font-semibold text-[var(--text-heading)]">Notifications</h4>
            <div className="space-y-1">
              <PrefRow
                label="Booking reminders"
                desc="Get a nudge 2 hours before your session."
                checked={prefs.bookingReminders}
                onChange={(v) => setPrefs((p) => ({ ...p, bookingReminders: v }))}
              />
              <PrefRow
                label="Open-play invites"
                desc="Alerts when a session matching your level opens."
                checked={prefs.openPlayInvites}
                onChange={(v) => setPrefs((p) => ({ ...p, openPlayInvites: v }))}
              />
              <PrefRow
                label="Leaderboard updates"
                desc="Weekly summary of your ranking."
                checked={prefs.leaderboard}
                onChange={(v) => setPrefs((p) => ({ ...p, leaderboard: v }))}
              />
              <PrefRow
                label="Promotions & offers"
                desc="Deals, tournaments and club events."
                checked={prefs.promos}
                onChange={(v) => setPrefs((p) => ({ ...p, promos: v }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancel}>Cancel</Button>
            <Button onClick={save} startIcon={<CheckIcon className="h-4 w-4" />} glow>
              Save changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-lg font-bold text-[var(--text-heading)]">{value}</p>
      <p className="text-xs text-[var(--text-caption)]">{label}</p>
    </div>
  );
}

function PrefRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-light)] py-3 last:border-0">
      <div>
        <p className="text-sm font-medium text-[var(--text-heading)]">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{desc}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  );
}
