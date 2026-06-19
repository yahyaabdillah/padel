# Implementation Plan

## Overview

Implementation lands the data layer first (two new tables + `t_booking` link +
reseed), then the shared checkout core that every surface depends on, then the
server actions, then the UI (staff membership, member membership, member
multi-session booking), and finally the consistency refactor of the three
existing plan-assignment entry points. RBAC/menu changes are bundled with the
data layer so guards exist before the actions that need them. Verification is
typecheck + manual smoke + temp `diag.ts` (no auto-tests, per project rule).

## Task Dependency Graph

```
1 (schema+migrate) ─┬─> 2 (reset-transactional)
                    ├─> 3 (menu catalog + reseed)
                    └─> 4 (checkout-core) ─┬─> 5 (member booking actions)
                                           ├─> 6 (member membership actions)
                                           ├─> 7 (staff membership actions)
                                           └─> 11 (consistency refactor)
5 ──> 8 (member /me/book multi-session UI)
6 ──> 9 (member /me/membership UI)
7 ──> 10 (staff membership pages + Kelola Membership button)
3,4,5,6,7,8,9,10,11 ──> 12 (verify: typecheck + smoke + diag)
```

Critical path: 1 → 4 → (5,6,7) → (8,9,10) → 11 → 12.

```json
{
  "waves": [
    { "wave": 1, "tasks": ["1", "2", "3"] },
    { "wave": 2, "tasks": ["4"] },
    { "wave": 3, "tasks": ["5", "6", "7", "11"] },
    { "wave": 4, "tasks": ["8", "9", "10"] },
    { "wave": 5, "tasks": ["12"] }
  ]
}
```

## Tasks

- [x] 1. Add Prisma models and migrate
  - Add `t_payment` (paymentRef, method, amount + membershipAmount/courtAmount, status incl. `cancelled`/`refunded`/`pending`/`failed`, paidByType, cashReceived/cashChange, provider/externalId/paidAt placeholders, audit + soft delete) and `t_membership_history` (memberId, planId+planName snapshot, action, previousPlan snapshot, joinFee, method, paymentId, actorType, cycleStart, audit + soft delete) to `prisma/tenant.prisma`.
  - Add `t_booking.paymentId` + relation to `t_payment`; keep `joinFee` for back-compat. Add back-relations `t_member.membershipHistory`, `m_membership_plan.membershipHistory`, and `t_payment.bookings`/`histories`.
  - Stop node (`Stop-Process -Name node -Force`), `npx prisma db push --schema=prisma/tenant.prisma --skip-generate`, then regenerate tenant + master clients.
  - _Requirements: 5.1, 6.1, 9.1, 11.1, 11.3, 12.3, 12.4, 12.8_

- [x] 2. Extend reset-transactional
  - Update `prisma/reset-transactional.ts` to truncate `t_membership_history` and `t_payment` in FK-safe order: `t_checkin` → `t_membership_history` → `t_booking_detail` → `t_booking` → `t_payment` → coaching → `t_court_maintenance` → `t_member`.
  - _Requirements: 11.3_

- [x] 3. Menu catalog + RBAC grants
  - Add staff menu `members.membership` (label "Membership", under Manage Member group) granted to owner + staff. Ensure `portal.membership` grants member `view`+`create`, and `portal.bookings` grants member `cancel`.
  - Reseed (`npm run db:seed`); verify grants in `m_role_menu` via temp diag.
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 4. Shared checkout core `src/lib/checkout-core.ts`
  - [x] 4.1 `genPaymentRef`, `resolveMemberBenefit` (cycle rollover), and `recordPayment` (writes one `t_payment`, computes change, status `paid`).
    - _Requirements: 12.3, 12.4, 9.2_
  - [x] 4.2 `applyMembershipAction(tx, …)` — assign/extend/upgrade: update `t_member` (planId/cycleStart/quotaUsed/coachingUsed/tier per action), write `t_membership_history` with snapshots; never write `t_booking.joinFee`. Keep `planId`/`tier` when an action is not requested (no silent revert to daily).
    - _Requirements: 5.1, 6.1, 6.2, 7.4, 7.5, 7.6, 8.3, 9.1, 13.5_
  - [x] 4.3 `runCheckout(args)` — single `db.$transaction`: validate method (member→non-cash, staff→any), apply membership FIRST, re-resolve benefit (cycle rollover; quota-exhausted → discount; no-plan → full rate), price + persist bookings via `calcMembershipBenefit` with overlap guard, enforce cash ≥ total (staff cash), record one payment, link `paymentId` on history/booking, return totals + change. Roll back fully on any error.
    - _Requirements: 1.1–1.8, 2.2, 8.1, 8.2, 8.4, 8.5, 12.1, 12.2, 12.5, 12.6, 12.7_

