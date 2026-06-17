# Design Document

## Overview

This design delivers two database-backed menus — **Check-in** and **Company Settings** — replacing the current mock-only check-in page and introducing a per-tenant company profile. Both follow the established PadelHub architecture: tenant-scoped Prisma models with audit/soft-delete columns, server actions guarded by the existing RBAC system (`requirePermission` / `canViewMenu`), and UI built from existing components and design tokens.

The two features are coupled by the **Company Profile**, whose `scanStaffBooking` toggle, `strictWindow`, and `checkinWindowMin` settings drive the Check-in module's behavior. Check-in itself operates at the **booking-header (`t_booking`) level**: a single check-in event flips the header and all its non-cancelled court lines to `checked_in`, and is permanently logged in a new `t_checkin` table.

### Goals

- Persist check-ins to the tenant DB with a permanent audit log (`t_checkin`), surviving reloads.
- Support three entry paths: manual member search, walk-in quick-register, and QR (both directions).
- Drive QR direction from a single boolean Company Setting (staff-scans-member vs member-scans-staff).
- Store a per-tenant company profile (name, address, logo, phone, email, timezone) plus check-in operational settings.
- Reuse existing helpers/components (member registration, image cropper, dropzone, RBAC) rather than duplicating.

### Non-Goals

- Rotating/short-lived staff QR (accepted risk: static staff QR; member bears the cost of remote check-in).
- Rich attendance analytics/reporting beyond today's log + counts.
- Operating-hours editing (already a separate menu, `m_operating_hours`).

## Architecture

### High-level flow

```
Company Settings page (superadmin)
  └─ m_company (1 row / tenant): name, address, logo, phone, email, timezone,
                                 scanStaffBooking, strictWindow, checkinWindowMin
                       │ read by
                       ▼
Check-in page (owner/staff) ──────────────────────────────────────────────┐
  ├─ Manual: search t_member → resolve nearest t_booking today → confirm   │
  ├─ Walk-in: registerMemberAction(Free_Daily_Plan) → log check-in         │
  ├─ QR (scanStaffBooking=true):  Camera_Scanner reads Member Booking_Token │
  └─ QR (scanStaffBooking=false): display static Staff QR (tenant)          │
                       │ all paths call                                      │
                       ▼                                                      │
  checkin-core.ts (shared server helper): validate window, resolve booking, │
                                          verify token, write t_checkin +    │
                                          flip t_booking(.details) status    │
                                                                              │
Member portal /me/checkin ────────────────────────────────────────────────┘
  ├─ scanStaffBooking=true:  display Member Booking_Token QR
  └─ scanStaffBooking=false: "Scan" button → Camera_Scanner reads Staff QR → self check-in
```

### New dependencies

Two small client-side libraries are required (no real QR exists today — `StaticQrCode` is a faux visual):

- **`qrcode`** — generate a genuine scannable QR (used for both Member Booking_Token QR and the static Staff QR). Rendered to a canvas/data-URL in a client component.
- **`html5-qrcode`** — decode QR via the device camera in the Camera_Scanner component. Chosen over `@zxing/browser` for its simpler self-contained start/stop API and built-in camera selection. No server code.

Token signing uses Node's built-in `crypto` (HMAC-SHA256) — no extra dependency. A secret is read from env (`CHECKIN_TOKEN_SECRET`, falling back to an existing app secret).

### QR scan handling: server actions, NOT webhooks

There is **no webhook or external callback** and **no custom API route**. Scanning happens in a browser that is already part of the app, so the camera decode (client) hands the decoded string directly to a **Next.js server action** (App Router server actions are POST endpoints under the hood, type-safe, and automatically pass through the RBAC guard). The shared `checkin-core.ts` helper does the validation + persistence for every path.

**Mode A — staff scans member (`scanStaffBooking = true`):**

```
[Member portal /me/checkin]
  RealQrCode → renders QR encoding the signed Booking_Token
        │  (staff device camera reads it)
        ▼
[Staff /checkin] CameraScanner (html5-qrcode, client component)
        │  onDecode(tokenString)
        ▼
  qrStaffScanAction(token)            ── server action (guarded: checkin/create)
        │  verifyBookingToken → evaluateWindow → recordCheckin (txn)
        ▼
  { success, memberName, courtName } | { success:false, reason }
        ▼
  toast + today's log re-fetched/optimistically updated
```

