// Seed: master (roles, permissions, version, tenant registry) + tenant (users).
// Run: npm run db:seed
import * as bcrypt from "bcryptjs";
import { PrismaClient as MasterClient } from "@prisma/master-client";
import { PrismaClient as TenantClient } from "@prisma/tenant-client";

const master = new MasterClient();
const tenant = new TenantClient();

const COMPANY_ID = (process.env.CUSTOM_TENANT_COMPANY_ID || "smashcourt").toLowerCase();
const DEFAULT_PASSWORD = "password123";

type RoleSeed = {
  key: string;
  name: string;
  scope: string;
  level: number;
  perms: string[] | ["*"];
};

const PERMISSIONS: { key: string; name: string; group: string }[] = [
  { key: "platform.view", name: "View platform dashboard", group: "Platform" },
  { key: "tenants.manage", name: "Manage tenants", group: "Platform" },
  { key: "plans.manage", name: "Manage plans", group: "Platform" },
  { key: "access.manage", name: "Manage RBAC", group: "Platform" },
  { key: "dashboard.view", name: "View club dashboard", group: "Club" },
  { key: "booking.view", name: "View bookings", group: "Bookings" },
  { key: "booking.create", name: "Create bookings", group: "Bookings" },
  { key: "booking.cancel", name: "Cancel bookings", group: "Bookings" },
  { key: "courts.manage", name: "Manage courts", group: "Courts" },
  { key: "members.view", name: "View members", group: "Members" },
  { key: "members.create", name: "Create members", group: "Members" },
  { key: "coaching.view", name: "View coaching", group: "Coaching" },
  { key: "coaching.manage", name: "Manage coaching", group: "Coaching" },
  { key: "matches.view", name: "View matches", group: "Matches" },
  { key: "matches.manage", name: "Manage matches", group: "Matches" },
  { key: "pos.create", name: "Create POS sale", group: "POS" },
  { key: "finance.view", name: "View finance", group: "Finance" },
  { key: "marketing.manage", name: "Manage marketing", group: "Marketing" },
  { key: "settings.manage", name: "Manage club settings", group: "Settings" },
  { key: "staff.manage", name: "Manage staff & roles", group: "Settings" },
  { key: "me.view", name: "View own portal", group: "Member" },
  { key: "me.book", name: "Book a court", group: "Member" },
  { key: "me.membership", name: "View membership & wallet", group: "Member" },
];

const ROLES: RoleSeed[] = [
  { key: "superadmin", name: "Super Admin", scope: "platform", level: 1, perms: ["*"] },
  { key: "owner", name: "Club Owner", scope: "club", level: 1, perms: ["*"] },
  {
    key: "staff",
    name: "Front Desk Staff",
    scope: "club",
    level: 3,
    perms: [
      "dashboard.view",
      "booking.view",
      "booking.create",
      "booking.cancel",
      "members.view",
      "members.create",
      "coaching.view",
      "matches.view",
      "pos.create",
      "marketing.manage",
    ],
  },
  {
    key: "coach",
    name: "Coach",
    scope: "club",
    level: 3,
    perms: [
      "dashboard.view",
      "booking.view",
      "coaching.view",
      "coaching.manage",
      "matches.view",
      "matches.manage",
      "members.view",
    ],
  },
  {
    key: "member",
    name: "Member",
    scope: "member",
    level: 5,
    perms: ["me.view", "me.book", "me.membership"],
  },
];

const USERS: { userId: string; name: string; roleKey: string; email: string }[] = [
  { userId: "superadmin", name: "Nadia Platform", roleKey: "superadmin", email: "ops@padelhub.io" },
  { userId: "owner", name: "Raka Pradana", roleKey: "owner", email: "owner@smashcourt.id" },
  { userId: "staff", name: "Budi Santoso", roleKey: "staff", email: "frontdesk@smashcourt.id" },
  { userId: "coach", name: "Dimas Pratama", roleKey: "coach", email: "dimas@smashcourt.id" },
];

