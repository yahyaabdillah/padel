// Reset TRANSACTIONAL data only — wipes t_* tables for a clean operational slate
// while keeping all MASTER/config tables (m_user, m_court, m_operating_hours,
// m_membership_plan) intact.
//
// Run: npm run db:reset-transactional
//
// Wiped (in FK-safe order): t_booking_detail → t_booking → t_court_maintenance
//                           → t_member
// Kept: m_user, m_court, m_operating_hours, m_membership_plan (and the master DB)

import { PrismaClient as TenantClient } from "@prisma/tenant-client";

const tenant = new TenantClient();

async function main() {
  console.log("→ Resetting transactional tables (t_*) …");

  // Child-first to respect foreign keys.
  const detail = await tenant.t_booking_detail.deleteMany({});
  console.log(`   t_booking_detail:    ${detail.count} removed`);

  const booking = await tenant.t_booking.deleteMany({});
  console.log(`   t_booking:           ${booking.count} removed`);

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
