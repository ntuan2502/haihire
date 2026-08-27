import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./db.ts";

const defaultPasswordHash = bcrypt.hashSync("password123", 10);

const singleDemoUser = {
  email: "demo@tun.io.vn",
  name: "Demo Recruiter",
  role: "HR" as const,
  password: defaultPasswordHash,
  organizationId: null,
};

let pendingSeed: Promise<void> | undefined;

async function runSeed(): Promise<void> {
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

  await db.orm.public.Job.all().then((jobs) =>
    Promise.all(jobs.map((j) => db.orm.public.Job.where((x) => x.id.eq(j.id)).delete())),
  );

  await db.orm.public.User.all().then((users) =>
    Promise.all(users.map((u) => db.orm.public.User.where((x) => x.id.eq(u.id)).delete())),
  );

  await db.orm.public.Organization.all().then((orgs) =>
    Promise.all(orgs.map((o) => db.orm.public.Organization.where((x) => x.id.eq(o.id)).delete())),
  );

  // 2. Seed ONLY the single demo user: demo@tun.io.vn
  console.log("Seeding single demo user: demo@tun.io.vn ...");
  await db.orm.public.User.upsert({
    create: singleDemoUser,
    update: {
      password: singleDemoUser.password,
      name: singleDemoUser.name,
      role: singleDemoUser.role,
      organizationId: null,
    },
    conflictOn: { email: singleDemoUser.email },
  });

  console.log("Database reset & single user seed completed!");
}

export function seed(): Promise<void> {
  pendingSeed ??= runSeed().catch((error: unknown) => {
    pendingSeed = undefined;
    throw error;
  });
  return pendingSeed;
}
