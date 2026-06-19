# Requirements Document

## Introduction

This feature extends PadelHub's member self-service and staff tooling along two
related tracks that share the same membership economics (the
`calcMembershipBenefit` helper and the `t_member` membership fields).

- **Part A — Member booking enhancements.** The member booking surface
  (`/me/book`) is already DB-backed: a logged-in member books a court for
  themselves, status `confirmed`, non-cash payment only (QRIS / Transfer),
  membership quota/discount auto-applied, and the booking appears in
  `/me/checkin`, `/me/bookings`, and the staff `/bookings` calendar. This track
  adds: multi-session checkout in one transaction (mirroring the staff booking
  flow), a clearer price/payment confirmation step, time-group labelling of
  slots, and member-initiated cancellation.

- **Part B — Membership purchase flow on both sides.** Today a plan can only be
  assigned to a member at registration (`registerMemberAction`). This track adds
  a dedicated membership management surface: on the **staff** side a new
  Membership menu where staff can sell/assign a plan to an existing member,
  **upgrade** to a different plan, or **extend** the current plan (the Data
  Member list gets a "Kelola Membership" button that redirects there); and on
  the **member** side a DB-backed `/me/membership` page where a member buys,
  upgrades, or extends their own plan. Every membership action is recorded in a
  new membership-history log. On success the member's `planId`, `cycleStart`,
  quota usage, and `joinFeePaid` are set so benefits take effect for subsequent
  bookings.

### Decisions and scope boundaries

- **Payment is record-only.** There is no payment gateway. Choosing a method
  (booking: QRIS/Transfer; staff membership: Cash also allowed) marks the
  record paid and active immediately. No pending/verification state.
- **Membership cost = the plan's one-time `joinFee`.** There is no separate
  recurring/monthly charge. Buying, extending, or upgrading all charge the
  relevant plan's `joinFee`.
- **Join fee is recorded in a dedicated `t_membership_history` table**, NOT as a
  `t_booking` row. This table also serves as the membership history/audit feed.
- **Payments are recorded in a dedicated `t_payment` table (record-only now).**
  Every checkout writes one Payment_Record and links related records via a
  shared `paymentRef`. There is no gateway yet — status is always `paid`. The
  table is shaped so a future payment-gateway spec can extend it (provider id,
  `pending`/`failed`, callbacks) without restructuring bookings or membership.
- **Upgrade = full replace, no pro-rate.** Switching to a different plan
  replaces the current plan outright; remaining quota is forfeited and the new
  plan's `joinFee` is charged in full.
- **Extend = same plan, reset cycle + full quota.** Extending re-activates the
  current plan: `cycleStart` resets to now, quota usage resets to zero, and the
  plan's `joinFee` is charged.
- **No "renew" term.** The two membership operations on an existing plan are
  **Extend** (same plan) and **Upgrade** (different plan).
- **Multi-session checkout mirrors the staff booking flow** (multiple courts /
  hours in one transaction, same rules as `createBookingsAction`).
- **Out of scope (separate future spec):** wallet/balance, automatic refunds,
  reschedule, cash-out, and a per-booking detail view. Cancellation here only
  frees the slot and restores quota; money is not auto-refunded.

All work honors existing PadelHub conventions: tenant scoping by `companyId`,
audit columns plus soft delete, RBAC enforced server-side via
`requirePermission(menuKey, action)` for mutations and `canViewMenu(menuKey)`
for pages (superadmin bypasses), reuse of the shared `calcMembershipBenefit`
helper, persistence to `t_booking` + `t_booking_detail`, and member
self-service payments restricted to non-cash methods.

## Glossary

- **PadelHub**: The multi-tenant padel-club platform (Next.js 16, React 19,
  Prisma 6, PostgreSQL) of which this feature is a part.
- **PadelHub_System**: The overall application (all server actions, pages, and
  data layers) treated as the system under specification.
- **Tenant**: A single padel club, isolated by `companyId`. Every query and
  mutation is scoped to the acting session's `companyId`.
