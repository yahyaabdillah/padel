# Requirements Document

## Introduction

This feature delivers two related menus for PadelHub, a multi-tenant padel-club management app built on Next.js 16 (Turbopack), React 19, Prisma 6 and PostgreSQL. Unlike earlier mock modules, both menus are fully database-backed against the tenant database and governed by the existing DB-backed RBAC system (`m_menu` / `m_role_menu` / `m_user_menu`, enforced server-side via `requirePermission` and `canViewMenu`).

1. **Check-in** replaces the current mock-only check-in page (`src/app/(admin)/checkin/page.tsx`, which uses in-memory `mockBookings` / `mockMembers` / `mockCheckins`). The new page persists check-ins to the tenant database, flips the related booking line status to `checked_in`, and keeps a permanent audit log. It supports staff-driven manual check-in, walk-in quick check-in, and a QR check-in flow whose direction (staff-scans-member vs member-scans-staff) is controlled by Company Settings.

2. **Company Settings** is a new menu holding the club's company profile (name, address, logo, contact details) plus operational toggles — most importantly the **"Staff scan booking" toggle** that controls which side operates the camera and which side displays the QR during check-in. Company Settings values are read by the Check-in module and other surfaces (e.g. branding in the sidebar/header, receipts).

Both menus follow the established conventions: tenant-scoped `companyId`, audit columns (`createdAt/By`, `updatedAt/By`, `deletedAt/By`, `isDeleted`), soft delete, server actions guarded by `requirePermission`, and UI built from existing components (`PageScaffold`, `Card`, `Button`, `ModalDialog`, `Select`, `TextInput`, `Switch`, `Badge`, `useToast`) and design tokens.

## Glossary

- **PadelHub_System**: The overall multi-tenant application treated as the system under specification.
- **Tenant_Database**: The per-club PostgreSQL database holding business data (`t_*` transactional, `m_*` master tables), scoped by `companyId`.
- **Company_Profile**: The per-tenant record holding the club's identity and operational settings (name, address, logo, contact details, scan mode, strict-window toggle). Proposed model `m_company` (master table, one row per `companyId`).
- **Scan_Mode**: A Company_Profile boolean setting labelled "Staff scan booking" that governs which party operates the camera scanner and which party displays the QR during QR check-in:
  - **Enabled (true)** — the Member's check-in surface DISPLAYS a QR code encoding the member/booking identity, and the Staff Check-in page provides a camera scanner that reads the member's QR to perform the check-in.
  - **Disabled (false)** — the Staff Check-in page DISPLAYS a static QR code encoding the tenant, and the Member portal provides a "Scan" button that opens the device camera to read the staff's QR and self-check-in.
