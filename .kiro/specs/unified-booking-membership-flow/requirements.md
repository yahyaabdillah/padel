# Requirements Document

## Introduction

PadelHub is a padel-club management mock built with Next.js 16, React 19, TypeScript and Tailwind v4. It has no backend or database: all state lives in React contexts that persist to `localStorage`, seeded from deterministic dummy-data modules. The mock spans three role scopes — platform (superadmin), club (owner/staff/coach) and member (the `/me/*` portal).

The mock has grown organically and several end-to-end flows are fragmented. Two incompatible membership models coexist (a quota model on the staff side, a discount model on the member side), member-created court bookings never reach the shared club store, registration does not create a usable membership, coaching/wallet/quota consumption is inconsistent, and there is no way to cancel a booking. This feature unifies the membership data model and connects the booking, registration, quota, coaching, wallet, cancellation and finance flows so the mock demos coherently end-to-end.

This feature stays entirely within the dummy/mock implementation: in-memory React contexts persisted to `localStorage`, deterministic seeding for SSR safety, and no real backend, database, authentication or payment integration.

## Glossary

- **PadelHub_System**: The overall mock application (all role scopes) treated as the system under specification.
- **Membership_Store**: The client context that owns membership plans and per-member quota state (today `MembershipContext`, persisted to `localStorage`).
- **Club_Data_Store**: The client context that owns courts and bookings shared across club surfaces (today `ClubDataContext`, persisted to `localStorage`).
- **Membership_Plan**: A definition of a membership tier's benefits, including recurring price, join fee, included free court bookings per cycle (quota), reset period, free coaching sessions, and post-quota court discount percentage.
- **Membership_Tier**: The lowercase tier identifier shared by club members and plans: `daily`, `casual`, `pro`, `elite`.
- **Member_Membership_Record**: A per-member record linking a member to a `Membership_Plan` and tracking quota and coaching consumption within the current cycle.
- **Quota**: The number of free court bookings (`includedCourtBookings`) a `Membership_Plan` grants per cycle. While quota remains, a court booking is free (Rp0) for any court and any hour, including peak.
- **Cycle**: The recurring window of `resetPeriodDays` days over which quota and free-coaching usage accumulate. When a cycle elapses, usage resets to zero.
- **Reset_Date**: The ISO date on which the current cycle's quota and coaching usage next reset to zero.
- **Free_Coaching**: The number of coaching/personal-training sessions per cycle whose coach fee is waived, tracked in the `Member_Membership_Record`.
- **Court_Discount**: The percentage discount (`courtDiscountPct`) applied to a court booking after the member's quota is exhausted.
- **Walk_In**: A one-time `daily`-tier booking that has no quota and always pays the normal rate.
- **Booking_Surface**: Any UI location where a booking is created or displayed: member Book a Court, staff/owner New Booking, staff bookings calendar, check-in lists, and finance.
- **Wallet**: A member's in-app balance in IDR, used to pay for bookings and personal-training sessions.
- **Wallet_Activity**: A dated entry recording a change to the `Wallet` balance (top-up, booking spend, personal-training spend, refund or bonus).
- **Personal_Training**: A coaching booking (PT) made for a member, optionally bundling a court reservation.
- **Demo_Clock**: The fixed demo date and hour used for deterministic SSR rendering (demo "today" = `2026-06-02`, demo "now" hour = `14`).
- **Finance_Ledger**: The set of finance transactions shown on the club finance page.
- **Member_Portal_User**: The logged-in `/me/*` user, mapped to a club `Member_Membership_Record` for quota and benefits.

## Requirements

### Requirement 1: Unified Membership Source of Truth

**User Story:** As a club owner, I want one membership definition shared by the staff tools and the member portal, so that benefits and tier names are consistent everywhere.

#### Acceptance Criteria