- **Member**: A club customer (`t_member`) who can log in to the member portal
  (`/me/*`) under the `member` role.
- **Staff_User**: An internal user (`m_user`) with role owner / staff / coach /
  superadmin who operates the admin surfaces.
- **Booking_System**: The server-side booking logic that persists a booking
  transaction header (`t_booking`) and one detail line per court session
  (`t_booking_detail`).
- **Booking_Transaction**: One `t_booking` header grouping one or more court
  session lines paid together in a single checkout.
- **Booking_Session**: One `t_booking_detail` line — a single court at a single
  time window.
- **Membership_Plan**: A configured plan (`m_membership_plan`) with `joinFee`,
  `includedCourtBookings` (quota), `resetPeriodDays`, `courtDiscountPct`, and
  `freeCoaching`.
- **Membership_System**: The server-side logic that assigns / extends /
  upgrades a plan on a `t_member` row, settles the join fee, and writes a
  Membership_History entry.
- **Membership_History**: A new `t_membership_history` table; one row per
  membership action (assign / extend / upgrade) recording the member, plan,
  action, charged join-fee amount, payment method, who performed it, and when.
  This is both the join-fee financial record and the membership audit feed.
- **Benefit_Calculator**: The shared `calcMembershipBenefit` helper that prices
  court sessions given a plan and remaining quota.
- **Quota**: The number of free court bookings included per cycle
  (`includedCourtBookings`), tracked against `t_member.quotaUsed`.
- **Cycle**: The quota period that begins at `t_member.cycleStart` and resets
  after `Membership_Plan.resetPeriodDays` days.
- **Join_Fee**: The one-time fee (`Membership_Plan.joinFee`) charged when a plan
  is assigned, extended, or upgraded; settlement is recorded in
  `t_member.joinFeePaid` and logged in Membership_History.
- **No_Plan_Member**: A Member with `planId` null, treated as daily / walk-in:
  pays the standard court rate with no Quota and no discount.
- **Assign**: Setting a plan on a Member who currently has no plan.
- **Extend**: Re-activating a Member's current plan — resets `cycleStart` to now
  and resets quota usage to zero, charging the plan's Join_Fee.
- **Upgrade**: Replacing a Member's current plan with a different plan — full
  replace (remaining quota forfeited), charging the new plan's Join_Fee.
- **Time_Group**: A club-wide time-of-day bucket (`m_time_group`) with
  `[startHour, endHour)` and a display color/name (e.g. Pagi, Siang, Sore,
  Malam).
- **Non_Cash_Method**: A member-permitted payment method, restricted to QRIS or
  Transfer (`MEMBER_PAYMENT_METHODS`). Cash is excluded for member self-service.
- **Membership_Menu**: A new staff menu (proposed key `members.membership`,
  granted to owner and staff) hosting membership sale/assign/extend/upgrade and
  the membership history.
- **Payment_Record**: A row in a new `t_payment` table representing one
  checkout's payment (method, total amount, `paymentRef`, status). It is
  record-only now (status always `paid`); a future payment-gateway spec will
  extend it (provider id, `pending`/`failed`, callbacks) without restructuring
  bookings or membership.
- **Payment_Ref**: A stable per-checkout identifier shared by every record
  produced in the same checkout (the Payment_Record, the Booking_Transaction,
  and/or the Membership_History entry) so a single payment can be reconstructed.
- **Checkout**: One acting operation that may produce a membership change and/or
  a court booking, all paid together and linked by a single Payment_Ref.
- **Access_Guard**: The RBAC layer (`requirePermission` for mutations,
  `canViewMenu` for pages); superadmin bypasses.
- **Member_Portal**: The `/me/*` surfaces granted to the `member` role via menu
  keys prefixed `portal.`.

## Requirements

### Requirement 1: Multi-session booking checkout (member)

**User Story:** As a Member, I want to add several courts or time slots to one
checkout, so that I can pay for multiple sessions in a single transaction.

