export const DEMO_PASSWORD = "password123";

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
} as const;