- **Member_QR_Payload**: The QR content shown by the member when Scan_Mode is enabled. It encodes a signed Booking_Token derived from the Booking_Header (the `t_booking` transaction), so staff scanning resolves the exact booking transaction to check in against — checking in ALL of that booking's court lines at once.
- **Booking_Token**: A tamper-resistant token (signed/HMAC) bound to a single Booking_Header and the active tenant, carrying an expiry equal to the LATEST end time among the booking's court lines. WHEN scanned after expiry, it is rejected. Each booking produces a distinct token.
- **Staff_QR_Payload**: The static QR content shown by staff when Scan_Mode is disabled, encoding the tenant (e.g. `PADELHUB-CHECKIN-{companyId}`). It is static and has no expiry; the member's scan confirms the correct club before self-check-in.
- **Camera_Scanner**: A device-camera QR reader embedded in the scanning party's surface (staff page when Scan_Mode enabled, member portal when Scan_Mode disabled), backed by a browser QR-decoding library (e.g. `html5-qrcode` or `@zxing/browser`).
- **Timezone**: A Company_Profile setting (IANA timezone string, selected from a dropdown) used to interpret "Today" and the current time when scoping the check-in log and evaluating the Checkin_Window.
- **Member_Checkin_Surface**: The member-portal check-in page (under `/me/*`) where a member either displays their Member_QR_Payload (Scan_Mode enabled) or operates a "Scan" button to read the Staff_QR_Payload (Scan_Mode disabled).
- **Checkin_Record**: A persisted check-in event. Proposed model `t_checkin` (transactional table, wiped on app reset) recording who checked in, against which Booking_Header (if any), the method, the result, the timestamp, and a rejection reason if applicable.
- **Checkin_Method**: How a Checkin_Record was created: `manual` (staff confirmed at the desk), `qr` (QR scan, either direction), or `walkin` (a quick-registered daily member checked in at the desk).
- **Checkin_Result**: The outcome of a check-in attempt: `success` or `rejected`.
- **Booking_Header**: A `t_booking` row — the booking transaction grouping one or more court session lines. Check-in operates at this level: checking in a Booking_Header sets ALL of its non-cancelled Booking_Lines to `checked_in`.
- **Booking_Line**: A `t_booking_detail` row — one court at one time window, with its own `status` (`confirmed | cancelled | checked_in | completed`).
- **Member**: A club member (`t_member`) — a customer who may hold a booking and may self-check-in.
- **Walk_In_Guest**: A guest checked in at the desk who has no prior booking. A walk-in is quick-registered as a `t_member` on a free (Rp0 join fee) daily Membership_Plan before the check-in is recorded, so every check-in resolves to a real member.
- **Free_Daily_Plan**: The daily Membership_Plan with a Rp0 join fee used for walk-in quick registration.
- **Checkin_Window**: A configurable tolerance (in minutes) around a booking's start time within which a check-in is considered "on time". Default ±15 minutes.
- **Strict_Window**: A Company_Profile toggle. WHEN enabled, a manual/QR check-in against a booking is only accepted if the booking starts within the Checkin_Window; WHEN disabled, any non-cancelled booking on the current day is acceptable.
- **Today**: The current calendar date in the club's local context, used to scope the day's check-in log and eligible bookings.
- **Staff_User**: An internal `m_user` (owner / staff / coach / superadmin) operating the admin surfaces, subject to RBAC.
- **RBAC_Guard**: The existing server-side permission system: `requirePermission(menuKey, action)` for mutations and `canViewMenu(menuKey)` for view access, resolving role grants (`m_role_menu`) merged with per-user overrides (`m_user_menu`); only `superadmin` bypasses.
- **Checkin_Menu**: The menu catalog entry for the Check-in page (proposed key `checkin`).
- **Company_Settings_Menu**: The menu catalog entry for the Company Settings page (proposed key `settings.company`).

## Requirements

### Requirement 1: Company Profile Storage and Retrieval

**User Story:** As a club owner, I want to store my club's company profile in the database, so that the club's identity and settings are consistent across every surface.

#### Acceptance Criteria

1. THE PadelHub_System SHALL persist exactly one Company_Profile per `companyId` in the Tenant_Database.
2. THE Company_Profile SHALL store: company name (non-empty string), address (string, optional), logo reference (string path, optional), contact phone (string, optional), contact email (string, optional), Timezone (IANA timezone string), Scan_Mode (boolean "Staff scan booking"), Strict_Window (boolean), and Checkin_Window in minutes (integer ≥ 0).
3. WHEN a Staff_User opens the Company_Settings_Menu page, THE PadelHub_System SHALL load and display the current Company_Profile for the active tenant.
4. IF no Company_Profile row exists for the active tenant, THEN THE PadelHub_System SHALL present default values (company name defaulted from the tenant registry, Timezone `Asia/Jakarta`, Scan_Mode disabled, Strict_Window disabled, Checkin_Window 15) without erroring.
5. THE Company_Profile SHALL include audit columns (`createdAt/By`, `updatedAt/By`, `deletedAt/By`, `isDeleted`) consistent with other tenant models.

### Requirement 2: Editing the Company Profile

**User Story:** As a club owner, I want to edit the company name, address, logo and contact details, so that the club's branding and information stay current.

#### Acceptance Criteria