1. THE PadelHub_System SHALL expose a single set of Membership_Plan definitions read by both the club staff surfaces and the member portal.
2. THE Membership_Plan SHALL define, for each tier: recurring price in whole IDR (integer ≥ 0), join fee in whole IDR (integer ≥ 0), included free court bookings per cycle (integer ≥ 0), reset period in days (integer ≥ 0), free coaching sessions per cycle (integer ≥ 0), and post-quota court discount percentage (integer 0–100).
3. THE PadelHub_System SHALL use the lowercase Membership_Tier identifiers `daily`, `casual`, `pro`, and `elite` consistently across club and member surfaces.
4. WHEN the member portal membership page is displayed, THE PadelHub_System SHALL render benefits derived from the unified Membership_Plan definitions.
5. WHEN the member portal membership page is displayed for a member's tier, THE PadelHub_System SHALL display, matching that tier's Membership_Plan exactly: the included free court bookings per cycle, the reset period in days, the free coaching sessions per cycle, and the post-quota court discount percentage.
6. WHERE a Membership_Plan is saved through the staff membership-plan management screen, THE PadelHub_System SHALL persist the change to the Membership_Store and, only after the save and persistence succeed, reflect the updated benefit values the next time the member portal membership page is displayed.
7. IF a Member_Portal_User's stored tier label differs only by letter casing or surrounding whitespace from a Membership_Tier identifier, THEN THE PadelHub_System SHALL resolve it to the matching Membership_Tier.
8. IF a Member_Portal_User's stored tier label matches no Membership_Tier identifier, THEN THE PadelHub_System SHALL treat the member as having no active plan and fall back to the `daily` tier.

### Requirement 2: Member-Portal-User to Membership Record Mapping

**User Story:** As a member, I want the portal to recognize which club member I am, so that my real quota and benefits are applied when I book.

#### Acceptance Criteria

1. THE PadelHub_System SHALL map each Member_Portal_User to exactly one Member_Membership_Record by matching the member's stable identifier rather than the member's display name.
2. WHEN a Member_Portal_User opens the Book a Court page, THE PadelHub_System SHALL read from the mapped Member_Membership_Record the remaining Quota, total Quota, Court_Discount percentage, and Reset_Date, treating remaining Quota and total Quota as non-negative numbers.
3. WHEN a Member_Portal_User opens the Book a Court page, THE PadelHub_System SHALL apply the mapped Member_Membership_Record's Membership_Tier benefits to that page's pricing.
4. IF no Member_Membership_Record can be resolved for the Member_Portal_User's stable identifier, THEN THE PadelHub_System SHALL treat the member as having no active plan and price the member's court bookings at the standard court rate with no Quota and no Court_Discount.
5. IF a Member_Portal_User's stable identifier is missing, empty, or matches no club member, THEN THE PadelHub_System SHALL treat the member as having no active plan and apply the standard court rate.

### Requirement 3: Member Booking Persistence Across Surfaces

**User Story:** As a club owner, I want member-created bookings to appear on the staff calendar, check-in and finance, so that every booking is visible in one place.

#### Acceptance Criteria

1. WHEN a Member_Portal_User confirms a court booking for a slot that is not already booked, THE PadelHub_System SHALL persist the booking to the Club_Data_Store with status confirmed.
2. WHEN a member-created court booking is persisted to the Club_Data_Store, THE PadelHub_System SHALL record the court, start time, end time, booking type of member, status, customer name set to the member's display name, the member identifier of the mapped Member_Membership_Record, party size between 2 and 4 players according to the court format, and price.
3. WHEN a member-created booking is persisted, THE PadelHub_System SHALL display the booking on the staff bookings calendar for the corresponding court and time slot without requiring a page reload.
4. WHEN a member-created booking is persisted, THE PadelHub_System SHALL include the booking in the check-in list for the booking's date without requiring a page reload.
5. WHEN a Personal_Training booking is created, THE PadelHub_System SHALL persist the Personal_Training booking to the Club_Data_Store with booking type coaching and status confirmed.
6. IF a Member_Portal_User attempts to confirm a booking whose court and time range overlap an existing Club_Data_Store booking with a status other than cancelled, THEN THE PadelHub_System SHALL prevent persistence of the booking, retain the member's slot selection, and display a message indicating the slot is unavailable.

### Requirement 4: Registration Creates a Membership Record and Quota

**User Story:** As front-desk staff, I want registering a member on a paid tier to create their membership, so that their free quota and coaching benefits work immediately.

#### Acceptance Criteria