#### Acceptance Criteria

1. WHEN a Member submits a checkout containing one or more Booking_Sessions, THE Booking_System SHALL persist exactly one Booking_Transaction header scoped to the Member's Tenant and exactly one Booking_Session line per selected court-and-time window, where each line records its court, start time, end time, base price, and charged price.
2. THE Booking_System SHALL apply the same checkout rules as the staff booking flow (`createBookingsAction`), allowing multiple courts and multiple time windows within one Booking_Transaction.
3. WHEN a Member submits a multi-session checkout, THE Benefit_Calculator SHALL price all selected sessions together and allocate available Quota to sessions in descending order of base price, covering the highest-priced sessions first until Quota is exhausted or all sessions are covered.
4. WHEN Quota is exhausted, THE Benefit_Calculator SHALL apply the plan's `courtDiscountPct` (0 to 100) to each remaining uncovered Booking_Session and set that session's charged price to its base price minus the discounted amount.
5. WHEN a multi-session checkout succeeds, THE Booking_System SHALL set the Booking_Transaction `quotaConsumed` to the count of Booking_Sessions covered by Quota AND increment `t_member.quotaUsed` by that same count within the same database transaction.
6. IF any selected Booking_Session overlaps an existing non-cancelled Booking_Session on the same court within the same Tenant, where overlap means the selected session's start is before the existing session's end and the selected session's end is after the existing session's start, THEN THE Booking_System SHALL reject the entire checkout, persist no Booking_Transaction or Booking_Session line, and return a message identifying the conflicting session.
7. IF a checkout contains zero Booking_Sessions, THEN THE Booking_System SHALL reject the request, persist no records, and return a validation message indicating at least one session is required.
8. WHEN a multi-session checkout succeeds, THE Booking_System SHALL set the Booking_Transaction `totalPrice` to the sum of all Booking_Session charged prices after Quota and discount benefits are applied.

### Requirement 2: Member price preview and payment confirmation

**User Story:** As a Member, I want a clear price breakdown and confirmation
before I commit a booking, so that I know exactly what I will pay and how.

#### Acceptance Criteria

1. WHEN a Member requests a booking price preview, THE Benefit_Calculator SHALL return the subtotal, Quota savings, discount savings, and final payable amount, each as a non-negative IDR value, without creating, updating, or deleting any record and without decrementing any Quota balance.
2. WHEN a Member confirms a booking, THE Booking_System SHALL validate that the selected payment method is a Non_Cash_Method (exactly one of QRIS or Transfer).
3. IF a Member-initiated booking specifies a payment method other than QRIS or Transfer, THEN THE Booking_System SHALL reject the booking, persist no Booking_Transaction, decrement no Quota, and return a message that cash payment is available only at the desk.
4. WHEN a Member confirms a booking with a valid Non_Cash_Method, THE Booking_System SHALL persist the Booking_Transaction with status `confirmed` and record the selected method on the `paymentMethod` field.
5. WHEN a booking is successfully created, THE Booking_System SHALL return the persisted transaction identifier, the final payable amount (non-negative IDR), and a boolean indicating whether the booking was fully covered by Quota.

### Requirement 3: Member-initiated booking cancellation

**User Story:** As a Member, I want to cancel my own upcoming booking, so that I
can free the slot when my plans change.

#### Acceptance Criteria

