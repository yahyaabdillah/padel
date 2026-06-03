"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  mockLoginUsers,
  roleLabels,
  useRole,
  type UserRole,
} from "@/context/RoleContext";

const roleBlurb: Record<UserRole, string> = {
  superadmin: "Manage tenants, plans, RBAC, menu & form builders.",
  owner: "Full club control: courts, finance, staff & settings.",
  staff: "Front desk: bookings, check-in, POS, members.",
  coach: "Own schedule, clients, classes & earnings.",
  member: "Book courts, open play, membership & leaderboard.",
};

const roleAccent: Record<UserRole, string> = {
  superadmin: "from-brand-500 to-brand-700",
  owner: "from-teal-500 to-teal-700",
  staff: "from-amber-400 to-amber-600",
  coach: "from-rose-500 to-rose-700",
  member: "from-accent-400 to-accent-600",
};

const landingForRole = (role: UserRole) =>
  role === "superadmin" ? "/platform" : role === "member" ? "/me" : "/";

export default function DummyLoginPanel() {
  const { loginAsUser } = useRole();
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Brand panel */}
          <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-7 text-white">
            <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-300/30 blur-2xl" />
            <span className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-teal-400/20 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                  <span className="h-5 w-5 rounded-full bg-accent-300 shadow-[0_0_14px_rgba(198,255,61,0.8)]" />
                </span>
                <span className="text-2xl font-extrabold">
                  Padel<span className="text-accent-300">Hub</span>
                </span>
              </div>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-300" />
                Demo Prototype
              </div>
              <h1 className="mt-4 text-3xl font-bold leading-tight">
                Padel club management,
                <br />
                one smooth rally.
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/80">
                Bookings, members, coaching, open play, POS and finance — plus a
                platform super-admin with RBAC and low-code builders. All dummy
                data, no backend.
              </p>
            </div>
            <div className="relative mt-8 grid grid-cols-3 gap-3">
              {[
                { k: "Courts", v: "6" },
                { k: "Members", v: "482" },
                { k: "Occupancy", v: "78%" },
              ].map((s) => (
                <div
                  key={s.k}
                  className="rounded-xl border border-white/15 bg-white/10 p-3 text-center"
                >
                  <p className="text-xl font-bold">{s.v}</p>
                  <p className="text-[11px] uppercase tracking-wide text-white/70">
                    {s.k}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Login cards */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 11c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zM4 21c0-3.3 3.6-6 8-6s8 2.7 8 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Choose a role to sign in
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  One-click dummy login. Menus & permissions follow the role.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {mockLoginUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    loginAsUser(user.id);
                    router.push(landingForRole(user.role));
                  }}
                  className="group rounded-xl border border-gray-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-theme-md dark:border-gray-800 dark:hover:border-brand-500/40"
                >
                  <div className="flex items-start gap-3">
                    <span className="relative">
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        width={44}
                        height={44}
                        className="rounded-full"
                      />
                      <span
                        className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white ${roleAccent[user.role]}`}
                      >
                        {user.name.charAt(0)}
                      </span>
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-sm font-medium text-brand-600 dark:text-brand-300">
                        {roleLabels[user.role]}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
                    {roleBlurb[user.role]}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-400 transition group-hover:text-brand-500">
                    Sign in as {roleLabels[user.role]}
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
