# PadelPro — Core Flows

**Updated:** 2026-06-22

---

## 1. Checkout Flow (Membership + Booking + Payment)

**File:** `src/lib/checkout-core.ts`

### Overview

Single transaction checkout:
1. Apply membership change (assign/extend/upgrade)
2. Create booking + details
3. Record payment
4. Update member quota

### Functions

#### runCheckout

```ts
runCheckout(db: PrismaClient, args: RunCheckoutArgs): Promise<CheckoutResult>
```

**Args:**
```ts
interface RunCheckoutArgs {
  companyId: string;
  actor: CheckoutActor; // { kind: "staff" | "member", userId: string }
  method: PayMethod; // "Cash" | "QRIS" | "Transfer"
  memberId: string;
  customerName: string;
  membership?: MembershipChangeInput; // { planId, action }
  bookings?: CheckoutBookingInput[]; // { courtId, start, end, partySize, basePrice }
  cashReceived?: number; // for Cash method
}
```

**Returns:**
```ts
interface CheckoutResult {
  success: boolean;
  error?: string;
  paymentRef?: string;
  membershipAmount?: number;
  courtAmount?: number;
  total?: number;
  change?: number;
  bookingId?: string;
  historyId?: string;
  paymentId?: string;
  fullyCoveredByQuota?: boolean;
}
```

**Flow:**
1. Validate method (member cannot use Cash)
2. Start transaction
3. If `membership` provided:
   - Validate plan exists
   - `applyMembershipAction()` — update t_member, write t_membership_history
4. If `bookings` provided:
   - `resolveMemberBenefit()` — check quota + discount
   - Validate no overlap with existing bookings
   - Create t_booking + t_booking_detail
   - Update member quota
5. Record payment via `recordPayment()`
6. Link payment to booking/history
7. Commit transaction

**Payment Method Rules:**
- Member self-service: QRIS, Transfer only
- Staff: Cash, QRIS, Transfer

---

#### applyMembershipAction

```ts
applyMembershipAction(tx: Tx, args: ApplyMembershipArgs): Promise<MembershipActionResult>
```

**Actions:**
- `assign` — new member gets plan
- `extend` — same plan, reset cycle
- `upgrade` — different plan, record previous

**Effects:**
- Update `t_member`: planId, tier, cycleStart, quotaUsed=0, coachingUsed=0, joinFeePaid
- Write `t_membership_history`

---

#### resolveMemberBenefit

```ts
resolveMemberBenefit(tx: Tx, companyId: string, memberId: string): Promise<ResolvedBenefit>
```

**Returns:**
```ts
interface ResolvedBenefit {
  plan: { includedCourtBookings: number; courtDiscountPct: number } | null;
  planName: string | null;
  quotaRemaining: number;
  joinFeeDue: number;
  resetPeriodDays: number;
}
```

**Cycle Rollover:**
- If `resetPeriodDays > 0` and elapsed >= period, quota resets to 0

---

#### recordPayment

```ts
recordPayment(tx: Tx, args: RecordPaymentArgs): Promise<{ id: string; paymentRef: string; change: number }>
```

**Generated:**
- `paymentRef`: PAY-YYYY-XXXXX (random 5 chars)
- `cashChange` if Cash method

---

## 2. Check-in Flow

**File:** `src/lib/checkin-core.ts`

### Overview

Validate booking + record check-in event.

### Functions

#### signBookingToken

```ts
signBookingToken(companyId: string, bookingId: string, expMs: number): string
```

Generate signed QR token for member to show.

**Format:** `base64url(payload).signature`

**Payload:**
```ts
{ c: companyId, b: bookingId, exp: epochMs }
```

**Signature:** HMAC-SHA256 with `CHECKIN_TOKEN_SECRET`

---

#### verifyBookingToken

```ts
verifyBookingToken(token: string): VerifiedToken
```

**Returns:**
```ts
type VerifiedToken =
  | { ok: true; companyId: string; bookingId: string; expMs: number }
  | { ok: false; reason: string }
```

Uses constant-time comparison for signature.

---

#### performCheckin

```ts
performCheckin(db: PrismaClient, args: PerformCheckinArgs): Promise<CheckinResult>
```