1. WHEN a Staff_User with `update` permission on the Company_Settings_Menu saves the Company_Profile form, THE PadelHub_System SHALL persist the changed values to the Tenant_Database and stamp `updatedBy` / `updatedAt` with the acting user.
2. IF a Staff_User without `update` permission on the Company_Settings_Menu attempts to save the Company_Profile, THEN THE PadelHub_System SHALL reject the mutation via the RBAC_Guard and SHALL NOT persist any change.
3. WHEN a Staff_User uploads a logo image, THE PadelHub_System SHALL present it in a cropping modal so the image is adjusted to the required logo aspect ratio before upload, then store the cropped image under `public/images/logo` and persist its reference path in the Company_Profile.
4. THE Company_Settings_Menu page SHALL present the Timezone setting as a searchable dropdown of IANA timezones, and WHEN saved by a Staff_User with `update` permission, THE PadelHub_System SHALL persist the selected Timezone to the Company_Profile.
5. WHEN the Company_Profile is saved with an empty company name, THE PadelHub_System SHALL reject the save and display a validation message indicating the name is required.
6. WHEN the Company_Profile is saved successfully, THE PadelHub_System SHALL display a success toast and reflect the updated values without requiring a full page reload.
7. THE phone contact field on the Company_Profile form SHALL use the existing `PhoneInput` component, consistent with other forms in the app.
8. WHERE the UI library lacks a reusable image-cropping component, THE PadelHub_System SHALL reuse the cropping component introduced for court images rather than creating a redundant one.

### Requirement 3: Staff-Scan-Booking Toggle (QR Direction)

**User Story:** As a club owner, I want to choose whether staff scan the member's QR or members scan the club's QR, so that the check-in flow matches how my front desk operates.

#### Acceptance Criteria

1. THE Company_Settings_Menu page SHALL present the Scan_Mode setting as a single boolean toggle labelled "Staff scan booking".
2. WHEN a Staff_User with `update` permission changes the Scan_Mode toggle and saves, THE PadelHub_System SHALL persist the selected value to the Company_Profile.
3. WHILE Scan_Mode is enabled (true), THE PadelHub_System SHALL cause the Member's check-in surface to DISPLAY a Member_QR_Payload, AND SHALL cause the Staff Check-in page to provide a Camera_Scanner that reads the member's QR to perform the check-in.
4. WHILE Scan_Mode is disabled (false), THE PadelHub_System SHALL cause the Staff Check-in page to DISPLAY a Staff_QR_Payload, AND SHALL cause the Member portal to provide a "Scan" button that opens a Camera_Scanner reading the staff QR for self-check-in.
5. THE PadelHub_System SHALL, regardless of Scan_Mode, continue to allow staff manual member check-in and walk-in check-in at the desk.
6. WHEN the Scan_Mode is changed and saved, THE PadelHub_System SHALL apply the new direction to the Check-in page and the member portal on their next load without requiring code changes or redeploy.

### Requirement 4: Check-in Page View Access

**User Story:** As a club owner, I want the Check-in menu governed by RBAC, so that only authorized staff can see and use it.

#### Acceptance Criteria

1. THE PadelHub_System SHALL register the Checkin_Menu and Company_Settings_Menu entries in the menu catalog and seed them into the master `m_menu` table.
2. WHEN a Staff_User without `view` permission on the Checkin_Menu navigates to the Check-in page, THE PadelHub_System SHALL deny access via the server-side RBAC_Guard and render an access-denied view.
3. WHEN a Staff_User without `view` permission on the Checkin_Menu loads the sidebar, THE PadelHub_System SHALL NOT display the Check-in menu item.
4. THE `superadmin` role SHALL bypass the RBAC_Guard for both the Checkin_Menu and Company_Settings_Menu, consistent with existing behavior.
5. THE Checkin_Menu and Company_Settings_Menu SHALL define default role grants in the menu catalog: Check-in granted to owner and staff with full actions; Company Settings granted to superadmin only (other roles can be enabled later via RBAC).

### Requirement 5: Manual Member Check-in

**User Story:** As front-desk staff, I want to search a member and check them in against their booking, so that I can record attendance and validate their reservation.

#### Acceptance Criteria