**Mode B — member scans staff (`scanStaffBooking = false`):**

```
[Staff /checkin]
  RealQrCode → renders static QR "PADELHUB-CHECKIN-{companyId}"
        │  (member device camera reads it)
        ▼
[Member portal /me/checkin] "Scan" button → CameraScanner (client)
        │  onDecode(staffQrText)
        ▼
  mySelfCheckinAction(staffQrText)    ── server action (member session)
        │  assert tenant match → findNearestBookingToday → evaluateWindow → recordCheckin (txn)
        ▼
  { success } | { success:false, reason } → result shown in portal
```

Manual and walk-in paths are plain form submits to `manualCheckinAction` / `walkinCheckinAction` — same server-action pattern, no scanning involved. In short: **client decodes, server action validates + writes, helper is shared. No webhook, no /api route.**

## Data Models

### New tenant model: `m_company`

Master (`m_*`) table — one row per `companyId`, NOT wiped on transactional reset.

```prisma
/// Company profile + operational settings — one row per tenant/club.
model m_company {
  id               String  @id @default(uuid()) @db.Uuid
  companyId        String  @db.VarChar(50)
  name             String  @db.VarChar(255)
  address          String? @db.Text
  logo             String? @db.VarChar(255) // /images/logo/xxx.png
  phone            String? @db.VarChar(30)
  email            String? @db.VarChar(150)
  timezone         String  @default("Asia/Jakarta") @db.VarChar(64)

  // ── check-in operational settings ──
  /// true  = staff scans the member's booking QR (member shows QR, staff has scanner)
  /// false = member scans the club's static QR (staff shows QR, member has scanner)
  scanStaffBooking Boolean @default(false)
  /// require booking start within checkinWindowMin of "now"
  strictWindow     Boolean @default(false)
  /// ± tolerance in minutes for the strict window
  checkinWindowMin Int     @default(15)

  // ── audit + soft delete ──
  createdAt DateTime  @default(now()) @db.Timestamp(0)
  createdBy String?   @db.VarChar(100)
  updatedAt DateTime  @updatedAt @db.Timestamp(0)
  updatedBy String?   @db.VarChar(100)
  deletedAt DateTime? @db.Timestamp(0)
  deletedBy String?   @db.VarChar(100)
  isDeleted Int       @default(0)

  @@unique([companyId])
  @@index([companyId])
}
```

### New tenant model: `t_checkin`

Transactional (`t_*`) table — wiped by `npm run db:reset-transactional`.

```prisma
/// A check-in event log. One row per attempt (success OR rejected) for audit.
/// Check-in is header-level: bookingId references t_booking, and on success all
/// of that booking's non-cancelled lines are set to checked_in.
model t_checkin {
  id          String   @id @default(uuid()) @db.Uuid
  companyId   String   @db.VarChar(50)
  memberId    String?  @db.Uuid       // resolved t_member (null only for an unresolved rejected attempt)
  memberName  String   @db.VarChar(255)
  bookingId   String?  @db.Uuid       // t_booking header (null for walk-in / no-booking reject)
  courtName   String?  @db.VarChar(255) // denormalized label for the log feed
  method      String   @db.VarChar(20) // manual | qr | walkin
  result      String   @db.VarChar(20) // success | rejected
  reason      String?  @db.Text        // populated when result = rejected
  at          DateTime @default(now()) @db.Timestamp(0)

  // ── audit + soft delete ──
  createdAt DateTime  @default(now()) @db.Timestamp(0)
  createdBy String?   @db.VarChar(100)
  updatedAt DateTime  @updatedAt @db.Timestamp(0)
  updatedBy String?   @db.VarChar(100)
  deletedAt DateTime? @db.Timestamp(0)
  deletedBy String?   @db.VarChar(100)
  isDeleted Int       @default(0)

  member  t_member?  @relation(fields: [memberId], references: [id])
  booking t_booking? @relation(fields: [bookingId], references: [id])

  @@index([companyId])
  @@index([memberId])
  @@index([bookingId])
  @@index([result])
  @@index([at])
  @@index([isDeleted])
}
```

