"use client";

import React, { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import Avatar from "@/components/ui/avatar/Avatar";
import MarketingNav from "@/components/marketing/MarketingNav";
import PadelWordmark from "@/components/marketing/PadelWordmark";
import { subscriptionPlans, type PlanTier } from "@/data/padel";
import { idr } from "@/data/padel/member";

/* ── feature data ───────────────────────────────────── */
const features = [
  {
    icon: "📅",
    title: "Smart court booking",
    desc: "Calendar + court-grid scheduling with peak/off-peak pricing, walk-ins and member rates.",
  },
  {
    icon: "🤝",
    title: "Open play & tournaments",
    desc: "Run Americano & Mexicano sessions with auto round/pairing generation and live scoring.",
  },
  {
    icon: "🏆",
    title: "Rankings & leaderboard",
    desc: "Season points, win-rate tracking and player rankings that keep your community coming back.",
  },
  {
    icon: "👥",
    title: "Member CRM & wallet",
    desc: "Tiers, wallet balance, loyalty points and full play history for every player.",
  },
  {
    icon: "🛒",
    title: "Pro-shop POS",
    desc: "Sell rackets, balls, grips and rentals with a fast checkout and digital receipts.",
  },
  {
    icon: "📊",
    title: "Finance & insights",
    desc: "Occupancy heatmaps, revenue reports and invoices — know your numbers at a glance.",
  },
];

const stats = [
  { value: "320+", label: "Clubs powered" },
  { value: "1.4M", label: "Bookings / year" },
  { value: "98%", label: "Court utilisation" },
  { value: "4.9★", label: "Owner rating" },
];

const testimonials = [
  {
    quote:
      "We cut no-shows by 40% and doubled our open-play attendance in one season. PadelHub just works.",
    name: "Raka Pradana",
    role: "Owner · SmashCourt Jakarta",
    avatar: "/images/user/owner.jpg",
  },
  {
    quote:
      "The Americano generator alone saved us hours every weekend. Members love the live leaderboard.",
    name: "Maya Santoso",
    role: "GM · Baseline Padel Bali",
    avatar: "/images/user/user-09.jpg",
  },
  {
    quote:
      "Finally one dashboard for bookings, POS and finance. Onboarding took an afternoon, not a month.",
    name: "Sinta Dewanti",
    role: "Owner · DropShot Arena",
    avatar: "/images/user/user-10.jpg",
  },
];

const planBlurbExtras: Record<PlanTier, string> = {
  starter: "14-day free trial",
  pro: "Most popular",
  enterprise: "Custom contract",
};

export default function LandingPage() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--surface-bg)] text-[var(--text-body)]">
      <MarketingNav />

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* gradient + court motif backdrop */}
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(1100px 500px at 70% -10%, rgba(109,91,255,0.20), transparent 60%), radial-gradient(800px 400px at 10% 10%, rgba(20,184,166,0.14), transparent 55%)",
          }}
        />
        <svg
          className="pointer-events-none absolute right-0 top-10 h-[420px] w-[420px] opacity-[0.08] dark:opacity-[0.12]"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <rect x="14" y="14" width="172" height="172" rx="6" fill="none" stroke="var(--color-primary)" strokeWidth="2" />
          <line x1="100" y1="14" x2="100" y2="186" stroke="var(--color-primary)" strokeWidth="2" />
          <line x1="14" y1="100" x2="186" y2="100" stroke="var(--color-primary)" strokeWidth="1.5" />
        </svg>

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <Badge variant="light" color="primary" dot>
              The all-in-one padel club OS
            </Badge>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-[var(--text-heading)] sm:text-5xl lg:text-6xl">
              Run your padel club
              <span className="block text-[var(--color-primary)]">
                like a champion.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[var(--text-caption)]">
              Bookings, open play, coaching, POS and finance — one beautiful platform that keeps
              every court full and every player coming back.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/onboarding">
                <Button size="lg" glow startIcon={<span>🚀</span>}>
                  Start free trial
                </Button>
              </Link>
              <Link href="/signin">
                <Button size="lg" variant="outline">
                  Live demo
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {["user-04", "user-05", "user-06", "user-07"].map((u) => (
                  <Avatar key={u} src={`/images/user/${u}.jpg`} size="sm" className="ring-2 ring-[var(--surface-bg)]" />
                ))}
              </div>
              <p className="text-sm text-[var(--text-caption)]">
                Loved by <span className="font-semibold text-[var(--text-heading)]">320+ clubs</span> worldwide
              </p>
            </div>
          </div>

          {/* hero mock card */}
          <div className="relative">
            <div className="rounded-3xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-theme-lg">
              <div className="flex items-center justify-between">
                <PadelWordmark />
                <Badge variant="light" color="success" dot>
                  Live
                </Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { l: "Today's revenue", v: idr(7_420_000), a: "primary" },
                  { l: "Occupancy", v: "92%", a: "teal" },
                  { l: "Open play", v: "6 live", a: "accent" },
                ].map((s) => (
                  <div key={s.l} className="rounded-xl bg-[var(--surface-muted)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{s.l}</p>
                    <p className="mt-0.5 text-lg font-bold text-[var(--text-heading)]">{s.v}</p>
                  </div>
                ))}
              </div>
              {/* court grid mock */}
              <div className="mt-4 space-y-2">
                {["Center Court", "Court 2 — Rally", "Sky Court"].map((c, ci) => (
                  <div key={c} className="flex items-center gap-2">
                    <span className="w-28 shrink-0 truncate text-xs text-[var(--text-caption)]">{c}</span>
                    <div className="flex flex-1 gap-1">
                      {Array.from({ length: 8 }).map((_, i) => {
                        const filled = (i + ci) % 3 !== 0;
                        return (
                          <span
                            key={i}
                            className={`h-5 flex-1 rounded ${
                              filled ? "bg-[var(--color-primary)]/80" : "bg-[var(--surface-muted)]"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <span className="absolute -bottom-4 -left-4 -z-10 h-24 w-24 rounded-full bg-[var(--color-accent)] opacity-40 blur-2xl" />
          </div>
        </div>

        {/* stat strip */}
        <div className="relative mx-auto max-w-7xl px-5 pb-14 lg:px-8">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-extrabold text-[var(--color-primary)] sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-sm text-[var(--text-caption)]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="light" color="secondary">Everything in one place</Badge>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-heading)] sm:text-4xl">
            Built for the way padel clubs really run
          </h2>
          <p className="mt-3 text-[var(--text-caption)]">
            Stop juggling spreadsheets, chat groups and three different apps. PadelHub brings your
            whole operation under one roof.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-theme-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary-light)] text-2xl transition-transform group-hover:scale-110">
                {f.icon}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[var(--text-heading)]">{f.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--text-caption)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────── */}
      <section id="pricing" className="border-y border-[var(--border-light)] bg-[var(--surface-muted)]/40 py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="light" color="primary">Simple, transparent pricing</Badge>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-heading)] sm:text-4xl">
              Plans that grow with your club
            </h2>
            <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[var(--border-default)] bg-[var(--surface-card)] p-1">
              <button
                onClick={() => setAnnual(false)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  !annual ? "bg-[var(--color-primary)] text-white" : "text-[var(--text-caption)]"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  annual ? "bg-[var(--color-primary)] text-white" : "text-[var(--text-caption)]"
                }`}
              >
                Annual <span className="text-xs opacity-80">−20%</span>
              </button>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {subscriptionPlans.map((p) => {
              const monthly = annual ? Math.round(p.priceMonthly * 0.8) : p.priceMonthly;
              return (
                <div
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border bg-[var(--surface-card)] p-6 transition-all duration-300 ${
                    p.highlighted
                      ? "border-[var(--color-primary)] shadow-theme-lg lg:-translate-y-2"
                      : "border-[var(--border-default)]"
                  }`}
                >
                  {p.highlighted && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-semibold text-white">
                      {planBlurbExtras[p.id]}
                    </span>
                  )}
                  <h3 className="text-lg font-bold text-[var(--text-heading)]">{p.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-caption)]">{p.blurb}</p>
                  <p className="mt-5">
                    <span className="text-3xl font-extrabold text-[var(--text-heading)]">{idr(monthly)}</span>
                    <span className="text-sm text-[var(--text-muted)]">/mo</span>
                  </p>
                  {!p.highlighted && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{planBlurbExtras[p.id]}</p>
                  )}
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-[var(--text-body)]">
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 6 9 17l-5-5" />
                        </svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/onboarding" className="mt-6">
                    <Button fullWidth variant={p.highlighted ? "primary" : "soft"} glow={p.highlighted}>
                      {p.id === "enterprise" ? "Contact sales" : "Start free trial"}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      <section id="testimonials" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="light" color="secondary">Loved by club owners</Badge>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text-heading)] sm:text-4xl">
            Don&apos;t just take our word for it
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.name}
              className="flex flex-col rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6"
            >
              <div className="text-2xl text-[var(--color-accent)]">★★★★★</div>
              <blockquote className="mt-3 flex-1 text-[var(--text-body)]">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <Avatar src={t.avatar} name={t.name} size="md" />
                <div>
                  <p className="text-sm font-semibold text-[var(--text-heading)]">{t.name}</p>
                  <p className="text-xs text-[var(--text-caption)]">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 pb-20 lg:px-8">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-14 text-center shadow-theme-lg"
          style={{ background: "linear-gradient(135deg, #4b3fd6 0%, #6D5BFF 60%, #14B8A6 130%)" }}
        >
          <span className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[var(--color-accent)] opacity-30 blur-3xl" />
          <h2 className="relative text-3xl font-extrabold text-white sm:text-4xl">
            Ready to fill every court?
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/85">
            Set up your club in minutes. No credit card required for the 14-day trial.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/onboarding">
              <Button size="lg" className="!bg-white !text-[var(--color-primary)] hover:!bg-white/90">
                Get started free
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="lg" variant="outline" className="!border-white/60 !text-white hover:!bg-white/10">
                Book a demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-[var(--border-light)] bg-[var(--surface-card)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <PadelWordmark />
            <p className="mt-3 max-w-xs text-sm text-[var(--text-caption)]">
              The all-in-one operating system for modern padel clubs.
            </p>
          </div>
          {[
            { h: "Product", items: ["Bookings", "Open play", "POS", "Finance"] },
            { h: "Company", items: ["About", "Careers", "Blog", "Contact"] },
            { h: "Legal", items: ["Privacy", "Terms", "Security", "Status"] },
          ].map((col) => (
            <div key={col.h}>
              <h4 className="text-sm font-semibold text-[var(--text-heading)]">{col.h}</h4>
              <ul className="mt-3 space-y-2">
                {col.items.map((i) => (
                  <li key={i}>
                    <span className="cursor-pointer text-sm text-[var(--text-caption)] transition-colors hover:text-[var(--color-primary)]">
                      {i}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-[var(--border-light)] px-5 py-5 lg:px-8">
          <p className="mx-auto max-w-7xl text-center text-xs text-[var(--text-muted)] sm:text-left">
            © 2026 PadelHub. A demo product. All trademarks belong to their owners.
          </p>
        </div>
      </footer>
    </div>
  );
}
