import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "./db.ts";

const defaultPasswordHash = bcrypt.hashSync("password123", 10);

const users = [
  {
    email: "hr@tun.io.vn",
    name: "HR Lead / Recruiter",
    role: "HR" as const,
    password: defaultPasswordHash,
  },
  {
    email: "admin@tun.io.vn",
    name: "Talent Acquisition Admin",
    role: "ADMIN" as const,
    password: defaultPasswordHash,
  },
  {
    email: "interviewer@tun.io.vn",
    name: "Technical Interviewer",
    role: "INTERVIEWER" as const,
    password: defaultPasswordHash,
  },
  {
    email: "candidate@gmail.com",
    name: "John Doe",
    role: "CANDIDATE" as const,
    password: defaultPasswordHash,
  },
];

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

  for (const user of users) {
    await db.orm.public.User.upsert({
      create: user,
      update: {
        password: user.password,
        name: user.name,
        role: user.role,
      },
      conflictOn: { email: user.email },
    });
  }
}

export function seed(): Promise<void> {
  pendingSeed ??= runSeed().catch((error: unknown) => {
    pendingSeed = undefined;
    throw error;
  });
  return pendingSeed;
}
