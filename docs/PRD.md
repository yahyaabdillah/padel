# PRD — PadelHub (SaaS Padel Club Management)

> Status: Draft v1 · Owner: PM Agent · Type: **Dummy / Prototype** (no database, in-memory + localStorage mock data) · Stack: Next.js 16 (App Router) + React 19 + Tailwind 4 + TypeScript.
> Base: forked from `seven-gym-1` (UI-kit + dummy role-based shell reused). Domain repurposed gym → padel.

---

## 1. Vision

**PadelHub** is a multi-tenant SaaS for padel clubs: court booking, members/players, coaching, open-play & tournaments (Americano/Mexicano), pro-shop POS, and finance — plus a **platform super-admin** that manages tenants, subscription plans, RBAC, and low-code **menu builder** + **form builder** (patterns adapted from `rto-monitoring` / `sevenrent-v2`, but dummy/in-memory).

Goal: even as a dummy, it must look and feel **production-grade**.

## 2. Branding

| Token | Value | Use |
|-------|-------|-----|
| Primary (Electric Indigo) | `#6D5BFF` | brand-500, buttons, active nav |
| Accent (Padel Lime) | `#C6FF3D` | highlights, CTAs, ball motif |
| Secondary (Court Teal) | `#14B8A6` | charts, secondary actions |
| Ink | `#0E1116` | text/dark surfaces |

- Brand scale `brand-25 … brand-950` generated around Electric Indigo, replacing seven-gym green in `globals.css`.
- Font: Outfit (kept). Rounded-xl cards, soft shadows, dark-mode first-class.
- Logo wordmark: **PadelHub** with lime ball dot.

## 3. Personas & Roles (RBAC)

| Role | Scope | Summary |
|------|-------|---------|
| `superadmin` | Platform | SaaS operator. Tenants, plans, billing, global RBAC, menu/form builder, feature flags, theme. |
| `owner` | Tenant (club) | Club admin. Full club config: courts, pricing, staff & roles, finance, settings. |
| `staff` | Tenant | Front desk. Bookings, check-in, POS, members. |
| `coach` | Tenant | Own schedule, clients, classes/clinics, earnings. |
| `member` | Tenant | Player portal. Book courts, open play, membership, payments, leaderboard. |

Permissions are string keys (`courts.view`, `booking.create`, `access.manage`, …). `superadmin`/`owner` may hold `*`. Per-role sets live in `RoleContext`; the super-admin **Access Control** screen edits role→permission and role→menu matrices (dummy, localStorage-persisted).

## 4. Navigation / Menu per role

**Platform (superadmin)**
- Platform Dashboard · Tenants (Clubs) · Plans & Pricing · Billing & Invoices · Access Control · Menu Builder · Form Builder · Feature Flags · Platform Settings · UI Kit

**Club app (owner/staff/coach)**
- Dashboard · Bookings (Calendar + Court Grid) · Courts · Members · Coaching (Coaches / Classes / PT) · Matches & Open Play (Americano/Mexicano, Leaderboard) · Pro Shop POS · Finance (Transactions / Invoices / Reports) · Marketing (Promos / Referrals / Notifications) · Settings (Club Profile / Hours / Staff & Roles)

**Member portal**
- My Dashboard · Book a Court · My Bookings · Open Play & Matches · Membership & Wallet · Leaderboard · Payments · Profile

## 5. Feature modules (build targets)

### Platform / Super-Admin
1. **Platform Dashboard** — MRR, active tenants, trial conversions, churn, plan mix (charts).
2. **Tenants** — club list, subscription status/plan, seats, suspend/activate, impersonate.
3. **Plans & Pricing** — Starter / Pro / Enterprise; feature limits (courts, staff, modules).
4. **Billing & Invoices** — dummy invoices, payment status, MRR breakdown.
5. **Access Control (RBAC)** — roles CRUD + permission matrix (view/create/edit/delete/approve) + role→menu visibility.
6. **Menu Builder** — CRUD dynamic menu items (label, path, icon, parent, order, roles); drives sidebar; localStorage-backed.
7. **Form Builder** — define forms + fields (text/number/select/date/upload/...), preview via dynamic form renderer.
8. **Feature Flags** — toggle modules per plan/tenant.
9. **Platform Settings / Theme** — brand color, logo, defaults.

### Club app
1. **Dashboard** — occupancy %, revenue, upcoming bookings, peak hours, court heatmap.
2. **Bookings** — FullCalendar week/day + court-grid time slots; create/cancel (dummy), status chips, walk-in vs member.
3. **Courts** — manage courts (indoor/outdoor, glass/mesh, single/double), per-hour pricing peak/off-peak.
4. **Members** — player CRM, tiers (Casual/Pro/Elite), wallet balance, history.
5. **Coaching** — coaches roster, class/clinic scheduling, PT sessions, earnings.
6. **Matches & Open Play** — Americano/Mexicano sessions, auto round/pair gen, live scoring (dummy), leaderboard & rankings.
7. **Pro Shop POS** — products (rackets, balls, grips, drinks) + court/equipment rental, cart, checkout (dummy receipt).
8. **Finance** — transactions table, invoices, revenue reports (charts), export stubs.
9. **Marketing** — promos, referral program, notification composer (WA/email dummy).
10. **Settings** — club profile, operating hours, staff & role assignment.

### Member portal
Member dashboard · Book a court · My bookings · Open play & matches · Membership & wallet · Leaderboard · Payments · Profile.

### Cross-cutting
- **Landing page** (marketing + pricing + CTA), public route.
- **Auth**: dummy login panel with one-click role switch (reuse `DummyLoginPanel`).
- **Onboarding wizard** — new club setup (name, courts, hours, plan).
- **UI Kit** page — rebranded showcase (the “ui-kit” menu).

## 6. Data (dummy)

Mock data under `src/data/padel/*` (courts, bookings, members, coaches, matches, products, tenants, plans, invoices, menus, forms, permissions). State via React Context + `localStorage` for builder/RBAC edits. **No backend, no DB.**

## 7. Non-functional / quality bar

- Responsive, dark mode, keyboard-focusable, empty/loading states (`Skeleton`/`EmptyState`).
- Consistent page scaffold: `PageBreadCrumb` + `ComponentCard`.
- Reuse UI-kit; extend/add components when needed (reference, not frozen).
- Type-safe; `npm run build` should pass.

## 8. Acceptance (User-agent checklist)

- Each role logs in (dummy switch) and sees only its menus.
- Super-admin edits a role's permissions + menu → reflects in sidebar.
- Menu builder adds an item that appears in nav; form builder renders a working preview.
- A court booking can be created on the calendar and shows in member's "My bookings".
- POS checkout produces a dummy receipt; finance shows the transaction.
- Open-play Americano generates rounds + leaderboard updates.
- Landing + pricing render; UI-kit page renders all components on brand palette.

## 9. Out of scope

Real auth, real payments, real DB/persistence beyond localStorage, real WhatsApp/email, native mobile.