1. WHEN a Member cancels a Booking_Session they own whose status is `confirmed` and whose start time is strictly later than the current server time, THE Booking_System SHALL set that Booking_Session status to `cancelled` and stamp `updatedAt` and `updatedBy` from the acting session.
2. IF a Member attempts to cancel a Booking_Session whose start time is earlier than or equal to the current server time, THEN THE Booking_System SHALL reject the cancellation, leave the session unchanged, and return a message that past bookings cannot be cancelled.
3. IF a Member attempts to cancel a Booking_Session that does not belong to the acting Member within the current Tenant, THEN THE Booking_System SHALL deny the action, make no change, and return an authorization error.
4. WHEN a cancelled Booking_Session had consumed Quota in the current Cycle, THE Membership_System SHALL decrement `t_member.quotaUsed` by 1 for that session, never below zero.
5. WHEN a Booking_Session is cancelled, THE Booking_System SHALL release the occupied slots so the court time becomes available for new bookings.
6. IF a Member attempts to cancel a Booking_Session whose status is already `cancelled`, THEN THE Booking_System SHALL make no change and SHALL NOT decrement Quota again.
7. THE Booking_System SHALL NOT issue any monetary refund on cancellation (refund handling is out of scope for this feature).
8. THE Access_Guard SHALL permit Member cancellation only for the `member` role acting on the `portal.bookings` menu with the cancel action.

### Requirement 4: Time-group display of booking slots

**User Story:** As a Member, I want booking slots grouped by time of day, so
that I can quickly find a morning or evening slot.

#### Acceptance Criteria

1. WHEN the member booking page loads, THE Member_Portal SHALL retrieve the Tenant's active Time_Groups ordered ascending by `sortOrder`.
2. WHERE a bookable hour (an integer 0–23) falls within a Time_Group's `[startHour, endHour)` range, THE Member_Portal SHALL label that hour with the Time_Group's name and color.
3. IF a bookable hour falls within more than one Time_Group's range, THEN THE Member_Portal SHALL apply the Time_Group with the lowest `sortOrder`.
4. IF a Time_Group has `startHour` equal to `endHour` (zero duration), THEN THE Member_Portal SHALL ignore that Time_Group so it labels no hour.
5. IF a bookable hour falls within no Time_Group, THEN THE Member_Portal SHALL display that hour without a Time_Group label.
6. THE Member_Portal SHALL display only bookable hours within the selected weekday's operating window, excluding hours outside that window.
7. IF retrieving the Tenant's Time_Groups fails or returns none, THEN THE Member_Portal SHALL display all bookable hours without Time_Group labels.

### Requirement 5: Staff sells or assigns a plan to an existing member

**User Story:** As a Staff_User, I want to sell a membership plan to an existing
member, so that I can onboard members into a paid plan at the desk.

#### Acceptance Criteria

1. WHEN a Staff_User assigns an active Membership_Plan to a Member who currently has no `planId`, THE Membership_System SHALL, in a single committed operation, set the Member's `planId`, set `cycleStart` to the assignment time, reset `quotaUsed` and `coachingUsed` to zero, set the legacy `tier` label to the plan name, and write a Membership_History entry with action `assign`.
2. WHERE the assigned Membership_Plan has a Join_Fee greater than zero, THE Membership_System SHALL set `t_member.joinFeePaid` to true and record the charged Join_Fee amount and the Staff_User-selected payment method on the Membership_History entry.
3. WHERE the assigned Membership_Plan has a Join_Fee of zero, THE Membership_System SHALL set `joinFeePaid` to true and record a zero amount on the Membership_History entry.
4. THE Membership_System SHALL accept either Cash or a Non_Cash_Method for a Staff_User-collected Join_Fee.
5. IF the selected Membership_Plan does not exist, is inactive, or belongs to another Tenant, THEN THE Membership_System SHALL reject the assignment, leave all Member plan fields unchanged, write no Membership_History entry, and return a message that the plan was not found.
6. IF a Staff_User attempts to assign a plan to a Member who already has a non-null `planId`, THEN THE Membership_System SHALL reject the assignment, leave existing plan fields unchanged, and return a message that the Member already has a plan (directing to Extend or Upgrade).
7. THE Access_Guard SHALL permit the assignment action only for a Staff_User holding the create or update action on the `members.membership` menu, and SHALL reject other callers without modifying any data.

### Requirement 6: Staff extends or upgrades an existing member's plan

**User Story:** As a Staff_User, I want to extend or upgrade a member's existing
plan, so that the member's benefits reflect their latest purchase.

#### Acceptance Criteria

