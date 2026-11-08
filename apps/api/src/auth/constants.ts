export const DEMO_SEED_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
  process.env.DEMO_SEED_PASSWORD ||
  "";
export const DEMO_PASSWORD = DEMO_SEED_PASSWORD;

export const DEMO_ACCOUNTS = {
  ADMIN: {
    email: "admin@tun.io.vn",
    name: "Admin",
    role: "ADMIN" as const,
  },
  MEMBER: {
    email: "member@tun.io.vn",
    name: "Member",
    role: "MEMBER" as const,
  },
  BETA_ADMIN: {
    email: "admin@beta.test",
    name: "Beta Admin",
    role: "ADMIN" as const,
  },
} as const;
