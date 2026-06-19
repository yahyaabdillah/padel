# Design Document

## Overview

This feature adds member self-service booking enhancements and a full membership
purchase flow (staff + member), backed by two new transactional tables and a
small extension to `t_booking`. It reuses the existing `calcMembershipBenefit`
helper, the DB-backed booking actions, the RBAC guard, and the existing UI
component library.

Key architectural decisions locked during requirements:

- **Payment is record-only now** (no gateway). A new `t_payment` table records
  each checkout; it is shaped so a future payment-gateway spec can extend it
  (`pending`/`failed`, provider id, callbacks) without restructuring bookings or
  membership.
- **Join fees move to `t_membership_history`** (no longer recorded on
  `t_booking.joinFee`). This table is both the join-fee financial record and the
  membership audit/history feed.
- **Plan-before-court ordering**: in a combined checkout the membership change
  is applied first (so the court price reflects the new plan), all inside one DB
  transaction.
- **Two membership operations on an existing plan**: Extend (same plan, reset
  cycle + quota) and Upgrade (replace plan, forfeit remaining quota). Plain
  "Buy" only for a member with no plan.
- **Out of scope**: wallet/balance, refunds, reschedule (separate future spec).

## Data Models

### New tenant tables (transactional `t_*`, wiped on reset)

Both new tables follow the project's standard audit + soft-delete columns
(`createdAt/By`, `updatedAt/By`, `deletedAt/By`, `isDeleted`) and are scoped by
`companyId`.

#### `t_payment` — one row per checkout (record-only, gateway-ready)

```prisma
/// A payment for one checkout (record-only now; a future payment-gateway spec
/// extends it without touching bookings/membership). Links the membership
/// history entry and/or the booking transaction made in the same checkout via
/// paymentRef.
model t_payment {
  id          String  @id @default(uuid()) @db.Uuid
  companyId   String  @db.VarChar(50)
  /// stable per-checkout reference (e.g. PAY-2026-xxxx), unique per tenant
  paymentRef  String  @db.VarChar(40)
  /// Cash | QRIS | Transfer
  method      String  @db.VarChar(20)
  /// total charged = membershipAmount + courtAmount (IDR)
  amount      Int     @default(0)
  membershipAmount Int @default(0)
  courtAmount      Int @default(0)
  /// paid (always now) | pending | failed | cancelled | refunded
  status      String  @default("paid") @db.VarChar(20)
  /// who paid: member | staff
  paidByType  String  @db.VarChar(20)
  /// cash handling at the desk (null for non-cash)
  cashReceived Int?
  cashChange   Int?
  note        String? @db.Text

  // ── future payment-gateway placeholders (nullable, unused now) ──
  provider    String?   @db.VarChar(40)   // e.g. "midtrans"
  externalId  String?   @db.VarChar(120)  // gateway transaction id
  paidAt      DateTime? @db.Timestamp(0)

  // ── audit + soft delete ──
  createdAt DateTime  @default(now()) @db.Timestamp(0)
  createdBy String?   @db.VarChar(100)
  updatedAt DateTime  @updatedAt @db.Timestamp(0)
  updatedBy String?   @db.VarChar(100)
  deletedAt DateTime? @db.Timestamp(0)
  deletedBy String?   @db.VarChar(100)
  isDeleted Int       @default(0)

  bookings  t_booking[]
  histories t_membership_history[]

  @@unique([companyId, paymentRef])
  @@index([companyId])
  @@index([status])
  @@index([isDeleted])
}
```

Notes:
- `status` enum includes `cancelled` and `refunded` from day one (per the
  decision to "prepare for cancelled/refund"), even though this feature only
  ever writes `paid`. Cancellation of a booking does NOT mutate the payment in
  this feature; the extra statuses exist so the future wallet/refund spec can
  transition them without a migration.
- `membershipAmount` + `courtAmount` give a clean split for reporting
  (membership revenue vs court revenue) without joining other tables.

#### `t_membership_history` — one row per membership action