1. WHEN a Staff_User extends a Member's current Membership_Plan, THE Membership_System SHALL keep `planId` unchanged, reset `cycleStart` to the current server time, reset `quotaUsed` and `coachingUsed` to zero, and write a Membership_History entry with action `extend`.
2. WHEN a Staff_User upgrades a Member to a different active Membership_Plan within the current Tenant, THE Membership_System SHALL replace `planId` with the selected plan, reset `cycleStart` to the current server time, reset `quotaUsed` and `coachingUsed` to zero, set the `tier` label to the new plan name, forfeit any remaining Quota from the previous plan without pro-rating, and write a Membership_History entry with action `upgrade`.
3. WHERE an extend or upgrade carries a Join_Fee greater than zero, THE Membership_System SHALL record the charged Join_Fee amount and the Staff_User-selected payment method (Cash or a Non_Cash_Method) on the Membership_History entry and set `joinFeePaid` to true.
4. WHERE an extend or upgrade carries a Join_Fee of zero, THE Membership_System SHALL set `joinFeePaid` to true and record a zero amount on the Membership_History entry.
5. WHEN a Staff_User completes an extend or upgrade, THE Membership_System SHALL stamp the audit update fields (updated-by identity and update timestamp) on the Member record.
6. IF a Staff_User attempts to extend a Member who currently has no `planId`, THEN THE Membership_System SHALL reject the action and return a message that no plan is assigned (directing to Assign).
7. IF a Staff_User attempts to extend or upgrade a Member that does not exist within the current Tenant, THEN THE Membership_System SHALL reject the action, change no record, and return a not-found message.
8. IF a Staff_User selects an upgrade target plan that does not exist, is inactive, or belongs to another Tenant, THEN THE Membership_System SHALL reject the action, leave the Member's existing plan fields unchanged, and return a message that the plan was not found.

### Requirement 7: Member buys, extends, or upgrades their own membership

**User Story:** As a Member, I want to buy, extend, or upgrade my membership
from the portal, so that I get plan benefits without visiting the desk.

#### Acceptance Criteria

1. WHEN a Member opens `/me/membership`, THE Member_Portal SHALL display the active Membership_Plans for the Tenant with each plan's Join_Fee, Quota, discount, and perks.
2. WHILE the Member has a plan assigned, THE Member_Portal SHALL display the Member's current plan, remaining Quota, and Cycle reset date, and SHALL present Extend (same plan) and Upgrade (different plan) actions rather than a plain Buy action.
3. WHILE the Member has no plan assigned, THE Member_Portal SHALL indicate the Member is on daily / walk-in and present a Buy action per plan.
4. WHEN a Member buys a plan they do not currently hold, THE Membership_System SHALL, in a single atomic operation, set `planId`, set `cycleStart` to now, reset `quotaUsed` and `coachingUsed` to zero, set the `tier` label to the plan name, set `joinFeePaid` to true, and write a Membership_History entry with action `assign`.
5. WHEN a Member extends their current plan, THE Membership_System SHALL keep `planId` unchanged, reset `cycleStart` to now, reset `quotaUsed` and `coachingUsed` to zero, and write a Membership_History entry with action `extend`.
6. WHEN a Member upgrades to a different plan, THE Membership_System SHALL replace `planId`, reset `cycleStart` to now, reset `quotaUsed` and `coachingUsed` to zero, set the `tier` label to the new plan name, forfeit remaining Quota without pro-rating, and write a Membership_History entry with action `upgrade`.
7. THE Membership_System SHALL accept only a Non_Cash_Method (QRIS or Transfer) for any Member-initiated membership purchase, extend, or upgrade.
8. IF a Member-initiated purchase specifies a method other than a Non_Cash_Method, THEN THE Membership_System SHALL reject it, leave the Member's membership fields unchanged, write no Membership_History entry, and return a message that cash payment is available only at the desk.
9. WHERE the purchased, extended, or upgraded plan has a Join_Fee greater than zero, THE Membership_System SHALL record the charged Join_Fee amount and the selected Non_Cash_Method on the Membership_History entry.
10. WHEN a Member's membership action succeeds, THE Membership_System SHALL ensure the Benefit_Calculator applies the new plan's Quota and `courtDiscountPct` to the Member's subsequent Booking_Sessions within the same Cycle.
11. IF the selected Membership_Plan does not exist, is inactive, or belongs to another Tenant, THEN THE Membership_System SHALL reject the action, leave the Member's membership fields unchanged, and return a message that the plan was not found.
12. THE Membership_System SHALL apply a Member-initiated action only to the acting Member's own account and SHALL reject any attempt to target another account with an authorization error.