async function seedMaster() {
  console.log("→ Seeding master: permissions");
  const permByKey: Record<string, string> = {};
  for (const p of PERMISSIONS) {
    const row = await master.m_permission.upsert({
      where: { key: p.key },
      update: { name: p.name, groupName: p.group },
      create: { key: p.key, name: p.name, groupName: p.group },
    });
    permByKey[p.key] = row.id;
  }

  console.log("→ Seeding master: roles + role_permissions");
  for (const r of ROLES) {
    const role = await master.m_role.upsert({
      where: { key: r.key },
      update: { name: r.name, scope: r.scope, level: r.level, isSystem: true, createdBy: "seed", updatedBy: "seed" },
      create: { key: r.key, name: r.name, scope: r.scope, level: r.level, isSystem: true, createdBy: "seed" },
    });
    // reset mappings then re-add
    await master.m_role_permission.deleteMany({ where: { roleId: role.id } });
    const keys = r.perms[0] === "*" ? PERMISSIONS.map((p) => p.key) : (r.perms as string[]);
    for (const k of keys) {
      const pid = permByKey[k];
      if (!pid) continue;
      await master.m_role_permission.create({
        data: { roleId: role.id, permissionId: pid, createdBy: "seed" },
      });
    }
  }

  console.log("→ Seeding master: version");
  const existingVersion = await master.m_version.findFirst({ where: { versionName: "v1" } });
  if (!existingVersion) {
    await master.m_version.create({
      data: { versionName: "v1", isActive: true, description: "Initial custom-mode release" },
    });
  }

  console.log("→ Seeding master: tenant registry");
  const dbHost = process.env.SEED_TENANT_DB_HOST || "localhost";
  const dbPort = Number(process.env.SEED_TENANT_DB_PORT || 5432);
  const dbName = process.env.SEED_TENANT_DB_NAME || "padel_tenant_smashcourt";
  const dbUsername = process.env.SEED_TENANT_DB_USER || "postgres";
  const dbPassword = process.env.SEED_TENANT_DB_PASS || "postgres";
  await master.m_tenant.upsert({
    where: { companyId: COMPANY_ID },
    update: { dbHost, dbPort, dbName, dbUsername, dbPassword, status: "active", mode: "custom" },
    create: {
      companyId: COMPANY_ID,
      name: "SmashCourt Padel Club",
      slug: "smashcourt",
      mode: "custom",
      status: "active",
      dbHost,
      dbPort,
      dbName,
      dbUsername,
      dbPassword,
    },
  });
}