1. WHEN a Staff_User searches for a Member on the Check-in page, THE PadelHub_System SHALL return matching active members from the Tenant_Database scoped to the active tenant.
2. WHEN a Staff_User selects a Member to check in, THE PadelHub_System SHALL look up that member's non-cancelled Booking_Headers for Today and identify the Booking_Header nearest to the current time (by its earliest court-line start).
3. WHILE Strict_Window is disabled, THE PadelHub_System SHALL accept the check-in against any non-cancelled Booking_Header for the member on Today.
4. WHILE Strict_Window is enabled, THE PadelHub_System SHALL accept the check-in only IF the member has a non-cancelled Booking_Header whose start time is within the Checkin_Window of the current time; otherwise it SHALL reject the attempt with a reason indicating the check-in window has not been reached.
5. WHEN a manual check-in succeeds, THE PadelHub_System SHALL create a Checkin_Record with method `manual` and result `success`, set the matched Booking_Header status to `checked_in`, AND set all of that header's non-cancelled Booking_Lines to `checked_in`.
6. IF the selected member has no non-cancelled Booking_Header for Today, THEN THE PadelHub_System SHALL reject the check-in with a reason indicating no booking exists for today, and SHALL still create a Checkin_Record with result `rejected` for audit.
7. WHEN a Staff_User without `create` permission on the Checkin_Menu attempts to confirm a check-in, THE PadelHub_System SHALL reject the action via the RBAC_Guard.
8. IF a member's matched Booking_Header is already in status `checked_in`, THEN THE PadelHub_System SHALL inform the Staff_User that the member is already checked in and SHALL NOT create a duplicate `success` Checkin_Record for the same Booking_Header.

### Requirement 6: Walk-in Quick Check-in (with Member Registration)

**User Story:** As front-desk staff, I want to quick-register a walk-in guest as a daily member and check them in, so that every walk-in becomes a tracked member without a full registration flow.

#### Acceptance Criteria

1. THE Check-in page SHALL provide a walk-in form capturing at least the guest name (non-empty), phone (using `PhoneInput`), and an optional court.
2. WHEN a Staff_User with `create` permission submits a valid walk-in form, THE PadelHub_System SHALL register a new `t_member` on the Free_Daily_Plan (Rp0 join fee) with a system-generated password, then create a Checkin_Record with method `walkin` and result `success` linked to that member.
3. IF the Free_Daily_Plan does not exist for the active tenant, THEN THE PadelHub_System SHALL create or seed it (daily plan, Rp0 join fee) so walk-in registration can succeed.
4. WHEN a walk-in member is registered, THE PadelHub_System SHALL reuse the shared member-registration logic/helper rather than duplicating registration code.
5. IF the walk-in guest name is empty or whitespace-only, THEN THE PadelHub_System SHALL prevent submission and indicate the name is required.
6. WHEN a Staff_User without `create` permission attempts a walk-in check-in, THE PadelHub_System SHALL reject the action via the RBAC_Guard.

### Requirement 7: QR Check-in (Both Directions)

**User Story:** As a member, I want to use QR check-in, so that I can check in quickly whether staff scan my code or I scan the club's code.

#### Acceptance Criteria

