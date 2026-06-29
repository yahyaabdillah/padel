# PadelPro — Component & Context Map

**Updated:** 2026-06-22

---

## Components Structure

**162 TSX files** di `src/components/`

### Domain Components

| Folder | Purpose | Key Files |
|--------|---------|-----------|
| `booking/` | Booking creation flow | NewBookingStepper.tsx, BookingPayment.tsx, NewBookingSearch.tsx, QuickAddMemberModal.tsx |
| `checkin/` | QR check-in | CameraScanner.tsx, RealQrCode.tsx |
| `coaching/` | Coach schedule | CoachScheduleManager.tsx |
| `club-core/` | Core club logic | register/, MemberRegister.tsx |
| `club-engage/` | Marketing/engagement | PromoReferralInput.tsx |
| `classes/` | Class/clinic management | ClassEnrollDrawer.tsx, ClassFormDrawer.tsx |
| `marketing/` | Promo builder | PromoBuilderDrawer.tsx |
| `pos/` | Pro shop POS | ProductFormDrawer.tsx |
| `auth/` | Auth components | |
| `calendar/` | Calendar views | |
| `charts/` | Dashboard charts | |
| `common/` | Shared UI | ThemeToggleButton, etc. |
| `ecommerce/` | E-commerce patterns | |
| `form/` | Form building | |
| `header/` | Header components | NotificationDropdown |
| `member/` | Member portal | |
| `platform/` | Platform admin | |
| `shared/` | Shared utilities | |
| `tables/` | Table components | |
| `user-profile/` | Profile components | |
| `videos/` | Video components | |

### UI Components (`ui/`)

35 komponen di `src/components/ui/`:

accordion, alert, avatar, badge, breadcrumb, button, card, carousel, chart, cropper, datepicker, drawer, dropdown, dropzone, feedback, images, input, modal, notification, pagination, progress, rating, section, select, sidebar, slider, stepper, switch, table, tabs, timeline, toast, tooltip, video

---

## Context Providers

**10 contexts** di `src/context/`:

| File | Purpose |
|------|---------|
| `RoleContext.tsx` | Role management, permissions catalog, default role→permission map, mock login users |
| `AccessContext.tsx` | Menu access, branding, resolved from RoleContext |
| `ThemeContext.tsx` | Dark/light theme toggle |
| `SidebarContext.tsx` | Sidebar expand/collapse state |
| `MembershipContext.tsx` | Membership state for member portal |
| `OperatingHoursContext.tsx` | Club operating hours |
| `PromoContext.tsx` | Promo/referral state |
| `NotificationContext.tsx` | Notification state |
| `OnboardingContext.tsx` | Onboarding wizard state |
| `FormBuilderContext.tsx` | Form builder state |

### RoleContext Key Exports

```ts
type UserRole = "superadmin" | "owner" | "staff" | "coach" | "member";

const ALL_ROLES: UserRole[];
const roleLabels: Record<UserRole, string>;
const roleScope: Record<UserRole, "platform" | "club" | "member">;

interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

const permissionCatalog: PermissionDef[]; // 35+ permissions
const allPermissionKeys: string[];
```

### AccessContext Key Exports

```ts
const { menus, branding } = useAccess();

// menus: resolved from m_role_menu based on current role
// branding: { name, logo } from m_company
```

---

## Layout Structure

**3 files** di `src/layout/`:

| File | Purpose |
|------|---------|
| `AppHeader.tsx` | Top header with role switcher, notifications, theme toggle |
| `AppSidebar.tsx` | Sidebar with menu tree from AccessContext |
| `Backdrop.tsx` | Mobile sidebar backdrop |

### AppHeader Features

- Role switcher dropdown (mock login for demo)
- Notification bell with dropdown
- Theme toggle button
- User avatar + name display
- Role badge with color coding:
  - superadmin: brand (indigo)
  - owner: teal
  - staff: amber
  - coach: rose
  - member: accent (lime)

### AppSidebar Features

- Menu tree built from `menus` (filtered by `canView`)
- Grouped by groupKey: main → master → others
- Hierarchical via `parentKey`
- Icons resolved from lucide-react by name
- Collapsible on hover
- Club branding (logo + name)

---

## Hooks

**2 hooks** di `src/hooks/`:

| File | Purpose |
|------|---------|
| `useGoBack.ts` | Navigate back helper |
| `useModal.ts` | Modal state helper |

---

## Booking Flow (End-to-End)

### 1. UI Entry

**Page:** `src/app/(admin)/bookings/new/page.tsx`

**Component:** `NewBookingStepper.tsx`

Steps:
1. Select court (from `m_court`)
2. Select date + time slot
3. Search/select member (from `t_member`)
4. Confirm booking details
5. Payment

### 2. Server Action

**File:** `src/app/(admin)/bookings/actions.ts`

```ts
createBookingsAction(input: CreateBookingInput, opts?): Promise<CreateBookingsResult>
```

Flow:
1. `requirePermission("booking.new", "create")` — guard
2. `getTenantDb()` — resolve tenant DB
3. Calculate `totalPrice` from details
4. `db.t_booking.create()` with nested `details`
5. `revalidatePath("/bookings")`

### 3. DB Write

**Tables:**
- `t_booking` — header (companyId, memberId, type, status, totalPrice, etc.)
- `t_booking_detail` — lines (courtId, start, end, price, etc.)

### 4. Post-Create

- Revalidate cache
- Redirect to booking list or payment

---

## Member Registration Flow

### 1. UI Entry

**Page:** `src/app/(admin)/members/register/page.tsx`

**Component:** `MemberRegister.tsx`

Fields: name, username, phone, email, city, planId, bookings

### 2. Server Action

**File:** `src/app/(admin)/members/actions.ts`

```ts
registerMemberAction(input: RegisterMemberInput): Promise<RegisterMemberResult>
```

Flow:
1. Generate `memberNo` (PHB-2026-xxxx)
2. Generate `tempPassword` (10 chars)
3. Hash password with bcrypt
4. `db.t_member.create()`
5. If `planId` + `collectJoinFee`: call `applyMembershipAction()`
6. If `bookings`: call `createBookingsAction()`
7. Return `{ success, id, memberNo, username, tempPassword }`

---

## Check-in Flow

### 1. UI Entry

**Page:** `src/app/(admin)/checkin/page.tsx`

**Components:**
- `CameraScanner.tsx` — QR scanner
- Manual input form

### 2. Server Action

**File:** `src/app/(admin)/checkin/actions.ts`

```ts
checkinByQrAction(qrData: string): Promise<CheckinResult>
```

Validation:
- Parse QR → booking ID
- Query `t_booking` + `t_booking_detail`
- Check status = confirmed
- Check time window (strict/loose)
- Check court not in maintenance

On success:
- Update `t_booking_detail.status` → `checked_in`
- Write `t_checkin` log

---

## Key Conventions

### Audit Pattern

All creates/updates use:

```ts
import { auditCreate, auditUpdate, auditSoftDelete, NOT_DELETED } from "@/lib/audit";

db.t_booking.create({
  data: {
    ...fields,
    ...auditCreate(session.userId),
  },
});
```

### Permission Guard

All server actions start with:

```ts
const guard = await requirePermission("resource.action", "action");
if (!guard.ok) return { success: false, error: guard.error };
const session = guard.session;
```

### Tenant DB Access

```ts
import { getTenantDb } from "@/lib/tenant-db";

const db = await getTenantDb();
```

### Revalidation

After writes:

```ts
import { revalidatePath } from "next/cache";

revalidatePath("/bookings");
```
