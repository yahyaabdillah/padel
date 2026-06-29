# PadelPro — Knowledge Index

**Path:** `D:/yahya data/kerjaan/padel-pro`  
**Stack:** Next.js 16 + React 19 + TypeScript + Tailwind 4 + Prisma  
**Database:** PostgreSQL (multi-tenant: master + tenant schema)  
**Updated:** 2026-06-22

---

## 1. Project Overview

PadelHub/PadelPro adalah SaaS manajemen klub padel multi-tenant:
- Court booking & calendar
- Member/Player CRM dengan membership tier
- Coaching (coaches, packages, sessions)
- Check-in system (QR scan)
- Finance & payments
- Platform super-admin untuk tenant management

**Status:** Production-ready prototype dengan real DB (PostgreSQL), bukan dummy.

---

## 2. Architecture

### 2.1 Multi-Tenant Database

**Master DB** (`prisma/master.prisma`):
- `m_role` — role definitions (superadmin, owner, staff, coach, member)
- `m_permission` — permission keys
- `m_role_permission` — role→permission mapping
- `m_menu` — sidebar menu entries
- `m_role_menu` — role→menu visibility matrix
- `m_tenant` — tenant registry + DB connection config
- `m_version` — app version

**Tenant DB** (`prisma/tenant.prisma`):
- **Master tables (`m_*`)** — config, survive reset:
  - `m_user` — internal users (owner/staff/coach/superadmin)
  - `m_user_menu` — per-user menu overrides
  - `m_company` — club profile + check-in settings
  - `m_operating_hours` — jam buka per hari
  - `m_time_group` — time-of-day buckets (Pagi/Siang/Sore/Malam)
  - `m_court` — lapangan + pricing + schedule
  - `m_membership_plan` — plan benefits + quota
  - `m_coach` — coach profile + availability
  - `m_coach_package` — coaching package bundles

- **Transactional tables (`t_*`)** — wiped on reset:
  - `t_member` — member CRM + login + membership assignment
  - `t_booking` — booking header
  - `t_booking_detail` — court session lines
  - `t_court_maintenance` — maintenance windows
  - `t_coaching_schedule` — member+package enrollment
  - `t_coaching_session` — individual PT sessions
  - `t_checkin` — check-in event log
  - `t_payment` — payment record per checkout
  - `t_membership_history` — membership action audit

### 2.2 Auth Flow

File: `src/lib/auth.ts`

1. User input `companyId` + `userId` + `password`
2. `resolveTenantConfig(companyId)` ambil DB config dari master `m_tenant`
3. Query `m_user` di tenant DB untuk internal staff
4. Jika tidak ketemu, query `t_member` untuk member portal
5. bcrypt verify password
6. Return `AuthSession` dengan role + level

**Role levels:**
- superadmin: 1
- owner: 2
- staff: 3
- coach: 4
- member: 5

### 2.3 Tenant DB Resolver

File: `src/lib/tenant-db.ts`

- Cache PrismaClient per-tenant di global (LRU, default max 10)
- Connection pooling: `connection_limit=2`, `pool_timeout=20`, `connect_timeout=10`
- Env overrides: `PRISMA_TENANT_CLIENT_CACHE_MAX`, `PRISMA_TENANT_CONNECTION_LIMIT`

---

## 3. Core Workflows

### 3.1 Checkout (Membership + Booking + Payment)

File: `src/lib/checkout-core.ts`

**Single transaction checkout:**
1. Resolve member benefit (`resolveMemberBenefit`) — cek plan + quota + cycle rollover
2. Apply membership change (`applyMembership`) — assign/extend/upgrade, write `t_membership_history`
3. Create booking header `t_booking` + details `t_booking_detail`
4. Create payment `t_payment` (PAY-YYYY-XXXXX)
5. Update member quota + cycle start

**Payment methods:** Cash, QRIS, Transfer  
**Member self-service:** hanya QRIS/Transfer (tidak bisa cash)

### 3.2 Check-in

File: `src/lib/checkin-core.ts`

**Flow:**
1. Scan QR booking atau input manual
2. Validate:
   - Booking exists dan status `confirmed`
   - Member matches (jika member booking)
   - Time window (strict/loose)
   - Court not in maintenance
