# PadelPro — Server Actions Reference

**Updated:** 2026-06-22

---

## Pattern

All actions:
- `"use server"` directive
- `requirePermission()` guard (except member self-service)
- `getTenantDb()` untuk akses DB
- `revalidatePath()` setelah write
- Audit stamps via `auditCreate()`, `auditUpdate()`, `auditSoftDelete()`

---

## Bookings

**File:** `src/app/(admin)/bookings/actions.ts`

### createBookingsAction

Input:
```ts
{
  memberId?: string | null;
  type: "member" | "walk_in" | "coaching" | "event";
  status: "confirmed" | "pending" | "checked_in" | "completed" | "cancelled";
  customer: string;
  paymentMethod?: string;
  note?: string;
  details: BookingDetailInput[];
}
```

BookingDetailInput:
```ts
{
  courtId: string;
  start: string; // ISO
  end: string; // ISO
  partySize: number;
  basePrice: number;
  price: number;
  rateNote?: string;
  note?: string;
}
```

Returns: `{ success, error?, id? }`

Permission: `booking.new` (create)

---

## Members

**File:** `src/app/(admin)/members/actions.ts`

### registerMemberAction

Register member baru + optional membership + optional bookings.

Input:
```ts
{
  name: string;
  username: string;
  phone: string;
  email?: string;
  city?: string;
  planId?: string | null;
  collectJoinFee?: boolean;
  bookings?: BookingDraftInput[];
}
```

Returns: `{ success, error?, id?, memberNo?, username?, tempPassword? }`

- Generate `memberNo`: PHB-2026-xxxx
- Generate `tempPassword`: 10 chars (no ambiguous)
- Hash password dengan bcrypt

Permission: `members.register` (create)

### listMembersAction

List members dengan filter.

### getMemberDetailAction

Get member by ID + plan info.

### updateMemberAction

Update member profile.

### assignMembershipAction

Assign/extend/upgrade membership plan. Uses `applyMembershipAction()` from checkout-core.

---

## Check-in

**File:** `src/app/(admin)/checkin/actions.ts`

### checkinByQrAction

Scan QR booking → validate → check-in.

Input: `{ qrData: string }`

Validation:
- Booking exists
- Status confirmed
- Member matches
- Time window OK
- Court not in maintenance

Returns: `{ success, error?, bookingId?, memberName?, courtName?, sessions? }`

### checkinManualAction

Manual check-in by member ID/phone.

---

## Coaching

**File:** `src/app/(admin)/coaching/actions.ts`

### createCoachAction

Create coach profile.

### createCoachPackageAction

Create coaching package.

### enrollMemberToPackageAction

Enroll member ke package → generate sessions.

---

## Courts

**File:** `src/app/(admin)/courts/actions.ts`

### createCourtAction

Create court + schedule.

### updateCourtAction

Update court + schedule.

### updateCourtScheduleAction

Update schedule JSON per court.

---

## Settings

### Company

**File:** `src/app/(admin)/settings/company/actions.ts`

### updateCompanyAction

Update club profile + check-in settings.

### Operating Hours

**File:** `src/app/(admin)/settings/hours/actions.ts`

### upsertOperatingHoursAction

Upsert 7 rows (day 0-6).

### Membership Plans

**File:** `src/app/(admin)/settings/plans/actions.ts`

### createMembershipPlanAction
### updateMembershipPlanAction

---

## Access Control

### Users

**File:** `src/app/(admin)/access/users/actions.ts`

### createInternalUserAction

Create m_user (staff/coach/owner).

### updateInternalUserAction

Update profile.

### resetPasswordAction

Reset password internal user.

### Roles

**File:** `src/app/(admin)/access/roles/actions.ts`

Role↔Permission mapping (master DB).

### Menus

**File:** `src/app/(admin)/access/menus/actions.ts`

Role↔Menu visibility matrix (master DB).

---

## Member Self-Service

### Book Court

**File:** `src/app/(admin)/me/book/actions.ts`

### createMemberBookingAction

Member books own court. Uses checkout-core.

Permission: Own-account only (check session.memberId).

### Membership

**File:** `src/app/(admin)/me/membership/actions.ts`

### getOwnMembershipStatusAction
### purchaseMembershipAction

Member purchase own membership (QRIS/Transfer only).

### Check-in

**File:** `src/app/(admin)/me/checkin/actions.ts`

### memberSelfCheckinAction

Member scan club QR.

---

## Checkout Core

**File:** `src/lib/checkout-core.ts`

Shared function untuk transaksi gabungan (membership + booking + payment).

### runCheckout

Single transaction:
1. Resolve member benefit
2. Apply membership change
3. Create booking + details
4. Create payment
5. Update member quota

Returns: `CheckoutResult`

---

## Access Guard

**File:** `src/lib/access-guard.ts`

### requirePermission

```ts
requirePermission(resource: string, action: string): Promise<{ ok: boolean; session?: AuthSession; error?: string }>
```

Validates:
- Session exists
- Role has permission via m_role_permission

Returns `{ ok: false, error }` if denied.

---

## Audit Helper

**File:** `src/lib/audit.ts`

```ts
auditCreate(userId: string)
auditUpdate(userId: string)
auditSoftDelete(userId: string)
NOT_DELETED = { isDeleted: 0 }
```

Returns objects untuk spread di Prisma create/update.
