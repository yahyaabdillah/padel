// Reset TRANSACTIONAL data only — wipes t_* tables for a clean operational slate
// while keeping all MASTER/config tables (m_user, m_court, m_operating_hours,
// m_membership_plan) intact.
//
// Run: npm run db:reset-transactional
//
// Wiped (in FK-safe order): t_checkin → t_membership_history →
//                           t_coaching_session → t_coaching_schedule →
//                           t_booking_detail → t_booking → t_payment →
//                           t_court_maintenance → t_member
// Kept: m_user, m_court, m_operating_hours, m_membership_plan, m_coach,
//       m_coach_package (and the master DB)

import { PrismaClient as TenantClient } from "@prisma/tenant-client";

const tenant = new TenantClient();

async function main() {
  console.log("→ Resetting transactional tables (t_*) …");

  // Child-first to respect foreign keys.
  const checkin = await tenant.t_checkin.deleteMany({});
  console.log(`   t_checkin:           ${checkin.count} removed`);

  const membershipHistory = await tenant.t_membership_history.deleteMany({});
  console.log(`   t_membership_history:${membershipHistory.count} removed`);

  const coachingSession = await tenant.t_coaching_session.deleteMany({});
  console.log(`   t_coaching_session:  ${coachingSession.count} removed`);

  const coachingSchedule = await tenant.t_coaching_schedule.deleteMany({});
  console.log(`   t_coaching_schedule: ${coachingSchedule.count} removed`);

  const refund = await tenant.t_refund.deleteMany({});
  console.log(`   t_refund:            ${refund.count} removed`);

  const detail = await tenant.t_booking_detail.deleteMany({});
  console.log(`   t_booking_detail:    ${detail.count} removed`);

  const booking = await tenant.t_booking.deleteMany({});
  console.log(`   t_booking:           ${booking.count} removed`);

  const posItems = await tenant.t_pos_sale_item.deleteMany({});
  console.log(`   t_pos_sale_item:     ${posItems.count} removed`);

  const posSales = await tenant.t_pos_sale.deleteMany({});
  console.log(`   t_pos_sale:          ${posSales.count} removed`);

  const payment = await tenant.t_payment.deleteMany({});
  console.log(`   t_payment:           ${payment.count} removed`);

  const maint = await tenant.t_court_maintenance.deleteMany({});
  console.log(`   t_court_maintenance: ${maint.count} removed`);

  const member = await tenant.t_member.deleteMany({});
  console.log(`   t_member:            ${member.count} removed`);

  console.log("\n✅ Transactional data cleared. Master/config tables kept.");
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await tenant.$disconnect();
  });