```prisma
/// Audit + financial log of membership actions (assign | extend | upgrade).
/// Replaces recording the join fee on t_booking. Visible to staff (per member)
/// and to the member (their own).
model t_membership_history {
  id          String  @id @default(uuid()) @db.Uuid
  companyId   String  @db.VarChar(50)
  memberId    String  @db.Uuid
  /// target plan of the action
  planId      String  @db.Uuid
  planName    String  @db.VarChar(100) // snapshot at action time
  /// assign | extend | upgrade
  action      String  @db.VarChar(20)
  /// previous plan (set on upgrade), for the record
  previousPlanId   String? @db.Uuid
  previousPlanName String? @db.VarChar(100)
  /// join fee charged for this action (IDR, snapshot)
  joinFee     Int     @default(0)
  /// Cash | QRIS | Transfer (null when joinFee = 0)
  method      String? @db.VarChar(20)
  /// link to the payment record (null when joinFee = 0)
  paymentId   String? @db.Uuid
  /// who performed it: staff | member
  actorType   String  @db.VarChar(20)
  /// cycleStart snapshot applied by this action
  cycleStart  DateTime? @db.Timestamp(0)
  note        String? @db.Text

  // ── audit + soft delete ──
  createdAt DateTime  @default(now()) @db.Timestamp(0)
  createdBy String?   @db.VarChar(100)
  updatedAt DateTime  @updatedAt @db.Timestamp(0)
  updatedBy String?   @db.VarChar(100)
  deletedAt DateTime? @db.Timestamp(0)
  deletedBy String?   @db.VarChar(100)
  isDeleted Int       @default(0)

  member  t_member          @relation(fields: [memberId], references: [id])
  plan    m_membership_plan @relation(fields: [planId], references: [id])
  payment t_payment?        @relation(fields: [paymentId], references: [id])

  @@index([companyId])
  @@index([memberId])
  @@index([action])
  @@index([isDeleted])
}
```

### Changes to existing models

`t_booking` — add an optional link to the payment record:

```prisma
model t_booking {
  // ... existing fields ...
  /// link to the checkout payment (new). joinFee field is kept for
  /// backward-compat but is NO LONGER the system of record for join fees.
  paymentId String? @db.Uuid
  payment   t_payment? @relation(fields: [paymentId], references: [id])
  // ... existing relations ...
  @@index([paymentId])
}
```

Back-relations to add:
- `t_member` → `membershipHistory t_membership_history[]`
- `m_membership_plan` → `membershipHistory t_membership_history[]`

### Reset-transactional ordering

`prisma/reset-transactional.ts` must delete in FK-safe order. New additions:
`t_membership_history` and `t_booking` reference `t_payment`, so delete order
becomes: `t_checkin` → `t_membership_history` → `t_booking_detail` →
`t_booking` → `t_payment` → (coaching) → `t_court_maintenance` → `t_member`.

### Field-level alignment to requirements

| Requirement | Schema support |
|---|---|
| R5/R6/R7 membership history per action | `t_membership_history.action` (assign/extend/upgrade) + plan/previousPlan snapshots |
| R5/R6/R7 join fee recorded off `t_booking` | `t_membership_history.joinFee` + `t_payment` |
| R7 member buy/extend/upgrade | same table; `actorType = member` |
| R9 history feed (staff per-member + member own) | `t_membership_history` scoped by `companyId` + `memberId` |
| R12 single payment for combined checkout | `t_payment` + shared `paymentRef` on both `t_booking` and `t_membership_history` |
| R12 cash ≥ total at desk | `t_payment.cashReceived` / `cashChange` |
| R12 gateway-ready | `t_payment.status` (incl. pending/failed/cancelled/refunded), `provider`, `externalId`, `paidAt` |
| R13 stop using `t_booking.joinFee` | field kept for back-compat, no longer written for new join fees |
| R11 audit + soft delete | full audit columns on both new tables |

## UI building blocks (survey of existing components)

The implementation will reuse existing `components/ui` and `club-core` parts.
Survey result (so we only flag genuinely-missing pieces):

**Already available — reuse:**
- Layout/containers: `PageScaffold`, `Card`, `ComponentCard`, `Drawer`,
  `ModalDialog`, `Tabs`.
