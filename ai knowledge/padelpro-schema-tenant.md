# PadelPro — Tenant Schema

**File:** `prisma/tenant.prisma`  
**DB:** PostgreSQL per-tenant  
**Updated:** 2026-06-22

---

## Table Naming Convention

| Prefix | Type | Reset | Examples |
|--------|------|-------|----------|
| `m_` | Master/Config | Survives | m_user, m_court, m_company |
| `t_` | Transactional | Wiped | t_booking, t_member, t_checkin |

---

## Master Tables (m_*)

### m_user — Internal Login Subject

Internal users: owner, staff, coach, superadmin.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| companyId | VARCHAR(50) | FK ke master m_tenant |
| userId | VARCHAR(100) | Login username (lowercase) |
| passwordHash | TEXT | bcrypt |
| roleKey | VARCHAR(50) | superadmin/owner/staff/coach |
| namalengkap | VARCHAR(255) | Display name |
| email | VARCHAR(150) | |
| phone | VARCHAR(30) | |
| photo | VARCHAR(255) | Path |
| isActive | BOOLEAN | |
| lastLogin | TIMESTAMP | |

**Audit:** createdAt, createdBy, updatedAt, updatedBy, deletedAt, deletedBy, isDeleted

**Indexes:** userId, roleKey, isDeleted

**Unique:** (companyId, userId)

---

### m_company — Club Profile

One row per tenant. Operational settings for check-in.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| companyId | VARCHAR(50) | Unique |
| name | VARCHAR(255) | Club name |
| address | TEXT | |
| logo | VARCHAR(255) | Path |
| phone | VARCHAR(30) | |
| email | VARCHAR(150) | |
| timezone | VARCHAR(64) | Default: Asia/Jakarta |
| scanStaffBooking | BOOLEAN | true=staff scan member QR, false=member scan club QR |
| strictWindow | BOOLEAN | Check-in must be within window |
| checkinWindowMin | INT | ±minutes tolerance |

---

### m_operating_hours — Jam Buka

7 rows per tenant (day 0-6).

| Column | Type | Notes |
|--------|------|-------|
| day | INT | 0=Sunday, 6=Saturday |
| open | BOOLEAN | |
| openStart | INT | Hour 0-23 |
| openEnd | INT | Hour 1-24 |

---

### m_time_group — Time-of-Day Buckets

Pagi, Siang, Sore, Malam.

| Column | Type | Notes |
|--------|------|-------|
| name | VARCHAR(60) | Label |
| startHour | INT | Inclusive 0-23 |
| endHour | INT | Exclusive 1-24 |
| color | VARCHAR(20) | |
| sortOrder | INT | |

---

### m_court — Lapangan

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| companyId | VARCHAR(50) | |
| name | VARCHAR(100) | |
| environment | VARCHAR(20) | indoor/outdoor |
| wall | VARCHAR(20) | glass/mesh |
| format | VARCHAR(20) | single/double |
| status | VARCHAR(20) | active/maintenance/inactive |
| priceOffPeak | INT | IDR/hour |
| pricePeak | INT | IDR/hour |
| schedule | JSON | DaySchedule[] - 7 days, 48 slots each |
| color | VARCHAR(20) | |
| note | TEXT | |
| image | VARCHAR(255) | |

**Relations:**
- t_booking_detail[]
- t_court_maintenance[]

---

### m_membership_plan — Plan Benefits

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | |
| color | VARCHAR(20) | |
| joinFee | INT | One-time IDR |
| includedCourtBookings | INT | Free per cycle |
| resetPeriodDays | INT | Cycle length (0=never) |
| freeCoaching | INT | Sessions per cycle |
| courtDiscountPct | INT | % after quota |
| perks | JSON | Bullet points |
| active | BOOLEAN | |
| highlighted | BOOLEAN | |
| sortOrder | INT | |

**Relations:**
- t_member[]
- t_membership_history[]

---

### m_coach — Coach Profile

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(255) | |
| level | VARCHAR(40) | Head Coach/Senior/Pro/Assistant |
| status | VARCHAR(20) | active/on_leave/inactive |
| phone | VARCHAR(30) | |
| email | VARCHAR(150) | |
| avatar | VARCHAR(255) | |
| color | VARCHAR(20) | |
| ratePerHour | INT | IDR |
| specialties | JSON | string[] |
| bio | TEXT | |
| availability | JSON | CoachAvailability[] - 7 days |

**Relations:**
- t_coaching_session[]

---

### m_coach_package — Coaching Bundle

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| name | VARCHAR(100) | |
| sessions | INT | Number of meetings |
| durationMin | INT | Per session |
| price | INT | Total IDR |
| color | VARCHAR(20) | |
| note | TEXT | |
| active | BOOLEAN | |
| sortOrder | INT | |

**Relations:**
- t_coaching_schedule[]

---

## Transactional Tables (t_*)

