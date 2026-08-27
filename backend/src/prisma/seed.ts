import { connectDatabase, db } from "./db.ts";

const users = [
  { email: "hr@ats.com", name: "HR Manager", role: "HR" as const },
  { email: "admin@ats.com", name: "Admin User", role: "ADMIN" as const },
  { email: "candidate@gmail.com", name: "John Doe", role: "CANDIDATE" as const },
];

let pendingSeed: Promise<void> | undefined;

async function runSeed(): Promise<void> {
  await connectDatabase();

  for (const user of users) {
    await db.orm.public.User.upsert({
      create: user,
      update: {},
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