1. WHILE Scan_Mode is enabled (staff scans member), THE PadelHub_System SHALL display a Member_QR_Payload on the Member_Checkin_Surface encoding the signed Booking_Token for the member's relevant Booking_Header, AND SHALL provide a Camera_Scanner on the Staff Check-in page.
2. WHEN a Staff_User scans a member's Member_QR_Payload with the Camera_Scanner, THE PadelHub_System SHALL verify the Booking_Token signature and tenant, resolve the Booking_Header, validate it for Today using the same Strict_Window and Checkin_Window rules as manual check-in, and on success create a Checkin_Record with method `qr` and result `success`, set the Booking_Header status to `checked_in`, AND set all its non-cancelled Booking_Lines to `checked_in`.
3. WHILE Scan_Mode is disabled (member scans staff), THE PadelHub_System SHALL display a Staff_QR_Payload on the Staff Check-in page, AND SHALL provide a "Scan" button on the Member_Checkin_Surface that opens a Camera_Scanner.
4. WHEN a Member scans the Staff_QR_Payload and the encoded tenant matches the active club, THE PadelHub_System SHALL select the member's Booking_Header nearest to the current time, validate it using the Strict_Window and Checkin_Window rules and on success create a Checkin_Record with method `qr` and result `success`, set the Booking_Header status to `checked_in`, AND set all its non-cancelled Booking_Lines to `checked_in`.
5. IF a QR check-in attempt (either direction) fails validation, THEN THE PadelHub_System SHALL create a Checkin_Record with method `qr` and result `rejected` recording the reason, and display the rejection reason to the scanning party.
6. IF the Camera_Scanner cannot access the device camera (permission denied or unavailable), THEN THE PadelHub_System SHALL display a clear message and SHALL leave manual check-in available as a fallback for staff.
7. IF a scanned Booking_Token is malformed, has an invalid signature, is past its expiry (the booking's latest end time), or does not resolve to a Booking_Header in the active tenant, THEN THE PadelHub_System SHALL reject the scan with an "invalid QR" message and SHALL NOT create a `success` Checkin_Record.
8. WHEN a Member opens the Member_Checkin_Surface and has no non-cancelled Booking_Header for Today, THE PadelHub_System SHALL indicate there is no booking to check in against and SHALL NOT render a Member_QR_Payload.

### Requirement 8: Check-in Log and Audit Trail

**User Story:** As a club owner, I want a persistent log of check-ins, so that I can review attendance history and audit activity.

#### Acceptance Criteria

1. THE PadelHub_System SHALL persist every check-in attempt (success or rejected) as a Checkin_Record in the Tenant_Database.
2. THE Checkin_Record SHALL store: member reference (the resolved `t_member`, including quick-registered walk-ins), member display name, Booking_Header reference (nullable — null for walk-ins with no booking), court display name (nullable), Checkin_Method, Checkin_Result, the check-in timestamp, an optional rejection reason, and audit columns (`createdAt/By`, `updatedAt/By`, `deletedAt/By`, `isDeleted`).
3. WHEN the Check-in page is displayed, THE PadelHub_System SHALL list Today's Checkin_Records for the active tenant in reverse chronological order.
4. WHEN the Check-in page is displayed, THE PadelHub_System SHALL show summary counts for Today including successful check-ins and rejected attempts.
5. WHEN a new Checkin_Record is created, THE PadelHub_System SHALL include it in the displayed log without requiring a full page reload.
6. THE Checkin_Record table SHALL be a transactional (`t_*`) table that is cleared by the transactional reset, consistent with other operational data.

### Requirement 9: Migration Away from Mock Check-in

**User Story:** As a developer, I want the check-in page to use real persisted data, so that check-ins survive reloads and reflect actual bookings.

#### Acceptance Criteria

1. THE Check-in page SHALL read bookings, members, and courts from the Tenant_Database rather than from the in-memory mock modules (`mockBookings`, `mockMembers`, `mockCourts`, `mockCheckins`).
2. WHEN a check-in is recorded, THE PadelHub_System SHALL persist it such that it remains visible after a page reload.
3. THE check-in validation logic (window evaluation, nearest-Booking_Header selection, token verification) SHALL reside in a single shared server-side helper used by the manual and both QR paths.
4. WHERE the existing mock check-in components (`StaticQrCode`, `CheckinPanel`, `CheckinResult`) provide reusable presentation, THE PadelHub_System SHALL reuse or adapt them rather than introducing redundant components.
5. THE check-in server actions SHALL be guarded by the RBAC_Guard (`requirePermission` for mutations, `canViewMenu` for the page) consistent with other modules.

### Requirement 10: Company Settings Consumption Across Surfaces

**User Story:** As a club owner, I want my company profile reflected in the app's branding and check-in behavior, so that settings take effect everywhere they matter.

#### Acceptance Criteria

1. WHEN the Company_Profile logo and name are set, THE PadelHub_System SHALL be able to display them on club-facing surfaces (e.g. the sidebar/header branding area).
2. WHEN the Check-in page loads, THE PadelHub_System SHALL read the Scan_Mode, Strict_Window, and Checkin_Window from the Company_Profile rather than from hard-coded constants.
3. IF the Company_Profile cannot be loaded, THEN THE PadelHub_System SHALL fall back to safe defaults (Scan_Mode disabled, Strict_Window disabled, Checkin_Window 15) so the Check-in page remains operable.
4. WHEN the Checkin_Window value in the Company_Profile changes and is saved, THE PadelHub_System SHALL use the new tolerance the next time the Check-in page validates a check-in.