- Inputs: `TextInput`, `CurrencyInput`, `Select`, `Switch`, `DatePicker`,
  `PhoneInput`, `InputLabel`, `Button`, `Badge`, `useToast`.
- **`Stepper`** (`components/ui/stepper/Stepper`) — exists; usable for a
  combined plan+court checkout if we want a multi-step flow.
- **`MemberDetailDrawer`** (`club-core`) — already shows a member profile and
  has a plan-assign modal calling `assignMemberPlanAction`. The staff membership
  management ("Kelola Membership" → detail) will build on this drawer / a
  dedicated membership detail view rather than a brand-new pattern.
- Membership plan cards: the pattern in `settings/plans/page.tsx` and the member
  mock `me/membership/page.tsx` (tier cards) will be adapted for the DB-backed
  plan list.
- `calcMembershipBenefit` — shared pricing helper, reused unchanged.

**Member mock to replace:** `me/membership/page.tsx` currently renders tier
cards + a wallet panel + upgrade modal from mock data (`tierDefinitions`,
`walletState`). The wallet panel will be dropped (wallet is out of scope); the
plan cards + current-status + history become DB-backed.

**Potentially missing — to confirm before building (per user request to reuse
`components/ui`, ask when something is absent):**
- A **read-only "membership status" summary card** for the member portal
  (current plan, quota remaining, cycle reset) — likely composed from existing
  `Card` + `Badge` + `Progress`; no new primitive needed.
- A **history list/table** for membership actions — can use existing list/table
  primitives; will confirm whether to use `DataTable` or a simple list.

These will be itemized in the Components section (next pass); none appears to
require a new low-level UI primitive so far.

## Architecture

### Shared checkout core (`src/lib/checkout-core.ts`)

A single server-side module owns the rules that span membership + booking +
payment so every surface (staff registration, booking modal, staff membership
page, member booking, member membership) behaves identically. It is the only
place that opens the cross-entity DB transaction.

```ts
// All functions run inside one db.$transaction(tx => ...) when combined.

type Actor = { kind: "staff" | "member"; userId: string; memberId?: string };
type PayMethod = "Cash" | "QRIS" | "Transfer";

// Generate a tenant-unique payment reference (PAY-YYYY-xxxx).
function genPaymentRef(companyId: string): string;

// Resolve a member's live plan + remaining quota with cycle rollover applied
// (the same logic getMemberByIdAction already uses).
async function resolveMemberBenefit(tx, companyId, memberId): Promise<{
  plan: BenefitPlan | null; quotaRemaining: number; joinFeeDue: number;
}>;

// Apply a membership action to t_member + write t_membership_history.
// Used by assign / extend / upgrade on both staff & member sides.
async function applyMembershipAction(tx, args: {
  companyId; memberId; planId; action: "assign" | "extend" | "upgrade";
  actor: Actor; joinFee: number; method?: PayMethod; paymentId?: string;
}): Promise<MembershipHistoryRow>;

// Create the single payment record for a checkout.
async function recordPayment(tx, args: {
  companyId; method: PayMethod; membershipAmount; courtAmount;
  paidByType: "staff" | "member"; cashReceived?: number; actor: Actor;
}): Promise<{ id: string; paymentRef: string; change: number }>;

// The orchestrator. Validates method, enforces cash >= total (staff cash),
// applies membership FIRST (so court pricing sees the new plan), prices courts
// via calcMembershipBenefit, persists booking, links everything by paymentRef,
// all in ONE transaction.
async function runCheckout(args: {
  companyId; actor: Actor; method: PayMethod;
  membership?: { planId; action: "assign" | "extend" | "upgrade" };
  bookings?: BookingDraftInput[]; cashReceived?: number;
}): Promise<CheckoutResult>;
```

Ordering inside `runCheckout` (R12):

1. Open `db.$transaction`.
2. Validate payment method for the actor (member → non-cash; staff → any).
3. If `membership` present: `applyMembershipAction` (updates `t_member`, writes
   history row — payment linked after step 6).
4. Re-resolve member benefit (now reflects the just-applied plan).
5. If `bookings` present: price via `calcMembershipBenefit`, run overlap guard,
   persist `t_booking` + lines, increment `quotaUsed`.
