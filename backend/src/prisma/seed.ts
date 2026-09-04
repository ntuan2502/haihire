import "dotenv/config";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db.ts";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../constants/auth.constants.ts";

const defaultPasswordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);

let pendingSeed: Promise<void> | undefined;

export async function runSeed(): Promise<void> {
  const dbUrl =
    process.env.DATABASE_URL ||
    "postgresql://ats_user:ats_password@localhost:5432/ats_db?schema=public";

  try {
    await db.connect({ url: dbUrl });
  } catch {
    // already connected or composer client
  }

  // 1. Clean all existing tables to guarantee 100% fresh start
  console.log("Cleaning old database records...");
  await db.orm.public.Application.all().then((apps) =>
    Promise.all(apps.map((a) => db.orm.public.Application.where((x) => x.id.eq(a.id)).delete())),
  );

  await db.orm.public.InviteLink.all().then((links) =>
    Promise.all(links.map((l) => db.orm.public.InviteLink.where((x) => x.id.eq(l.id)).delete())),
  );

  await db.orm.public.Job.all().then((jobs) =>
    Promise.all(jobs.map((j) => db.orm.public.Job.where((x) => x.id.eq(j.id)).delete())),
  );

  await db.orm.public.User.all().then((users) =>
    Promise.all(users.map((u) => db.orm.public.User.where((x) => x.id.eq(u.id)).delete())),
  );

  await db.orm.public.Organization.all().then((orgs) =>
    Promise.all(orgs.map((o) => db.orm.public.Organization.where((x) => x.id.eq(o.id)).delete())),
  );

  // 2. Seed Org Admin and Demo Users
  console.log("Seeding default data...");
  const adminUserId = crypto.randomUUID();
  const adminOrgId = crypto.randomUUID();
  const memberUserId = crypto.randomUUID();

  // Create Org "Admin"
  await db.orm.public.Organization.upsert({
    create: {
      id: adminOrgId,
      name: "Admin",
      slug: "admin",
      inviteCode: "ORG-ADMIN-8888",
      ownerId: adminUserId,
    },
    update: {
      name: "Admin",
      ownerId: adminUserId,
    },
    conflictOn: { slug: "admin" },
  });

  // Create Admin User (assigned to Org Admin)
  await db.orm.public.User.upsert({
    create: {
      id: adminUserId,
      email: DEMO_ACCOUNTS.ADMIN.email,
      name: DEMO_ACCOUNTS.ADMIN.name,
      role: DEMO_ACCOUNTS.ADMIN.role,
      password: defaultPasswordHash,
      organizationId: adminOrgId,
    },
    update: {
      password: defaultPasswordHash,
      name: DEMO_ACCOUNTS.ADMIN.name,
      role: DEMO_ACCOUNTS.ADMIN.role,
      organizationId: adminOrgId,
    },
    conflictOn: { email: DEMO_ACCOUNTS.ADMIN.email },
  });

  // Create Member User (no org assigned)
  await db.orm.public.User.upsert({
    create: {
      id: memberUserId,
      email: DEMO_ACCOUNTS.MEMBER.email,
      name: DEMO_ACCOUNTS.MEMBER.name,
      role: DEMO_ACCOUNTS.MEMBER.role,
      password: defaultPasswordHash,
      organizationId: null,
    },
    update: {
      password: defaultPasswordHash,
      name: DEMO_ACCOUNTS.MEMBER.name,
      role: DEMO_ACCOUNTS.MEMBER.role,
      organizationId: null,
    },
    conflictOn: { email: DEMO_ACCOUNTS.MEMBER.email },
  });

  console.log("Database reset & seed completed successfully!");
  console.log(`- Org: Admin (id: ${adminOrgId}, slug: admin, owner: ${DEMO_ACCOUNTS.ADMIN.email})`);
  console.log(`- User: ${DEMO_ACCOUNTS.ADMIN.email} (ADMIN, Org: Admin)`);
  console.log(`- User: ${DEMO_ACCOUNTS.MEMBER.email} (MEMBER, Org: None)`);
}

export function seed(): Promise<void> {
  pendingSeed ??= runSeed().catch((error: unknown) => {
    pendingSeed = undefined;
    throw error;
  });
  return pendingSeed;
}

if (process.argv[1] && process.argv[1].includes("seed")) {
  seed()
    .then(() => {
      console.log("Seed script finished successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
