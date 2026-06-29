# PadelPro — Route Map

**Updated:** 2026-06-22

---

## App Structure

```
src/app/
├── (admin)/           # Main admin app (layout + auth guard)
│   ├── layout.tsx     # Shell: sidebar + header + access guard
│   ├── page.tsx       # RoleHome: redirect by role
│   ├── access/        # RBAC management
│   ├── bookings/      # Booking management
│   ├── checkin/       # Check-in scanner
│   ├── coaching/      # Coaching/PT
│   ├── courts/        # Court config
│   ├── finance/       # Finance reports
│   ├── maintenance/   # Maintenance schedule
│   ├── marketing/     # Promos/referrals
│   ├── matches/       # Open play/matches
│   ├── me/            # Member portal
│   ├── members/       # Member management
│   ├── platform/      # Platform admin (superadmin)
│   ├── pos/           # Pro shop POS
│   ├── settings/      # Club settings
│   ├── ui-kit/        # UI component demo
│   ├── (others-pages)/ # Charts, tables, forms demo
│   └── (ui-elements)/  # UI elements demo
├── (full-width-pages)/
├── favicon.ico
├── globals.css
├── layout.tsx         # Root layout
└── not-found.tsx
```

**80 pages** total.

---

## Route Table

### Core Business Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/` | RoleHome | Redirect by role (superadmin→/platform, member→/me, else ClubDashboard) |
| `/bookings` | BookingsClient | Booking list + calendar view |
| `/bookings/new` | NewBookingStepper | Create booking wizard |
| `/bookings/courts` | Court management | Court config + pricing |
| `/bookings/slots` | Slot management | Time slot templates |
| `/bookings/payment` | Payment list | Payment history |
| `/bookings/search` | Booking search | Advanced search |
| `/checkin` | CheckinPage | QR scanner + manual check-in |
| `/members` | MembersClient | Member list |
| `/members/register` | MemberRegister | Register new member |
| `/members/membership` | Membership management | Plans + history |
| `/coaching` | CoachingPage | Coaching dashboard |
| `/coaching/coaches` | Coach management | Coach profiles |
| `/coaching/packages` | Coaching packages | PT packages |
| `/coaching/classes` | Class management | Group classes |
| `/coaching/pt` | PT sessions | Personal training |
| `/coaching/pt/book` | Book PT | Book PT session |
| `/coaching/schedule` | Coach schedule | Schedule calendar |
| `/courts` | CourtsPage | Court list |
| `/maintenance` | MaintenancePage | Maintenance schedule |
| `/finance` | FinancePage | Finance dashboard |
| `/pos` | PosPage | Pro shop POS |
| `/marketing` | MarketingPage | Promos + campaigns |
| `/matches` | MatchesPage | Open play + matches |
| `/settings` | SettingsPage | Club settings |

### Access Management Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/access/roles` | RolesPage | Role definitions |
| `/access/menus` | MenusPage | Menu builder |
| `/access/staff` | StaffPage | Staff management |
| `/access/users` | UsersPage | User accounts |

### Member Portal Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/me` | MePage | Member self-service portal |

### Platform Admin Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/platform` | PlatformPage | Superadmin dashboard |

### UI Demo Routes

| Route | Page | Purpose |
|-------|------|---------|
| `/ui-kit` | UiKitPage | Component showcase |
| `/alerts` | AlertsPage | Alert components |
| `/avatars` | AvatarsPage | Avatar components |
| `/badge` | BadgePage | Badge components |
| `/buttons` | ButtonsPage | Button components |
| `/images` | ImagesPage | Image components |
| `/modals` | ModalsPage | Modal components |
| `/videos` | VideosPage | Video components |
| `/calendar` | CalendarPage | Calendar demo |
| `/profile` | ProfilePage | Profile page demo |
| `/blank` | BlankPage | Blank starter page |
| `/bar-chart` | BarChartPage | Bar chart demo |
| `/line-chart` | LineChartPage | Line chart demo |
| `/form-elements` | FormElementsPage | Form demo |
| `/basic-tables` | BasicTablesPage | Table demo |

---

## Layout Guards

### AdminLayout (`(admin)/layout.tsx`)

```tsx
// Session check
if (!isSessionReady) return <LoadingSkeleton />;
if (!isAuthenticated) router.replace(`/signin?redirect=${pathname}`);

// Access check
const isAccessDenied = accessReady && !canViewPath(pathname);
if (isAccessDenied) return <AccessDenied />;
```

### RoleHome (`page.tsx`)

```tsx
// Role-based redirect
if (currentRole === "superadmin") router.replace("/platform");
else if (currentRole === "member") router.replace("/me");
else return <ClubDashboard />; // owner/staff/coach stay
```

---

## Action Files

Server actions co-located with pages:

| Path | Actions |
|------|---------|
| `bookings/actions.ts` | createBookingsAction, cancelBookingAction, searchBookingsAction |
| `members/actions.ts` | registerMemberAction, updateMemberAction, applyMembershipAction |
| `coaching/actions.ts` | createCoachAction, createPackageAction, bookPtAction, createClassAction |
| `access/actions.ts` | createRoleAction, updateRoleAction, assignPermissionsAction, createStaffAction |
| `checkin/actions.ts` | checkinByQrAction, manualCheckinAction |
| `courts/actions.ts` | createCourtAction, updateCourtAction, updatePricingAction |

---

## Middleware

**File:** `src/middleware.ts`

Protected routes:
- `/(admin)/*` — requires session
- Redirects unauthenticated to `/signin`

---

## API Routes

None — all server actions via Next.js.

---

## Key Patterns

### Server Component → Client Component

```tsx
// page.tsx (server)
import MembersClient from "./MembersClient";
export default function MembersPage() {
  return <MembersClient />;
}

// MembersClient.tsx (client)
"use client";
export default function MembersClient() {
  // interactive UI
}
```

### Action Import

```tsx
import { createBookingsAction } from "./actions";
```

### Data Fetching

Server components fetch directly:

```tsx
const db = await getTenantDb();
const bookings = await db.t_booking.findMany({ ... });
```

Client components use SWR or call server actions.