**Args:**
```ts
interface PerformCheckinArgs {
  companyId: string;
  memberId?: string;
  memberName: string;
  bookingId?: string;
  courtName?: string;
  method: CheckinMethod; // "manual" | "qr" | "walkin"
  settings: CompanyCheckinSettings;
}
```

**Validation:**
1. If booking provided:
   - Booking exists and status = confirmed
   - Member matches (if member booking)
   - Time window check (strict vs loose)
   - Court not in maintenance
2. If walk-in: no booking validation

**Effects:**
- Update `t_booking_detail.status` → `checked_in`
- Write `t_checkin` log

---

#### staffQrText

```ts
staffQrText(companyId: string): string
```

Static QR printed at front desk.

**Format:** `PADELHUB-CHECKIN-{companyId}`

---

### Check-in Settings

From `m_company`:
- `scanStaffBooking`: true = staff scans member QR, false = member scans staff QR
- `strictWindow`: require check-in within `checkinWindowMin` of booking start
- `checkinWindowMin`: ±minutes tolerance

---

## 3. Auth Flow

**File:** `src/lib/auth.ts`

### authenticateCustom

```ts
authenticateCustom(userId: string, password: string, companyId?: string): Promise<AuthSession | null>
```

**Flow:**
1. Resolve tenant config from `m_tenant` (master DB)
2. Query `m_user` in tenant DB (internal staff)
3. If not found, query `t_member` (member portal)
4. bcrypt verify password
5. Update `lastLogin`
6. Return session

**Session:**
```ts
interface AuthSession {
  companyId: string;
  userId: string;
  role: UserRole;
  level: number;
  name: string;
  avatar: string;
}
```

---

## 4. Tenant DB Resolver

**File:** `src/lib/tenant-db.ts`

### getTenantDb

```ts
getTenantDb(cfg?: TenantDbConfig): Promise<PrismaClient>
```

**Features:**
- LRU cache (default max 10 clients)
- Connection pooling params: `connection_limit=2`, `pool_timeout=20`, `connect_timeout=10`
- Auto-evict least-recently-used when cache full

**Env overrides:**
- `PRISMA_TENANT_CLIENT_CACHE_MAX`
- `PRISMA_TENANT_CONNECTION_LIMIT`
- `PRISMA_TENANT_POOL_TIMEOUT`
- `PRISMA_TENANT_CONNECT_TIMEOUT`

---

## 5. Access Guard

**File:** `src/lib/access-guard.ts`

### requirePermission

```ts
requirePermission(resource: string, action: string): Promise<GuardResult>
```

**Flow:**
1. Get session from cookie
2. If no session → `{ ok: false, error: "Unauthorized" }`
3. If role = superadmin → `{ ok: true, session }`
4. Check `m_role_permission` in master DB
5. Return result

**Permission Format:** `resource.action`
- `booking.create`
- `members.view`
- `courts.manage`

---

## 6. Audit Helper

**File:** `src/lib/audit.ts`

### Functions

```ts
auditCreate(userId: string): { createdAt: Date, createdBy: string, updatedAt: Date, updatedBy: string }

auditUpdate(userId: string): { updatedAt: Date, updatedBy: string }

auditSoftDelete(userId: string): { deletedAt: Date, deletedBy: string, isDeleted: 1 }

NOT_DELETED = { isDeleted: 0 }
```

**Usage:**
```ts
db.t_booking.create({
  data: {
    ...fields,
    ...auditCreate(session.userId),
  },
});
```

---

## 7. Key Patterns

### Transaction Pattern

```ts
await db.$transaction(async (tx) => {
  // Step 1: membership
  await applyMembershipAction(tx, args);
  
  // Step 2: booking
  await tx.t_booking.create({ ... });
  
  // Step 3: payment
  await recordPayment(tx, args);
});
```

### Guard Pattern

```ts
const guard = await requirePermission("resource.action", "action");
if (!guard.ok) return { success: false, error: guard.error };
const session = guard.session;
```

### Revalidation Pattern

```ts
import { revalidatePath } from "next/cache";

revalidatePath("/bookings");
revalidatePath(`/members/${memberId}`);
```