Back-relations to add: `t_member.checkins t_checkin[]` and `t_booking.checkins t_checkin[]`.

The existing `t_booking.status` and `t_booking_detail.status` already include `checked_in` in their comments — no enum change needed.

### Migration / generation

Because the dev server locks the Prisma engine DLL: `Stop-Process -Name node -Force` → `npx prisma db push` (tenant schema) → regenerate client. Then reseed menus (`npm run db:seed`). `reset-transactional.ts` must be extended to truncate `t_checkin`.

## Menu Catalog Additions

Add to `src/data/padel/menu-catalog.ts` (`MENU_CATALOG`):

```ts
// ── Check-in (Club) — standalone top-level item ──
{
  key: "checkin",
  label: "Check-in",
  path: "/checkin",
  icon: "QrCode",
  parentKey: null,
  groupKey: "main",
  section: "Club",
  sortOrder: next(),
  grants: { owner: "*", staff: "*", coach: ["view"] },
},

// ── Company Settings — under the existing "master" group (or access group) ──
{
  key: "settings.company",
  label: "Company Settings",
  path: "/settings/company",
  icon: "Building2",
  parentKey: "master",
  groupKey: "others",
  section: "Club",
  sortOrder: next(),
  grants: { superadmin: "*" }, // superadmin only for now; tunable via RBAC
},
```

Seeded by the existing loop in `prisma/seed.ts` (no seed-code change beyond running it). Icons `QrCode` and `Building2` are valid lucide names resolved by `AppSidebar`.

## Components and Interfaces

### Shared server helper — `src/lib/checkin-core.ts`

Single source of truth for validation + persistence, used by all paths. Pure-ish functions + DB writers.

```ts
type CompanySettings = {
  scanStaffBooking: boolean;
  strictWindow: boolean;
  checkinWindowMin: number;
  timezone: string;
};

// Resolve the member's non-cancelled bookings TODAY (timezone-aware) and pick
// the one whose earliest line start is nearest to now.
async function findNearestBookingToday(db, companyId, memberId, now): Promise<BookingMatch | null>

// Apply strict/loose window rule. Returns { ok, reason? }.
function evaluateWindow(match, now, settings): { ok: boolean; reason?: string }

// The one writer: creates a t_checkin row and (on success) flips the booking
// header + all non-cancelled detail lines to checked_in, in a transaction.
async function recordCheckin(db, args): Promise<CheckinResult>

// Booking_Token (HMAC). payload = { c: companyId, b: bookingId, exp: <latest end ms> }
function signBookingToken(companyId, bookingId, expMs): string   // base64url(payload).sig
function verifyBookingToken(token): { companyId; bookingId; expMs } | null
```

`now` is derived from the tenant timezone. For consistency with the rest of the mock/demo (which uses a fixed demo clock), the helper accepts an injectable `now` and the page passes the real `new Date()`; the demo-clock alignment from the old mock is dropped since data is now real.

### Server actions — `src/app/(admin)/checkin/actions.ts`

All guarded by `requirePermission("checkin", …)` / data reads by a session check.

| Action | Guard | Purpose |
|---|---|---|
| `getCheckinPageDataAction()` | view | Returns company settings, today's `t_checkin` log, success/reject counts, active courts, member search seed. |
| `searchMembersAction(q)` | view | Active members for the manual search box. |
| `getMemberBookingsTodayAction(memberId)` | view | Member's bookings today + nearest match preview (for the confirm UI). |
| `manualCheckinAction(memberId)` | create | Resolve nearest booking, validate, `recordCheckin` (method `manual`). |
| `walkinCheckinAction(input)` | create | `registerMemberAction`-style quick register on Free_Daily_Plan, then `recordCheckin` (method `walkin`, no booking). |
| `qrStaffScanAction(token)` | create | Verify Booking_Token, validate, `recordCheckin` (method `qr`). Used when `scanStaffBooking=true`. |

Member-side self check-in lives under the member portal actions:

### Member portal — `src/app/(admin)/me/checkin/` (existing route, to be rewired)

The member portal check-in page already exists at `src/app/(admin)/me/checkin/page.tsx` (currently mock). It will be rewired to the new actions below.