### Requirement 8: Membership benefit consistency and daily fallback

**User Story:** As a Member, I want a single consistent benefit calculation, so
that my price matches whichever surface I use and stays correct when quota runs
out.

#### Acceptance Criteria

1. THE Booking_System SHALL use the Benefit_Calculator to price court sessions on every booking surface (member and staff).
2. THE Membership_System SHALL resolve remaining Quota by rolling the Cycle forward when `resetPeriodDays` has elapsed since `cycleStart` before applying benefits, treating consumed Quota as zero for the new Cycle.
3. WHILE a Member with an assigned plan has zero remaining Quota in the current Cycle, THE Benefit_Calculator SHALL charge the standard court rate reduced by the plan's `courtDiscountPct`, and THE Membership_System SHALL keep the Member's `planId` and `tier` unchanged (the plan does NOT revert to daily).
4. WHILE a No_Plan_Member books a court, THE Benefit_Calculator SHALL charge the standard court rate with no Quota and no discount.
5. THE Benefit_Calculator SHALL apply `courtDiscountPct` only to Booking_Sessions not covered by Quota.

### Requirement 9: Membership history log

**User Story:** As a Staff_User and as a Member, I want a history of membership
actions, so that I can see when a plan was bought, extended, or upgraded and how
much was paid.

#### Acceptance Criteria

1. THE Membership_System SHALL persist a Membership_History entry for every assign, extend, and upgrade action, recording the Tenant, Member, target plan, action type, charged Join_Fee amount, payment method, the actor who performed it (Staff_User or the Member), and the timestamp.
2. WHEN a Staff_User opens the Membership_Menu for a Member, THE Membership_System SHALL display that Member's Membership_History entries in reverse chronological order.
3. WHEN a Member opens `/me/membership`, THE Member_Portal SHALL display the acting Member's own Membership_History entries in reverse chronological order.
4. THE Membership_System SHALL scope every Membership_History read and write to the acting session's `companyId` and SHALL exclude soft-deleted entries.
5. IF a membership action is rejected, THEN THE Membership_System SHALL NOT write a Membership_History entry for it.

### Requirement 10: RBAC and menu access

**User Story:** As a Tenant administrator, I want every new surface guarded by
RBAC, so that only authorized roles can use it.

#### Acceptance Criteria

1. THE Access_Guard SHALL enforce `canViewMenu` on every new page before any Tenant data is fetched or rendered.
2. THE Access_Guard SHALL enforce `requirePermission(menuKey, action)` on every mutation server action introduced by this feature.
3. THE Membership_System SHALL register a new staff Membership_Menu (proposed key `members.membership`) granted by default to the owner and staff roles, and the Data Member page SHALL provide a "Kelola Membership" control that navigates to it.
4. THE Membership_System SHALL grant the member-side booking-cancellation and membership-purchase capabilities to the `member` role via menu keys prefixed `portal.` (e.g. `portal.bookings`, `portal.membership`).
5. IF an acting session lacks the required grant for an action, THEN THE Access_Guard SHALL deny the action and return an authorization message, unless the session role is superadmin.
6. THE Access_Guard SHALL scope every query and mutation to the acting session's `companyId`.

### Requirement 11: Auditing and soft delete

**User Story:** As a Tenant administrator, I want all changes audited and
reversible, so that the club retains an accurate operational history.