3. Update `t_booking_detail.status` → `checked_in`
4. Write `t_checkin` log (success/rejected)

**Settings:** `m_company.scanStaffBooking`, `strictWindow`, `checkinWindowMin`

### 3.3 Membership Benefit

File: `src/lib/membership-benefit.ts`

Function `calcMembershipBenefit()`:
- Input: member, plan, sessions to book
- Output: free sessions count, discount %, join fee due
- Handles quota cycle rollover

---

## 4. App Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + providers
│   ├── globals.css         # Tailwind + design tokens
│   └── (admin)/
│       ├── layout.tsx      # Sidebar + header + RBAC guard
│       ├── page.tsx        # Dashboard
│       ├── access/         # Roles, menus, staff, users
│       ├── bookings/       # Calendar, new booking, payment
│       ├── checkin/        # QR scan, manual check-in
│       ├── coaching/       # Coaches, classes, PT, packages, schedule
│       ├── courts/         # Court management
│       ├── finance/        # Transactions, invoices, reports
│       ├── maintenance/    # Court maintenance windows
│       ├── marketing/      # Promos, referrals, notifications
│       ├── matches/        # Leaderboard, open play
│       ├── me/             # Member portal (book, bookings, membership, profile)
│       ├── members/        # Member CRM, registration, membership
│       ├── platform/       # Super-admin: tenants, plans, billing, feature flags
│       ├── pos/            # Pro shop POS
│       ├── settings/       # Club profile, hours, plans, staff
│       └── ui-kit/         # Component showcase
├── components/             # UI components
├── context/                # React contexts (theme, role, sidebar)
├── hooks/                  # Custom hooks
├── icons/                  # SVG icons
├── layout/                 # App header, sidebar, navigation
├── lib/                    # Core libraries (auth, DB, checkout, checkin)
└── data/                   # Mock data (legacy, now using real DB)
```

**354 TypeScript/TSX files**

---

## 5. Key Files Reference

| Domain | File | Purpose |
|--------|------|---------|
| **Auth** | `src/lib/auth.ts` | Login logic untuk internal + member portal |
| **Tenant DB** | `src/lib/tenant-db.ts` | Prisma client resolver + cache |
| **Master DB** | `src/lib/master-db.ts` | Prisma client untuk master DB |
| **Checkout** | `src/lib/checkout-core.ts` | Transaksi membership + booking + payment |
| **Check-in** | `src/lib/checkin-core.ts` | Validasi + log check-in |
| **Membership** | `src/lib/membership-benefit.ts` | Kalkulasi benefit plan |
| **Access Guard** | `src/lib/access-guard.ts` | RBAC middleware untuk server actions |
| **Audit** | `src/lib/audit.ts` | Audit trail helper |
| **Prisma Master** | `prisma/master.prisma` | Schema master DB |
| **Prisma Tenant** | `prisma/tenant.prisma` | Schema tenant DB (701 lines) |

---

## 6. Scripts

```bash
npm run dev              # Start dev server
npm run build            # Build production
npm run db:generate      # Generate Prisma clients (master + tenant)
npm run db:push          # Push schema ke DB
npm run db:seed          # Seed data
npm run db:reset-transactional  # Wipe t_* tables
```

---

## 7. Environment

File: `.env`

```
MASTER_DATABASE_URL=postgresql://...
TENANT_DATABASE_URL=postgresql://...
```

---

## 8. Design System

Branding (dari PRD):
- **Primary (Electric Indigo):** `#6D5BFF`
- **Accent (Padel Lime):** `#C6FF3D`
- **Secondary (Court Teal):** `#14B8A6`
- **Ink:** `#0E1116`

Font: Outfit

---

## 9. Pending / Known Issues

Lihat `docs/INPUT_CATALOG.md` untuk:
- Select components yang perlu `searchable`
- TextInput yang perlu tooltip
- Switch yang perlu hint

---

## 10. Related Documentation

- `docs/PRD.md` — Product requirements
- `docs/design.md` — Design system tokens
- `docs/INPUT_CATALOG.md` — Input/select component audit