1. WHEN a member is registered with a paid Membership_Tier (`casual`, `pro`, or `elite`), THE PadelHub_System SHALL create a Member_Membership_Record linked to that tier.
2. WHEN a Member_Membership_Record is created at registration, THE PadelHub_System SHALL set the cycle start to the Demo_Clock date (`2026-06-02`) and set quota consumption and coaching consumption to zero.
3. WHEN a newly registered paid-tier member makes a court booking after registration while remaining Quota is greater than zero, THE PadelHub_System SHALL price that booking at Rp0 and decrement the record's quota consumption by exactly one.
4. WHEN a member is registered as a Walk_In on the `daily` tier, THE PadelHub_System SHALL NOT create a quota-bearing Member_Membership_Record, and SHALL price the member's court bookings at the standard court rate with no quota and no discount.
5. WHERE registration includes court bookings that are covered by Quota, THE PadelHub_System SHALL decrement the created Member_Membership_Record's quota consumption by exactly one per covered booking, never reducing remaining Quota below zero.
6. IF registration includes more quota-eligible court bookings than the tier's remaining Quota, THEN THE PadelHub_System SHALL charge the bookings beyond the Quota at the standard court rate reduced by the tier's Court_Discount percentage.
7. IF a registration is submitted with a Membership_Tier value that matches no defined tier, THEN THE PadelHub_System SHALL prevent creation of the Member_Membership_Record and display a validation message.

### Requirement 5: Court Quota Consumption and Pricing

**User Story:** As a member, I want my free booking quota applied automatically, so that booking is free while quota remains and discounted afterward.

#### Acceptance Criteria

1. WHILE a member's remaining Quota (the plan's total included court bookings minus the Member_Membership_Record's quota consumption) is greater than zero, THE PadelHub_System SHALL price the member's next court booking at Rp0 regardless of court, regardless of hour, regardless of peak or off-peak classification, and regardless of the number of hours in the booking.
2. WHEN a member confirms a court booking while remaining Quota is greater than zero, THE PadelHub_System SHALL treat that booking as covered by Quota and decrement the member's quota consumption by exactly one, regardless of the booking's duration in hours.
3. IF a member's remaining Quota is zero when a court booking is confirmed, THEN THE PadelHub_System SHALL charge the applicable standard court rate for the booked hour (peak or off-peak) reduced by the member's tier Court_Discount percentage, with the resulting amount not less than Rp0.
4. WHILE a member is on the `daily` tier, THE PadelHub_System SHALL charge the applicable standard court rate (peak or off-peak for the booked hour) with no quota applied and no Court_Discount applied.
5. WHEN a Member_Membership_Record's quota or coaching benefits are evaluated relative to the Demo_Clock date and the elapsed days since the record's cycle start are greater than or equal to the plan's reset period, THE PadelHub_System SHALL reset the record's quota and coaching consumption to zero and advance the cycle start by whole multiples of the reset period until the cycle start is within one reset period of the Demo_Clock date.
6. WHEN a member's quota status is displayed, THE PadelHub_System SHALL first apply any cycle reset that is due relative to the Demo_Clock and then show the remaining quota, the total quota, and the Reset_Date.

### Requirement 6: Free-Coaching Consumption

**User Story:** As a member, I want my free coaching sessions tracked against my plan, so that the coach fee is waived consistently until my coaching allowance is used.

#### Acceptance Criteria

1. THE PadelHub_System SHALL track free-coaching usage in the Member_Membership_Record against the plan's Free_Coaching allowance.
2. WHILE a member's remaining Free_Coaching is greater than zero, THE PadelHub_System SHALL waive the coach fee for the member's next Personal_Training session, including when the member retains remaining free-coaching sessions carried over while the current plan's Free_Coaching allowance is zero.
3. WHEN a member confirms a Personal_Training session covered by Free_Coaching, THE PadelHub_System SHALL decrement the member's coaching consumption by one.
4. IF a member's remaining Free_Coaching is zero, THEN THE PadelHub_System SHALL charge the standard coach fee for the Personal_Training session.
5. THE PadelHub_System SHALL derive the Free_Coaching allowance from the unified Membership_Plan rather than a separate constant.

### Requirement 7: Booking Cancellation with Quota Refund

**User Story:** As a member or staff member, I want to cancel a booking, so that the slot is freed and any consumed quota is returned.

#### Acceptance Criteria

