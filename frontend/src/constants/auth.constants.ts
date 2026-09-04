export const DEMO_PASSWORD = "password123";

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