6. Compute totals (`membershipAmount` = join fee, `courtAmount` = court
   payable). Enforce cash ≥ total for staff cash; else reject (rollback).
7. `recordPayment` → set `paymentId` on the history row and/or booking header.
8. Commit. Return `{ paymentRef, membershipAmount, courtAmount, total, change,
   bookingId?, historyId? }`.

Any thrown error rolls the whole transaction back (R12.2) — no partial writes.

### Why a shared core (not per-surface logic)

Three existing entry points already assign plans (registration, booking
quick-add modal, manual assign drawer) and would otherwise drift. Routing all of
them through `runCheckout` / `applyMembershipAction` satisfies R13 and keeps the
"plan recorded in history, join fee off `t_booking`" rule in exactly one place.

## Components and Interfaces

### Server Actions

All mutations call `requirePermission`; all reads validate the session and scope
by `companyId`. New/changed actions:

### Member booking — `src/app/(admin)/me/book/actions.ts` (extend existing)

| Action | Guard | Purpose |
|---|---|---|
| `getMeBookDataAction()` | member session | courts + membership benefit + time-groups (R4) |
| `getMeOccupancyAction(dateKey)` | member session | occupied slots for the day |
| `previewMyBookingAction(input)` | member session | price preview, no persist (R2.1) |
| `createMyBookingAction(input)` | member session | **multi-session** checkout via `runCheckout` (R1, R2); rejects non-cash violation, overlap, empty |
| `cancelMyBookingAction(detailId)` | `requirePermission("portal.bookings","cancel")` | member cancels own future session; restore quota; release slot (R3) |

`createMyBookingAction` input becomes a list of sessions (court+start+duration)
instead of a single slot, mirroring `createBookingsAction`.

### Member membership — `src/app/(admin)/me/membership/actions.ts` (new)

| Action | Guard | Purpose |
|---|---|---|
| `getMyMembershipAction()` | member session | current plan, quota, reset date, active plans, own history (R7.1–7.3, R9.3) |
| `buyMyMembershipAction({planId, method})` | member session | assign when no plan (R7.4) via `runCheckout` |
| `extendMyMembershipAction({method})` | member session | extend current plan (R7.5) |
| `upgradeMyMembershipAction({planId, method})` | member session | upgrade to different plan (R7.6) |

All three enforce non-cash (R7.7–7.8), own-account-only (R7.12), plan validation
(R7.11), and write history + payment via the core.

### Staff membership — `src/app/(admin)/members/membership/actions.ts` (new)

| Action | Guard | Purpose |
|---|---|---|
| `getMembershipOverviewAction(memberId)` | `canViewMenu("members.membership")` via view | member summary + plan + history (R9.2) |
| `assignPlanStaffAction({memberId, planId, method, cashReceived?})` | `requirePermission("members.membership","create"/"update")` | assign to no-plan member (R5) |
| `extendPlanStaffAction({memberId, method, cashReceived?})` | update | extend current plan (R6.1) |
| `upgradePlanStaffAction({memberId, planId, method, cashReceived?})` | update | upgrade to different plan (R6.2) |
| `getMembershipMembersAction(q)` | view | member list for the membership menu landing |

### Consistency refactor (R13)

- `registerMemberAction` (members/actions.ts): when a plan is chosen, route the
  join fee through `applyMembershipAction` + `recordPayment` instead of writing
  `t_booking.joinFee`. Court bookings still persist via the booking path, all in
  one `runCheckout`.
- `assignMemberPlanAction` (used by `MemberDetailDrawer`): delegate to
  `applyMembershipAction` so it writes history (+ payment when a fee is taken).
- Booking quick-add-member modal: same path as registration.

## Pages and Routes

### Staff — new Membership menu (`members.membership`)

- `/members/membership` — landing: searchable member list; each row → detail.
- `/members/membership/[memberId]` (or a Drawer/detail panel) — membership
  detail: current plan, quota, cycle reset, **history list**, and actions
  **Assign / Extend / Upgrade** (with payment method; Cash allowed → cash
  received + change). Built on the `MemberDetailDrawer` pattern or a dedicated
  detail view.