#### Acceptance Criteria

1. WHEN any record is created by this feature, THE Booking_System SHALL stamp `createdAt` and `createdBy` from the acting session.
2. WHEN any record is updated by this feature, THE Booking_System SHALL stamp `updatedAt` and `updatedBy` from the acting session.
3. WHEN a record is removed by this feature, THE Booking_System SHALL perform a soft delete by setting `isDeleted` to 1 and stamping `deletedAt` and `deletedBy` atomically, rather than a hard delete.
4. THE Booking_System SHALL exclude soft-deleted records from all read queries introduced by this feature.

### Requirement 12: Combined checkout, plan-before-court ordering, and payment record

**User Story:** As a Staff_User or Member, I want a membership purchase and a
court booking made in one checkout to be applied correctly and recorded as one
payment, so that the court price reflects the just-bought plan and the books
stay consistent.

#### Acceptance Criteria

1. WHEN a Checkout includes both a membership action and one or more Booking_Sessions, THE Membership_System SHALL apply the membership change (update `t_member` and write Membership_History) BEFORE the Booking_System prices and persists the court sessions, so the Benefit_Calculator uses the newly active plan's Quota and `courtDiscountPct`.
2. THE Booking_System and Membership_System SHALL perform a combined Checkout within a single database transaction, so that if any part fails (e.g. a court overlap), the entire Checkout is rolled back and neither the membership change nor the booking is persisted.
3. WHEN a Checkout is committed, THE PadelHub_System SHALL create exactly one Payment_Record in `t_payment` capturing the total amount (join fee plus court charges), the payment method, and a generated `paymentRef`, and SHALL store that same `paymentRef` on the Membership_History entry and/or the Booking_Transaction produced by the Checkout.
4. THE PadelHub_System SHALL set each Payment_Record status to `paid` at creation (no gateway verification in this feature).
5. WHERE a Checkout is paid in cash by a Staff_User, THE PadelHub_System SHALL require the cash received to be greater than or equal to the Checkout total; IF the cash received is less than the total, THEN THE PadelHub_System SHALL reject the Checkout, persist nothing, and return an insufficient-amount message.
6. WHERE a Checkout is initiated by a Member, THE PadelHub_System SHALL accept only a Non_Cash_Method and treat the Checkout as paid in full upon confirmation.
7. THE PadelHub_System SHALL display the combined total (join fee plus court charges) to the payer before confirmation while keeping the membership and booking as separate persisted records linked by `paymentRef`.
8. THE Payment_Record status field SHALL support the values `paid`, `pending`, `failed`, `cancelled`, and `refunded` so a future payment-gateway and refund capability can transition it; in this feature THE PadelHub_System SHALL only ever write `paid`.

### Requirement 13: Consistency of existing registration and booking-modal flows

**User Story:** As a Tenant administrator, I want the existing registration and
quick-add-member flows to use the new membership and payment model, so that join
fees are recorded consistently everywhere.

#### Acceptance Criteria

1. WHEN a plan is assigned during member registration (`registerMemberAction`), THE Membership_System SHALL record the join fee as a Membership_History entry and a Payment_Record, and SHALL NOT record the join fee on a `t_booking` row.
2. WHEN a plan is assigned through the booking quick-add-member modal, THE Membership_System SHALL use the same membership-assignment and payment logic as the staff Membership_Menu (writing Membership_History and a Payment_Record).
3. WHEN a plan is assigned through the manual assign action (`assignMemberPlanAction`), THE Membership_System SHALL write a Membership_History entry consistent with Requirement 5 and, where a join fee is collected, a Payment_Record.
4. WHEN registration includes both a plan assignment and court bookings in one Checkout, THE PadelHub_System SHALL apply the plan-before-court ordering and single-transaction rules of Requirement 12.
5. THE PadelHub_System SHALL no longer populate the `t_booking.joinFee` field for new membership join fees; the existing field MAY remain for backward compatibility but SHALL NOT be the system of record for join fees.
