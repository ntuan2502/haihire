export const BCRYPT_SALT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 10;

export const DEMO_SEED_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD ||
  process.env.DEMO_SEED_PASSWORD ||
  "";
export const DEMO_PASSWORD = DEMO_SEED_PASSWORD;

export const DEMO_ACCOUNTS = {
  ADMIN: {
    email: "admin@tun.io.vn",
    firstName: "Demo",
    lastName: "Admin",
    name: "Demo Admin",
    role: "ADMIN" as const,
  },
  MEMBER: {
    email: "member@tun.io.vn",
    firstName: "Demo",
    lastName: "Member",
    name: "Demo Member",
    role: "MEMBER" as const,
  },
  BETA_ADMIN: {
    email: "admin@beta.test",
    firstName: "Beta",
    lastName: "Admin",
    name: "Beta Admin",
    role: "ADMIN" as const,
  },
} as const;