- **Data Member (`/members`)**: add a "Kelola Membership" button per member that
  navigates to the membership detail (R10.3).

### Member — DB-backed `/me/membership`

Replaces the mock. Sections:
- **Status card**: current plan, quota remaining + reset date (Card + Badge +
  Progress), or a "daily / walk-in" state with a Buy call-to-action (R7.2–7.3).
- **Plan list**: active plans as cards (adapted from `settings/plans` pattern)
  with Buy / Extend / Upgrade buttons depending on current state.
- **History**: the member's own membership history (R9.3).
- Wallet panel from the mock is removed (out of scope).

### Member — `/me/book` multi-session

- Add a lightweight cart: selected slots accumulate; a summary panel shows the
  combined `calcMembershipBenefit` preview; confirm runs `createMyBookingAction`
  with all sessions. Time-group labels on the hour axis (R4). Non-cash method
  selection (QRIS/Transfer).

### Menu catalog additions (`src/data/padel/menu-catalog.ts`)

- New staff menu `members.membership` (label "Membership", under the Manage
  Member group), granted to **owner + staff** (superadmin bypasses).
- Confirm `portal.membership` exists for the member role (it already does).
- Reseed via `npm run db:seed` after editing the catalog.

## RBAC & Menu Access

RBAC is enforced exactly like the rest of the app: **every mutation server
action** calls `requirePermission(menuKey, action)` and **every gated page**
calls `canViewMenu(menuKey)` before fetching data. Only `superadmin` bypasses.
All queries/mutations are scoped to `session.companyId`.

### Menu keys + default grants

| Menu key | Surface | Group | Default grants |
|---|---|---|---|
| `members.membership` | Staff membership management (landing + detail) | Manage Member | **owner: full**, **staff: full** (view/create/update), superadmin bypass |
| `members.data` (existing) | Data Member; hosts "Kelola Membership" button | Manage Member | unchanged |
| `portal.membership` (existing) | Member `/me/membership` | Member portal | **member: view, create** |
| `portal.bookings` (existing) | Member `/me/bookings` + cancel | Member portal | **member: view, cancel** (add `cancel`) |
| `portal.book` (existing) | Member `/me/book` | Member portal | **member: view, create** |

Catalog edits (`src/data/padel/menu-catalog.ts`), then reseed (`npm run db:seed`):
- Add `members.membership` (icon e.g. `BadgeCheck`/`Wallet`, parent the Manage
  Member group), granting owner + staff.
- Ensure `portal.membership` grants the member role `view` + `create`.
- Ensure `portal.bookings` grants the member role `cancel` (needed by R3.8).

### Per-action guard map

Staff membership (`members/membership/actions.ts`):
- `getMembershipOverviewAction` / `getMembershipMembersAction` → page guarded by
  `canViewMenu("members.membership")`; actions verify session + view grant.
- `assignPlanStaffAction` → `requirePermission("members.membership", "create")`
  (fallback `update`).
- `extendPlanStaffAction`, `upgradePlanStaffAction` →
  `requirePermission("members.membership", "update")`.

Member membership (`me/membership/actions.ts`) — all require a `role === member`
session AND the portal grant, and act only on the acting member's own account
(R7.12):
- `getMyMembershipAction` → member session + `canViewMenu("portal.membership")`.
- `buyMyMembershipAction` → `requirePermission("portal.membership", "create")`.
- `extendMyMembershipAction` / `upgradeMyMembershipAction` →
  `requirePermission("portal.membership", "create")` (membership purchase is a
  create-type action for the member).

Member booking (`me/book/actions.ts`):
- reads → member session.
- `createMyBookingAction` → `requirePermission("portal.book", "create")`.
- `cancelMyBookingAction` → `requirePermission("portal.bookings", "cancel")`.

Consistency refactor — the existing guards are preserved:
- `registerMemberAction` → `requirePermission("members.register", "create")`
  (unchanged); the membership write it now performs runs inside the same
  permission scope.
- `assignMemberPlanAction` (MemberDetailDrawer) → keep its existing
  `requirePermission("members.data", "update")` guard.

### Enforcement notes

