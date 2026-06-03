"use client";

import React from "react";
import Drawer from "@/components/ui/drawer/Drawer";
import { Avatar } from "@/components/ui/avatar/Avatar";
import Button from "@/components/ui/button/Button";
import { useToast } from "@/components/ui/toast/ToastContext";
import ToneBadge from "./ToneBadge";
import { formatIDR, formatDate, formatDateTime } from "./format";
import {
  type Member,
  memberTierMeta,
  memberStatusMeta,
  memberActivityTypeMeta,
} from "@/data/padel/club/members";

interface MemberDetailDrawerProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
}

const Stat = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-white/[0.03]">
    <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
  </div>
);

const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({ member, isOpen, onClose }) => {
  const toast = useToast();
  if (!member) return <Drawer isOpen={isOpen} onClose={onClose} title="Member" size="max-w-md"><div /></Drawer>;

  const tier = memberTierMeta[member.tier];
  const status = memberStatusMeta[member.status];
  const winRate = member.matchesPlayed ? Math.round((member.wins / member.matchesPlayed) * 100) : 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Member profile"
      size="max-w-md"
      footer={
        <div className="flex gap-2">
          <Button
            variant="primary"
            fullWidth
            onClick={() => toast.success(`Wallet top-up link sent to ${member.name}.`, "Top-up")}
          >
            Top-up wallet
          </Button>
          <Button
            variant="outline"
            fullWidth
            onClick={() => toast.info(`Starting a new booking for ${member.name}.`, "New booking")}
          >
            New booking
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* header */}
        <div className="flex items-center gap-4">
          <Avatar name={member.name} size="xl" status={member.status === "active" ? "online" : "offline"} />
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-gray-900 dark:text-white">{member.name}</h3>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                style={{ background: tier.color }}
              >
                {tier.label}
              </span>
              <ToneBadge tone={status.tone}>{status.label}</ToneBadge>
            </div>
          </div>
        </div>

        {/* wallet */}
        <div className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-500/10 to-teal-500/10 p-4 dark:border-brand-500/30">
          <p className="text-xs font-medium text-brand-600 dark:text-brand-300">Wallet balance</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{formatIDR(member.walletBalance)}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{tier.perk}</p>
        </div>

        {/* stats */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Rating" value={member.rating} />
          <Stat label="Bookings" value={member.totalBookings} />
          <Stat label="Win rate" value={`${winRate}%`} />
        </div>

        <dl className="space-y-2.5 rounded-xl border border-gray-100 p-4 text-sm dark:border-gray-800">
          <div className="flex justify-between">
            <dt className="text-gray-400 dark:text-gray-500">Phone</dt>
            <dd className="font-medium text-gray-800 dark:text-white/90">{member.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400 dark:text-gray-500">City</dt>
            <dd className="font-medium text-gray-800 dark:text-white/90">{member.city}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400 dark:text-gray-500">Preferred side</dt>
            <dd className="font-medium capitalize text-gray-800 dark:text-white/90">{member.position}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400 dark:text-gray-500">Member since</dt>
            <dd className="font-medium text-gray-800 dark:text-white/90">{formatDate(member.joinedAt)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-400 dark:text-gray-500">Lifetime spend</dt>
            <dd className="font-semibold text-brand-600 dark:text-brand-400">{formatIDR(member.totalSpend)}</dd>
          </div>
        </dl>

        {/* history */}
        <div>
          <h4 className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Recent activity</h4>
          <ol className="relative space-y-4 border-l border-gray-200 pl-4 dark:border-gray-700">
            {member.history.map((h) => {
              const meta = memberActivityTypeMeta[h.type];
              return (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500 ring-4 ring-white dark:ring-gray-900" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{h.label}</p>
                    {h.amount !== undefined && (
                      <span
                        className={`text-sm font-semibold ${h.amount < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-700 dark:text-gray-200"}`}
                      >
                        {h.amount < 0 ? "+" : ""}
                        {formatIDR(Math.abs(h.amount))}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDateTime(h.date)}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Drawer>
  );
};

export default MemberDetailDrawer;