| Action | Purpose |
|---|---|
| `getMyCheckinViewAction()` | Returns `scanStaffBooking`, and (if true) the member's nearest booking today + its signed Booking_Token; (if false) the static Staff QR text. |
| `mySelfCheckinAction(staffQrText)` | When `scanStaffBooking=false`: member scanned the club QR; validate tenant match + nearest booking, `recordCheckin` (method `qr`). |

Member identity comes from the member session (the `/me` portal already authenticates members); `companyId` from session.

### Company Settings — `src/app/(admin)/settings/company/`

| File | Purpose |
|---|---|
| `page.tsx` | Server component, `canViewMenu("settings.company")` guard → `<AccessDenied/>` else render client. |
| `CompanySettingsClient.tsx` | Form: name (TextInput), address (textarea), phone (`PhoneInput`), email, timezone (searchable `Select`), logo (Dropzone + `ImageCropperModal` 1:1), and three check-in setting controls (`Switch` for scanStaffBooking + strictWindow, numeric input for checkinWindowMin). |
| `actions.ts` | `getCompanyAction()` (view), `saveCompanyAction(input)` (`requirePermission("settings.company","update")`), `uploadLogoAction(dataUrl)` (mirrors `uploadCourtImageAction`, writes to `public/images/logo`, returns `/images/logo/xxx.png`). |

Timezone options: a curated IANA list (or `Intl.supportedValuesOf("timeZone")` at build/runtime) fed into the searchable `Select`.

### UI components

| Component | Status | Notes |
|---|---|---|
| `RealQrCode` (new, `src/components/checkin/RealQrCode.tsx`) | new | Client; wraps `qrcode` to render a scannable QR to canvas. Replaces faux `StaticQrCode` usage for real scanning. Keep old `StaticQrCode` only if any decorative use remains; otherwise swap. |
| `CameraScanner` (new, `src/components/checkin/CameraScanner.tsx`) | new | Client; wraps `html5-qrcode`. Props: `onDecode(text)`, `onError`. Handles camera-permission failure with a visible message (Req 7.6). Start/stop on mount/unmount. |
| `CheckinPanel`, `CheckinResult` | adapt | Reuse presentation; rewire data from props (DB-shaped) instead of mock types. |
| `ImageCropperModal` / `ImageCropper` | reuse | For logo crop at `aspect = 1` (Req 2.8). |
| `Dropzone` | reuse | Logo upload entry. |

### Check-in page composition — `src/app/(admin)/checkin/`

`page.tsx` (server) guards `canViewMenu("checkin")`, fetches `getCheckinPageDataAction()`, renders `CheckinClient.tsx`:

- **Stat strip**: today's success / rejected / walk-in counts, window badge.
- **Left panel** (QR area): if `scanStaffBooking=true` → `CameraScanner` (staff scans member). If `false` → `RealQrCode` of `PADELHUB-CHECKIN-{companyId}` (static, for members to scan).
- **Middle**: manual check-in (`CheckinPanel` with member search) + walk-in form (name, `PhoneInput`, optional court).
- **Right**: today's log (`CheckinResult` list), live-updated after each action via re-fetch/optimistic insert.

## Error Handling

- **RBAC**: every mutation returns `{ success:false, error }` from the guard; UI shows toast. View guards render `<AccessDenied/>`.
- **Validation reasons** are persisted on the `t_checkin` row (`result="rejected"`, `reason`) AND surfaced to the operator. Cases: no booking today; outside strict window; already checked in (no duplicate success row — Req 5.8); invalid/expired/foreign token (Req 7.7); wrong tenant on staff QR.
- **Camera failure** (Req 7.6): `CameraScanner` catches `getUserMedia`/html5-qrcode errors and shows a fallback message; manual check-in stays usable.
- **Missing company profile** (Req 1.4 / 10.3): `getCompanyAction` returns safe defaults (name from tenant registry, `Asia/Jakarta`, scanStaffBooking=false, strictWindow=false, window=15) without 500.
- **Walk-in plan missing** (Req 6.3): `walkinCheckinAction` ensures/creates the Free_Daily_Plan before registering.
- **Logo upload**: validate mime/extension + size like `uploadCourtImageAction`; reject otherwise.

## Testing Strategy

Per project rules, tests are NOT added unless requested. Verification will be manual + typecheck/build:

- `npx tsc --noEmit --pretty false` after clearing `.next/dev/types`.
- Manual smoke per acceptance criteria: manual check-in flips header+lines; walk-in creates a daily member + log; QR both directions (staff scanner decodes member token; member scanner decodes static QR); strict vs loose window; rejected attempts logged; RBAC denial for a role without grants; company settings save + logo crop/upload; defaults when no `m_company` row.
- Inspect DB state with a temp `diag.ts` (`npx tsx`) when validating persistence, then delete it.

## Design Decisions and Rationale

1. **Header-level check-in (`t_booking`)** — per user: one booking = one check-in event; flipping all its lines avoids per-court partial states and matches how a token is shown once per booking. Token payload binds `bookingId`.
2. **Signed Booking_Token with expiry = latest line end** — per user: each booking yields a unique, tamper-resistant token that naturally expires when the session ends. HMAC via built-in `crypto`; no new dep, no DB token store.
3. **Static, unsigned Staff QR** — accepted risk (member-only downside). Server still validates booking + window after scan.
4. **Walk-in always registers a `t_member` on a Rp0 daily plan** — per user; reuses registration logic so walk-ins are first-class members and every check-in resolves to a real member.
5. **`m_company` as master (not transactional)** — company profile survives transactional resets; `t_checkin` is transactional (operational log, wiped on reset).
6. **Reuse `ImageCropperModal` at 1:1** — consistent with court image flow; avoids a redundant cropper.
7. **`qrcode` + `html5-qrcode`** — the existing `StaticQrCode` is explicitly non-scannable; real scanning needs genuine generation + camera decode.
8. **Company Settings = superadmin only initially** — per user; fully tunable later through the RBAC matrix without code change.

## Open Items (non-blocking)

- Whether to fully delete `StaticQrCode` or keep it for any decorative spot — decided at implementation time based on remaining references.
- Member portal check-in route already exists at `src/app/(admin)/me/checkin/` and will be rewired in place.

## Correctness Properties

These invariants must hold regardless of entry path (manual, walk-in, QR either direction).

### Property 1: One success per booking
A `t_booking` already in status `checked_in` SHALL NOT produce a second `success` `t_checkin` row; a repeated attempt yields an informational message, not a duplicate.

**Validates: Requirements 5.8, 7.2**

### Property 2: Atomic status flip
On a successful booking check-in, the header AND all its non-cancelled lines transition to `checked_in` within a single transaction — never a partial flip.

**Validates: Requirements 5.5, 7.2, 7.4**

### Property 3: Every attempt is logged
Success and rejected attempts both create a `t_checkin` row; a rejection never mutates booking status.

**Validates: Requirements 8.1, 8.2, 5.6, 7.5**

### Property 4: Token integrity
`verifyBookingToken` accepts a token only if the signature is valid, the tenant matches the active session, and `now ≤ expMs`; any failure → rejected `t_checkin` with reason, no status change.

**Validates: Requirements 7.7**

### Property 5: Tenant isolation
Every read/write is scoped by `companyId` from the session; a token or member from another tenant never resolves.

**Validates: Requirements 4.4, 5.1, 7.4**

### Property 6: Window monotonicity
With `strictWindow=false`, any non-cancelled booking today is acceptable; with `strictWindow=true`, the accepted set ⊆ the loose set (strict never accepts what loose rejects).

**Validates: Requirements 5.3, 5.4, 10.4**

### Property 7: Walk-in resolves to a member
A successful walk-in always has a non-null `memberId` (a real `t_member` on the Free_Daily_Plan); only no-booking/unresolved rejects may have null member context.

**Validates: Requirements 6.2, 6.3, 8.2**

### Property 8: Settings authority
The Check-in page reads `scanStaffBooking`, `strictWindow`, `checkinWindowMin`, and `timezone` exclusively from `m_company` (or documented defaults), never from hard-coded constants.

**Validates: Requirements 10.2, 10.3**

### Property 9: Single company row
`m_company` has at most one live row per `companyId` (enforced by `@@unique`); save is an upsert.

**Validates: Requirements 1.1**

### Property 10: RBAC is server-enforced
No mutation succeeds without passing `requirePermission`; UI gating is cosmetic only.

**Validates: Requirements 2.2, 4.2, 5.7, 6.6**