async function seedTenant() {
  console.log("→ Seeding tenant: users");
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  for (const u of USERS) {
    await tenant.m_user.upsert({
      where: { companyId_userId: { companyId: COMPANY_ID, userId: u.userId } },
      update: { passwordHash, roleKey: u.roleKey, namalengkap: u.name, email: u.email, isActive: true, isDeleted: 0, updatedBy: "seed" },
      create: {
        companyId: COMPANY_ID,
        userId: u.userId,
        passwordHash,
        roleKey: u.roleKey,
        namalengkap: u.name,
        email: u.email,
        createdBy: "seed",
      },
    });
  }

  console.log("→ Seeding tenant: operating hours");
  const defaultHours = [
    { day: 0, open: true, openStart: 7, openEnd: 22 }, // Sun
    { day: 1, open: true, openStart: 7, openEnd: 23 }, // Mon
    { day: 2, open: true, openStart: 7, openEnd: 23 }, // Tue
    { day: 3, open: true, openStart: 7, openEnd: 23 }, // Wed
    { day: 4, open: true, openStart: 7, openEnd: 23 }, // Thu
    { day: 5, open: true, openStart: 7, openEnd: 24 }, // Fri
    { day: 6, open: true, openStart: 6, openEnd: 24 }, // Sat
  ];
  for (const h of defaultHours) {
    await tenant.m_operating_hours.upsert({
      where: { companyId_day: { companyId: COMPANY_ID, day: h.day } },
      update: { open: h.open, openStart: h.openStart, openEnd: h.openEnd, updatedBy: "seed" },
      create: { companyId: COMPANY_ID, ...h, createdBy: "seed" },
    });
  }

  console.log("→ Seeding tenant: courts");
  // Helper: generate 48-slot schedule (30-min storage resolution).
  // All slots "regular" within operating window, "closed" outside.
  const makeSchedule = (openStart: number, openEnd: number) => {
    const slots: string[] = [];
    for (let slot = 0; slot < 48; slot++) {
      const hour = Math.floor((slot * 30) / 60);
      if (hour >= openStart && hour < openEnd) slots.push("regular");
      else slots.push("closed");
    }
    return slots;
  };

  const sampleCourts = [
    {
      name: "Court 1 - Premium Indoor",
      environment: "indoor",
      wall: "glass",
      format: "double",
      status: "active",
      priceOffPeak: 150000,
      pricePeak: 250000,
      color: "#6D5BFF",
      note: "Lapangan indoor premium dengan dinding kaca panoramik.",
      schedule: defaultHours.map((h) => ({
        day: h.day,
        available: h.open,
        slots: makeSchedule(h.openStart, h.openEnd),
      })),
    },
    {
      name: "Court 2 - Outdoor",
      environment: "outdoor",
      wall: "mesh",
      format: "double",
      status: "active",
      priceOffPeak: 100000,
      pricePeak: 180000,
      color: "#10B981",
      note: "Lapangan outdoor dengan mesh steel, cocok untuk latihan.",
      schedule: defaultHours.map((h) => ({
        day: h.day,
        available: h.open,
        slots: makeSchedule(h.openStart, h.openEnd),
      })),
    },
    {
      name: "Court 3 - Indoor",
      environment: "indoor",
      wall: "glass",
      format: "double",
      status: "active",
      priceOffPeak: 150000,
      pricePeak: 250000,
      color: "#F59E0B",
      note: null,
      schedule: defaultHours.map((h) => ({
        day: h.day,
        available: h.open,
        slots: makeSchedule(h.openStart, h.openEnd),
      })),
    },
  ];

  for (const c of sampleCourts) {
    const existing = await tenant.m_court.findFirst({
      where: { companyId: COMPANY_ID, name: c.name, isDeleted: 0 },
    });
    if (!existing) {
      await tenant.m_court.create({
        data: {
          companyId: COMPANY_ID,
          name: c.name,
          environment: c.environment,
          wall: c.wall,
          format: c.format,
          status: c.status,
          priceOffPeak: c.priceOffPeak,
          pricePeak: c.pricePeak,
          color: c.color,
          note: c.note,
          schedule: c.schedule as any, // Prisma Json
          createdBy: "seed",
        },
      });
    }
  }

  console.log("→ Seeding tenant: sample member");
  const memberPasswordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const sampleMember = {
    memberNo: "PHB-2026-0001",
    username: "andi",
    name: "Andi Wijaya",
    phone: "+62 813 1000 2001",
    email: "andi@email.com",
  };
  const existingMember = await tenant.t_member.findFirst({
    where: { companyId: COMPANY_ID, username: sampleMember.username },
  });
  if (!existingMember) {
    await tenant.t_member.create({
      data: {
        companyId: COMPANY_ID,
        memberNo: sampleMember.memberNo,
        username: sampleMember.username,
        passwordHash: memberPasswordHash,
        name: sampleMember.name,
        phone: sampleMember.phone,
        email: sampleMember.email,
        createdBy: "seed",
      },
    });
  }

  console.log("→ Seeding tenant: membership plans");
  const samplePlans = [
    {
      name: "Pro",
      color: "#6D5BFF",
      priceMonthly: 450_000,
      joinFee: 450_000,
      includedCourtBookings: 4,
      resetPeriodDays: 30,
      freeCoaching: 2,
      courtDiscountPct: 15,
      perks: [
        "4x booking lapangan gratis / siklus",
        "2x coaching gratis / siklus",
        "15% off booking setelah kuota habis",
      ],
      active: true,
      highlighted: true,
      sortOrder: 0,
    },
    {
      name: "Elite",
      color: "#14B8A6",
      priceMonthly: 850_000,
      joinFee: 850_000,
      includedCourtBookings: 8,
      resetPeriodDays: 30,
      freeCoaching: 8,
      courtDiscountPct: 30,
      perks: [
        "8x booking lapangan gratis / siklus",
        "8x coaching gratis / siklus",
        "30% off booking setelah kuota habis",
        "Locker pribadi",
      ],
      active: true,
      highlighted: false,
      sortOrder: 1,
    },
  ];
  for (const p of samplePlans) {
    const exists = await tenant.m_membership_plan.findFirst({
      where: { companyId: COMPANY_ID, name: p.name, isDeleted: 0 },
    });
    if (!exists) {
      await tenant.m_membership_plan.create({
        data: { companyId: COMPANY_ID, ...p, perks: p.perks as object, createdBy: "seed" },
      });
    }
  }
}

async function main() {
  await seedMaster();
  await seedTenant();
  console.log("\n✅ Seed complete.");
  console.log(`   Company: ${COMPANY_ID}`);
  console.log(`   Users:   ${USERS.map((u) => u.userId).join(", ")}`);
  console.log(`   Password (all): ${DEFAULT_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await master.$disconnect();
    await tenant.$disconnect();
  });
