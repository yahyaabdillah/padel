# Implementation Plan

## Overview

Implementation is sequenced so the data layer and shared helper land first, then each menu is built on top. Company Settings comes before Check-in because the check-in behavior reads its settings. QR generation/scanning is added after the manual/walk-in flows work, then the member portal is rewired, and finally branding + mock cleanup.

## Task Dependency Graph

```
1 (schema) ──┬─> 4 (checkin-core) ──┬─> 7 (checkin actions) ──> 8 (checkin page)
             │                      │            │
2 (deps) ────┤                      │            └─> 11 (staff QR scan) ──> 13 (member page)
             │                      │                         ▲
3 (menu) ────┘                      └─> 12 (member actions) ──┘
             │
             └─> 5 (company actions) ──> 6 (company page)

9 (RealQrCode)  ──> 11, 13
10 (CameraScanner) ──> 11, 13
14 (branding) depends on 5
15 (cleanup/verify) depends on ALL
```

Critical path: 1 → 4 → 7 → 8 → 11 → 13 → 15.

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3", "9", "10"] },
    { "wave": 2, "tasks": ["4", "5"] },
    { "wave": 3, "tasks": ["6", "7", "12"] },
    { "wave": 4, "tasks": ["8", "11", "14"] },
    { "wave": 5, "tasks": ["13"] },
    { "wave": 6, "tasks": ["15"] }
  ]
}
```

## Tasks

- [x] 1. Add Prisma models and migrate
  - Add `m_company` (master table, one row per `companyId`) and `t_checkin` (transactional) to `prisma/tenant.prisma` per design, including audit/soft-delete columns and back-relations (`t_member.checkins`, `t_booking.checkins`).
  - Stop node (`Stop-Process -Name node -Force`), run `npx prisma db push`, regenerate the tenant client.
  - Extend `prisma/reset-transactional.ts` to truncate `t_checkin`.
  - _Requirements: 1.1, 1.5, 8.1, 8.2, 8.6_

- [x] 2. Install QR dependencies
  - Add `qrcode` (+ `@types/qrcode`) and `html5-qrcode` to `package.json`; install.
  - Add `CHECKIN_TOKEN_SECRET` to `.env` / `.env.example` (fallback documented).
  - _Requirements: 7.1, 7.3_

- [x] 3. Register menu entries
  - Add `checkin` (path `/checkin`, icon `QrCode`, group `main`, grants owner+staff full, coach view) and `settings.company` (path `/settings/company`, icon `Building2`, parent `master`, grants superadmin) to `MENU_CATALOG` in `src/data/padel/menu-catalog.ts`.
  - Reseed: `npm run db:seed`. Verify both appear in `m_menu` + grants in `m_role_menu`.
  - _Requirements: 4.1, 4.5_

- [x] 4. Build shared check-in core helper `src/lib/checkin-core.ts`
  - [x] 4.1 Token sign/verify: `signBookingToken(companyId, bookingId, expMs)` and `verifyBookingToken(token)` using HMAC-SHA256 (`crypto`); reject bad signature, wrong tenant, or `now > expMs`.
    - _Requirements: 7.1, 7.2, 7.7_
  - [x] 4.2 `findNearestBookingToday(db, companyId, memberId, now, timezone)` — non-cancelled `t_booking` for today, nearest by earliest line start.
    - _Requirements: 5.2, 5.3, 7.4_
  - [x] 4.3 `evaluateWindow(match, now, settings)` — loose vs strict (`checkinWindowMin`) returning `{ ok, reason? }`; strict accepts ⊆ loose.
    - _Requirements: 5.3, 5.4, 10.4_
  - [x] 4.4 `recordCheckin(db, args)` — single transactional writer: insert `t_checkin`; on success flip `t_booking` header + all non-cancelled lines to `checked_in`; guard against duplicate success on an already-checked-in booking.
    - _Requirements: 5.5, 5.6, 5.8, 8.1, 8.2_

- [x] 5. Company Settings server actions `src/app/(admin)/settings/company/actions.ts`
  - [x] 5.1 `getCompanyAction()` — load `m_company` for tenant or return safe defaults (name from tenant registry, `Asia/Jakarta`, scanStaffBooking=false, strictWindow=false, window=15).
    - _Requirements: 1.3, 1.4, 10.3_
  - [x] 5.2 `saveCompanyAction(input)` — `requirePermission("settings.company","update")`; validate non-empty name; upsert by `companyId`; stamp `updatedBy/At`.
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.5, 3.2_
  - [x] 5.3 `uploadLogoAction(dataUrl)` — mirror `uploadCourtImageAction`; validate mime/size; write to `public/images/logo`; return `/images/logo/xxx.png`.
    - _Requirements: 2.3_

- [x] 6. Company Settings page + client
  - [x] 6.1 `page.tsx` server component with `canViewMenu("settings.company")` guard → `<AccessDenied/>`.
    - _Requirements: 4.2, 4.4_
  - [x] 6.2 `CompanySettingsClient.tsx` — form: name (TextInput), address (textarea), phone (`PhoneInput`), email, timezone (searchable `Select`), logo (Dropzone + `ImageCropperModal` at aspect 1:1), scanStaffBooking (`Switch`), strictWindow (`Switch`), checkinWindowMin (numeric). Save → toast, no full reload.
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2_

- [x] 7. Check-in data + manual/walk-in actions `src/app/(admin)/checkin/actions.ts`
  - [x] 7.1 `getCheckinPageDataAction()` — company settings, today's `t_checkin` log, success/reject counts, active courts. View-gated.
    - _Requirements: 8.3, 8.4, 10.2_
  - [x] 7.2 `searchMembersAction(q)` and `getMemberBookingsTodayAction(memberId)`.
    - _Requirements: 5.1, 5.2_
  - [x] 7.3 `manualCheckinAction(memberId)` — `requirePermission("checkin","create")`; resolve nearest booking via core; validate; `recordCheckin` (method `manual`); already-checked-in message.
    - _Requirements: 5.5, 5.6, 5.7, 5.8_
  - [x] 7.4 `walkinCheckinAction(input)` — `requirePermission("checkin","create")`; ensure Free_Daily_Plan exists (create if missing); register member via shared registration helper; `recordCheckin` (method `walkin`, no booking).
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 8. Check-in page + client (staff)
  - [x] 8.1 `page.tsx` server component with `canViewMenu("checkin")` guard.
    - _Requirements: 4.2, 4.3_
  - [x] 8.2 `CheckinClient.tsx` — stat strip, manual panel (member search), walk-in form (name + `PhoneInput` + optional court), today's log; live update after each action. Manual + walk-in are always rendered regardless of Scan_Mode (only the QR area switches).
    - _Requirements: 5.1, 6.1, 8.3, 8.4, 8.5, 3.5_

- [x] 9. `RealQrCode` component `src/components/checkin/RealQrCode.tsx`
  - Client component wrapping `qrcode` to render a scannable QR to canvas/data-URL. Used for member Booking_Token QR and static Staff QR.
  - _Requirements: 7.1, 7.3_

- [x] 10. `CameraScanner` component `src/components/checkin/CameraScanner.tsx`
  - Client wrapper over `html5-qrcode`; props `onDecode(text)`, `onError`; start/stop on mount/unmount; visible message on camera-permission failure.
  - _Requirements: 7.6_

- [x] 11. Staff QR scan action + wiring
  - `qrStaffScanAction(token)` in checkin actions — verify token, validate, `recordCheckin` (method `qr`).
  - In `CheckinClient`: when `scanStaffBooking=true` show `CameraScanner` and call `qrStaffScanAction` on decode; when `false` show static `RealQrCode`. Mode is read at page load (no redeploy needed to switch).
  - _Requirements: 3.3, 3.4, 3.6, 7.1, 7.2, 7.5, 7.7_

- [x] 12. Member self check-in actions
  - `getMyCheckinViewAction()` — returns `scanStaffBooking`; if true, member's nearest booking today + signed Booking_Token; if false, the static Staff QR text. Returns "no booking today" state.
  - `mySelfCheckinAction(staffQrText)` — assert tenant match, validate nearest booking, `recordCheckin` (method `qr`).
  - _Requirements: 7.3, 7.4, 7.5, 7.8_

- [x] 13. Rewire `src/app/(admin)/me/checkin/page.tsx`
  - Replace mock with real data. When `scanStaffBooking=true` render `RealQrCode` of the Booking_Token (or "no booking" state). When `false` render a "Scan" button → `CameraScanner` → `mySelfCheckinAction`; show result.
  - _Requirements: 3.3, 3.4, 7.1, 7.3, 7.8_

- [x] 14. Surface company branding
  - Read `m_company` name/logo for the sidebar/header branding area (best-effort; fall back to current default when unset).
  - _Requirements: 10.1_

- [x] 15. Remove mock check-in data and verify
  - Remove dependence on `mockBookings`/`mockMembers`/`mockCourts`/`mockCheckins` from the check-in surfaces; delete now-unused mock module(s) / faux `StaticQrCode` if no references remain.
  - Clear `.next/dev/types`, run `npx tsc --noEmit --pretty false`; fresh dev restart; manual smoke per acceptance criteria; verify persistence with a temp `diag.ts` then delete it.
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

## Notes

- All mutation actions MUST call `requirePermission(...)`; all gated pages MUST call `canViewMenu(...)`. UI gating is cosmetic only.
- Prisma engine DLL is locked by the dev server: always `Stop-Process -Name node -Force` before `prisma db push` / `generate`.
- Clear `.next/dev/types` before typecheck to avoid phantom errors; do a true fresh dev restart after deleting `.next`.
- No webhook or `/api` route is introduced — QR decode happens client-side and posts to server actions (see design "QR scan handling").
- Tests are NOT added per project convention; verification is typecheck + build + manual smoke + temp `diag.ts` DB inspection.
- Member portal check-in route already exists (`src/app/(admin)/me/checkin/page.tsx`) and is rewired in place.