- The shared `runCheckout` / `applyMembershipAction` core does NOT itself call
  `requirePermission`; the **calling server action** is responsible for the
  guard before invoking the core (so the core stays reusable across staff and
  member contexts with different menu keys). Each action above performs its
  guard first, then calls the core.
- Member-initiated actions additionally assert `args.memberId === session.id`
  (own-account-only) regardless of menu grant (R7.12, Property 8).
- `superadmin` bypasses menu checks but membership writes still record
  `actorType` correctly (staff) for the history feed.

## Error Handling

- Validation failures (empty checkout, overlap, wrong method, cash short,
  unknown/inactive plan, foreign member) return `{ success:false, error }`; the
  transaction rolls back so nothing partial persists.
- RBAC denials return the guard's authorization message; superadmin bypasses.
- Reads return safe empty shapes (`null` / `[]`) when unauthenticated.

## Correctness Properties

### Property 1: Combined checkout is atomic
A combined membership+booking checkout either persists the membership change,
the booking, AND the payment together, or none of them.

**Validates: Requirements 12.2**

### Property 2: Plan applies before court pricing
In a combined checkout the court price reflects the just-applied plan's quota
and discount, never the pre-checkout plan.

**Validates: Requirements 12.1**

### Property 3: One payment per checkout
Every checkout produces exactly one `t_payment` row, and all records it
created share that row's `paymentRef`.

**Validates: Requirements 12.3, 12.7**

### Property 4: Join fee is recorded off `t_booking`
Every assign/extend/upgrade writes a `t_membership_history` row; no new join fee
is written to `t_booking.joinFee`.

**Validates: Requirements 5.1, 6.1, 6.2, 13.1, 13.5**

### Property 5: Quota accounting is conserved
A successful booking increments `quotaUsed` by the covered-session count; a
cancellation of a quota-covered session decrements it by exactly one, never
below zero, and never double-counts an already-cancelled session.

**Validates: Requirements 1.5, 3.4, 3.6**

### Property 6: Member payments are non-cash
No member-initiated booking or membership action persists with a Cash method.

**Validates: Requirements 2.2, 7.7**

### Property 7: Plan never silently reverts to daily
A member with an assigned plan whose quota hits zero keeps `planId`/`tier`; only
an explicit action changes the plan.

**Validates: Requirements 8.3**

### Property 8: Tenant + ownership isolation
Every read/write is scoped by `companyId`; members act only on their own
account and bookings.

**Validates: Requirements 3.3, 7.12, 10.6**

### Property 9: History reflects only committed actions
A rejected membership action writes no history row and no payment.

**Validates: Requirements 9.5**

## Testing Strategy

Per project convention tests are not auto-added; verification is typecheck +
build + manual smoke + temporary `diag.ts` DB inspection. Manual smoke matrix:

- Member booking: single + multi-session; quota-covered, discounted, full-rate;
  overlap rejection; non-cash enforcement; cancel restores quota + frees slot.
- Member membership: buy (no plan), extend (same plan, quota resets), upgrade
  (plan replaced, quota forfeited); non-cash enforced; history appears.
- Staff membership: assign/extend/upgrade with Cash (received ≥ total, change)
  and non-cash; history per member; "Kelola Membership" navigation.
- Combined checkout: register-with-plan-and-court, and member buy+book in one
  go → one payment, plan applied before court, atomic rollback on overlap.
- Consistency: registration/quick-add/manual-assign all write history + payment,
  none writes `t_booking.joinFee`.
- DB: inspect `t_payment`, `t_membership_history`, `t_member` via temp `diag.ts`;
  confirm reset-transactional clears the new tables in FK-safe order.

## Open questions (flag during implementation)

- Staff membership detail: dedicated route `/members/membership/[memberId]`
  vs reusing the existing `MemberDetailDrawer` with an added membership tab —
  decide at build time based on fit (drawer likely sufficient).
- Multi-session cart UX on `/me/book`: inline summary panel vs `Stepper`. Will
  confirm with the user if a new UI primitive is needed; current primitives
  (`Card`, `Button`, `Badge`, `ModalDialog`, `Stepper`) appear sufficient.
