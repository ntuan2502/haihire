export const DEMO_SEED_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD || "dev-seed-password-2026";
export const DEMO_PASSWORD = DEMO_SEED_PASSWORD;

export const DEMO_ACCOUNTS = {
  ADMIN: {
    email: "admin@tun.io.vn",
    name: "Admin",
    role: "ADMIN" as const,
    badge: "Admin",
    description: "Full management access (Add, edit, delete)",
  },
  MEMBER: {
    email: "member@tun.io.vn",
    name: "Member",
    role: "MEMBER" as const,
    badge: "Member",
    description: "Read-only access (Cannot add, edit, or delete)",
  },
} as const;