1. WHEN a user with cancel permission cancels a booking, THE PadelHub_System SHALL set the booking status to cancelled in the Club_Data_Store.
2. WHEN a booking is cancelled, THE PadelHub_System SHALL free the booking's court and time slot for new bookings; IF the slot-availability update fails, THEN THE PadelHub_System SHALL still record the cancellation, leaving availability to be corrected by a subsequent manual action.
3. IF a cancelled booking consumed Quota, THEN THE PadelHub_System SHALL increment the member's remaining quota by the amount the booking consumed.
4. IF a cancelled Personal_Training booking consumed Free_Coaching, THEN THE PadelHub_System SHALL increment the member's remaining free-coaching allowance by the amount the booking consumed.
5. WHEN a booking is cancelled, THE PadelHub_System SHALL display the cancelled status consistently across the staff calendar and check-in surfaces.

### Requirement 8: Wallet Deduction and Activity

**User Story:** As a member, I want paid bookings to deduct from my wallet and show up in my activity, so that my balance reflects what I spend.

#### Acceptance Criteria

1. WHEN a member confirms a court booking with a payable amount greater than zero, THE PadelHub_System SHALL deduct the payable amount from the member's Wallet balance.
2. WHEN a member confirms a Personal_Training session with a payable amount greater than zero, THE PadelHub_System SHALL deduct the payable amount from the member's Wallet balance.
3. WHEN a Wallet balance is deducted for a booking, THE PadelHub_System SHALL create a Wallet_Activity entry recording the spend amount as negative, the date, and a booking or coaching type.
4. WHEN a booking covered entirely by Quota is confirmed by any path, THE PadelHub_System SHALL NOT deduct any amount from the Wallet for that booking.
5. WHEN a wallet top-up is performed, THE PadelHub_System SHALL increase the Wallet balance and create a Wallet_Activity entry recording the top-up amount as positive.
6. WHEN a booking that deducted from the Wallet is cancelled, THE PadelHub_System SHALL refund the deducted amount to the Wallet balance and create a refund Wallet_Activity entry.
7. IF a member's Wallet balance is less than the payable amount for a booking, THEN THE PadelHub_System SHALL prevent confirmation and display an insufficient-balance message.

### Requirement 9: Finance and Dashboard Consistency

**User Story:** As a club owner, I want bookings, coaching and membership activity to flow into finance and dashboard figures, so that the demo reflects live data instead of static seeds.

#### Acceptance Criteria

1. WHEN a paid court booking is persisted to the Club_Data_Store, THE PadelHub_System SHALL include a corresponding court-booking transaction in the Finance_Ledger.
2. WHEN a paid Personal_Training booking is persisted, THE PadelHub_System SHALL include a corresponding coaching transaction in the Finance_Ledger.
3. WHEN a member is registered on a paid Membership_Tier, THE PadelHub_System SHALL include a corresponding membership transaction in the Finance_Ledger.
4. WHEN a booking that produced a Finance_Ledger transaction is cancelled, THE PadelHub_System SHALL include a refund transaction in the Finance_Ledger.
5. WHEN the club dashboard key figures are displayed, THE PadelHub_System SHALL derive booking and revenue figures from the Club_Data_Store and Finance_Ledger rather than from static seed totals.

### Requirement 10: Deterministic Mock Behavior and Shared Demo Clock

**User Story:** As a developer, I want a single demo-clock source and deterministic state, so that server and client renders match and the demo is reproducible.

#### Acceptance Criteria

1. THE PadelHub_System SHALL provide a single source for the Demo_Clock date and hour used by booking, check-in, quota and member surfaces.
2. THE PadelHub_System SHALL persist Membership_Store and Club_Data_Store state to `localStorage` and rehydrate it on load.
3. WHEN seed data is generated for rendering, THE PadelHub_System SHALL produce identical output on the server and on the client for the same Demo_Clock.
4. WHERE a reset action is invoked for the Membership_Store or Club_Data_Store, THE PadelHub_System SHALL restore the seeded state and clear the corresponding persisted `localStorage` entries.
5. WHERE persisted `localStorage` entries are cleared by means other than an explicit reset action, THE PadelHub_System SHALL re-seed the affected store from its dummy-data modules on the next load without requiring an explicit reset.