### t_member — Member CRM + Portal Login

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| companyId | VARCHAR(50) | |
| memberNo | VARCHAR(40) | PHB-2026-xxxx |
| username | VARCHAR(100) | Login (lowercase) |
| passwordHash | TEXT | bcrypt |
| name | VARCHAR(255) | |
| phone | VARCHAR(30) | |
| email | VARCHAR(150) | |
| tier | VARCHAR(20) | Legacy label |
| status | VARCHAR(20) | active/inactive/frozen |
| city | VARCHAR(100) | |
| avatar | VARCHAR(255) | |
| onboarded | BOOLEAN | |
| lastLogin | TIMESTAMP | |
| planId | UUID | FK m_membership_plan |
| cycleStart | TIMESTAMP | Quota cycle start |
| quotaUsed | INT | Bookings consumed |
| coachingUsed | INT | Coaching consumed |
| joinFeePaid | BOOLEAN | |

**Relations:**
- t_booking[]
- t_coaching_schedule[]
- t_checkin[]
- t_membership_history[]

---

### t_booking — Booking Header

One per checkout.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| companyId | VARCHAR(50) | |
| memberId | UUID | FK t_member (nullable for walk-in) |
| type | VARCHAR(20) | member/walk_in/coaching/event |
| status | VARCHAR(20) | confirmed/pending/checked_in/completed/cancelled |
| customer | VARCHAR(255) | Display label |
| paymentMethod | VARCHAR(20) | Cash/Card/QRIS/Wallet |
| totalPrice | INT | Sum of details |
| joinFee | INT | Membership join fee collected |
| quotaConsumed | INT | Quota slots used |
| paymentId | UUID | FK t_payment |
| note | TEXT | |

**Relations:**
- t_member?
- t_booking_detail[]
- t_checkin[]
- t_payment?

---

### t_booking_detail — Court Session Line

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| bookingId | UUID | FK t_booking |
| courtId | UUID | FK m_court |
| start | TIMESTAMP | |
| end | TIMESTAMP | |
| partySize | INT | |
| basePrice | INT | Before benefit |
| price | INT | After benefit |
| rateNote | VARCHAR(40) | regular/peak/free/discount |
| status | VARCHAR(20) | confirmed/cancelled/checked_in/completed |
| note | TEXT | |

---

### t_checkin — Check-in Event Log

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| memberId | UUID | FK t_member (nullable) |
| memberName | VARCHAR(255) | Denormalized |
| bookingId | UUID | FK t_booking (nullable) |
| courtName | VARCHAR(255) | Denormalized |
| method | VARCHAR(20) | manual/qr/walkin |
| result | VARCHAR(20) | success/rejected |
| reason | TEXT | If rejected |
| at | TIMESTAMP | |

---

### t_payment — Payment Record

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| paymentRef | VARCHAR(40) | PAY-2026-xxxxx |
| method | VARCHAR(20) | Cash/QRIS/Transfer |
| amount | INT | Total |
| membershipAmount | INT | |
| courtAmount | INT | |
| status | VARCHAR(20) | paid/pending/failed/cancelled/refunded |
| paidByType | VARCHAR(20) | member/staff |
| cashReceived | INT | Cash only |
| cashChange | INT | Cash only |
| note | TEXT | |
| provider | VARCHAR(40) | Future gateway |
| externalId | VARCHAR(120) | Future gateway |
| paidAt | TIMESTAMP | |

**Relations:**
- t_booking[]
- t_membership_history[]

---

### t_coaching_schedule — Member+Package Enrollment

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| memberId | UUID | FK t_member |
| packageId | UUID | FK m_coach_package |
| packageName | VARCHAR(100) | Snapshot |
| totalSessions | INT | |
| price | INT | Snapshot |
| startDate | TIMESTAMP | First session |
| cycle | JSON | {days:[], time, durationMin, perWeek} |
| status | VARCHAR(20) | active/completed/cancelled |
| note | TEXT | |

**Relations:**
- t_coaching_session[]

---

### t_coaching_session — Single PT Session

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| scheduleId | UUID | FK t_coaching_schedule |
| coachId | UUID | FK m_coach (nullable) |
| sequence | INT | 1-based |
| start | TIMESTAMP | |
| end | TIMESTAMP | |
| status | VARCHAR(20) | scheduled/completed/cancelled/no_coach |
| note | TEXT | |

---

### t_court_maintenance — Maintenance Window

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| courtId | UUID | FK m_court |
| start | TIMESTAMP | Inclusive |
| end | TIMESTAMP | Exclusive |
| reason | VARCHAR(255) | Display text |
| kind | VARCHAR(20) | maintenance/holiday/private_event/other |

---

### t_membership_history — Membership Action Audit

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| memberId | UUID | FK t_member |
| planId | UUID | FK m_membership_plan |
| planName | VARCHAR(100) | Snapshot |
| action | VARCHAR(20) | assign/extend/upgrade |
| previousPlanId | UUID | On upgrade |
| previousPlanName | VARCHAR(100) | |
| joinFee | INT | Charged |
| method | VARCHAR(20) | Cash/QRIS/Transfer |
| paymentId | UUID | FK t_payment |
| actorType | VARCHAR(20) | staff/member |
| cycleStart | TIMESTAMP | Applied |
| note | TEXT | |

---

## Audit Pattern

All tables have:
- `createdAt` TIMESTAMP
- `createdBy` VARCHAR(100)
- `updatedAt` TIMESTAMP
- `updatedBy` VARCHAR(100)
- `deletedAt` TIMESTAMP (nullable)
- `deletedBy` VARCHAR(100) (nullable)
- `isDeleted` INT (0=live, 1=soft-deleted)

Never hard-delete. Set `isDeleted=1`.