- [x] 5. Member booking actions `src/app/(admin)/me/book/actions.ts`
  - [x] 5.1 Convert `createMyBookingAction` to accept multiple sessions and route through `runCheckout` (non-cash, status confirmed, quota increment, overlap rejection, empty rejection).
    - _Requirements: 1.1–1.8, 2.2, 2.3, 2.4, 2.5_
  - [x] 5.2 Add `previewMyBookingAction(input)` returning subtotal/quota savings/discount savings/payable without persisting.
    - _Requirements: 2.1_
  - [x] 5.3 Add `cancelMyBookingAction(detailId)` — `requirePermission("portal.bookings","cancel")`; own + future + not-already-cancelled; set `cancelled`, restore quota (−1, floor 0), free slot; no refund.
    - _Requirements: 3.1–3.8_

- [x] 6. Member membership actions `src/app/(admin)/me/membership/actions.ts`
  - `getMyMembershipAction` (current plan, quota, reset date, active plans, own history), `buyMyMembershipAction`, `extendMyMembershipAction`, `upgradeMyMembershipAction` — all member-session + `requirePermission("portal.membership", …)`, own-account-only, non-cash, via `runCheckout`/core; write history + payment.
  - _Requirements: 7.1–7.12, 9.3, 10.4, 10.6_

- [x] 7. Staff membership actions `src/app/(admin)/members/membership/actions.ts`
  - `getMembershipMembersAction(q)`, `getMembershipOverviewAction(memberId)` (summary + plan + history), `assignPlanStaffAction`, `extendPlanStaffAction`, `upgradePlanStaffAction` — guarded by `members.membership` (create/update); accept Cash or non-cash; cash ≥ total; via core.
  - _Requirements: 5.1–5.7, 6.1–6.8, 9.1, 9.2, 12.5_

- [x] 8. Member booking UI `/me/book` (multi-session)
  - Cart of selected slots + combined `calcMembershipBenefit` preview (`previewMyBookingAction`), time-group labels on the hour axis, non-cash method selection, confirm → `createMyBookingAction`. Reuse existing `components/ui`; flag if a new primitive is needed.
  - _Requirements: 1.1–1.8, 2.1–2.5, 4.1–4.7_

- [x] 9. Member membership UI `/me/membership` (DB-backed)
  - Replace mock. Status card (current plan, quota, reset) or daily/walk-in state; active-plan list as cards with Buy/Extend/Upgrade per current state; own membership history list; remove wallet panel. `canViewMenu("portal.membership")` guard.
  - _Requirements: 7.1, 7.2, 7.3, 9.3, 10.1_

- [x] 10. Staff membership pages + Data Member entry
  - Membership landing (searchable member list) + detail (current plan, quota, history, Assign/Extend/Upgrade with method + cash received/change), guarded by `canViewMenu("members.membership")`. Add "Kelola Membership" button on Data Member (`/members`) navigating to the membership detail.
  - _Requirements: 5.x, 6.x, 9.2, 10.1, 10.3_

- [x] 11. Consistency refactor of existing plan-assignment flows
  - Route `registerMemberAction` (with plan) and the booking quick-add-member modal through `runCheckout`/`applyMembershipAction` (history + payment, no `t_booking.joinFee`). Update `assignMemberPlanAction` (MemberDetailDrawer) to write history (+ payment when a fee is collected), keeping its `members.data` update guard.
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 12. Verify
  - Clear `.next/dev/types`; `npx tsc --noEmit --pretty false`; fresh dev restart; manual smoke per the design Testing Strategy (member single/multi booking, cancel, buy/extend/upgrade member & staff, combined checkout atomicity + plan-before-court, consistency of the 3 legacy flows). Inspect `t_payment` / `t_membership_history` / `t_member` with a temp `diag.ts`, then delete it. Confirm reset-transactional clears the new tables.
  - _Requirements: 1.5, 3.4, 8.3, 9.5, 11.4, 12.1, 12.2, 13.5_

## Notes

- All mutation actions MUST call `requirePermission(menuKey, action)`; all gated
  pages MUST call `canViewMenu(menuKey)`. The shared core does NOT guard — the
  calling action guards first, then invokes the core. Member actions also assert
  own-account (`memberId === session.id`).
- Prisma engine DLL is locked by the dev server: `Stop-Process -Name node
  -Force` before `prisma db push` / `generate`.
- Clear `.next/dev/types` before typecheck to avoid phantom errors; do a true
  fresh dev restart after deleting `.next`.
- No payment gateway in this feature: `t_payment.status` is always `paid`; the
  `cancelled`/`refunded`/`pending`/`failed` values + provider fields exist only
  to make the future gateway spec additive.
- Reuse `components/ui` and `club-core` (`Stepper`, `Drawer`,
  `MemberDetailDrawer`, `Card`, `ModalDialog`, etc.). If a primitive is missing,
  pause and ask the user before creating a new one.
- Tests are NOT auto-added; verification is typecheck + build + manual smoke +
  temp `diag.ts` DB inspection.
