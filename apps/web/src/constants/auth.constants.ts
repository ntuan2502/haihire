let warnedMissingDemoPassword = false;

export const DEMO_SEED_PASSWORD =
  process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD || "";
export const DEMO_PASSWORD = DEMO_SEED_PASSWORD;

/**
 * Double gate for demo login:
 * 1. NEXT_PUBLIC_ENABLE_DEMO_LOGIN must be strictly "true"
 * 2. NODE_ENV must NOT be "production"
 * 3. NEXT_PUBLIC_DEMO_SEED_PASSWORD must be defined and non-empty
 */
export const isDemoLoginEnabled = (): boolean => {
  const isEnabledFlag = process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";
  const isNotProduction = process.env.NODE_ENV !== "production";
  const hasPassword = Boolean(process.env.NEXT_PUBLIC_DEMO_SEED_PASSWORD);

  if (isEnabledFlag && isNotProduction && !hasPassword) {
    if (!warnedMissingDemoPassword) {
      console.warn(
        "[Auth] NEXT_PUBLIC_DEMO_SEED_PASSWORD is not set. Demo login form is disabled.",
      );
      warnedMissingDemoPassword = true;
    }
    return false;
  }

  return isEnabledFlag && isNotProduction && hasPassword;
};

export const resetWarnedMissingDemoPassword = (): void => {
  warnedMissingDemoPassword = false;
};

export const DEMO_ACCOUNTS = {
  ADMIN: {
    email: "admin@tun.io.vn",
    firstName: "Demo",
    lastName: "Admin",
    name: "Demo Admin",
    initials: "AD",
    role: "ADMIN" as const,
    badge: "Super Admin",
    description: "ADMIN across all 4 organizations (demo-1..demo-4)",
  },
  ADMIN_1: {
    email: "admin1@tun.io.vn",
    firstName: "Admin 1",
    lastName: "Demo",
    name: "Demo Admin 1",
    initials: "A1",
    role: "ADMIN" as const,
    badge: "Demo 1",
    description: "Owner demo-1 • RECRUITER/HM/IV in 2..4",
  },
  ADMIN_2: {
    email: "admin2@tun.io.vn",
    firstName: "Admin 2",
    lastName: "Demo",
    name: "Demo Admin 2",
    initials: "A2",
    role: "ADMIN" as const,
    badge: "Demo 2",
    description: "Owner demo-2 • HM/IV/MEMBER in 1,3,4",
  },
  ADMIN_3: {
    email: "admin3@tun.io.vn",
    firstName: "Admin 3",
    lastName: "Demo",
    name: "Demo Admin 3",
    initials: "A3",
    role: "ADMIN" as const,
    badge: "Demo 3",
    description: "Owner demo-3 • IV/MEMBER/REC in 1,2,4",
  },
  ADMIN_4: {
    email: "admin4@tun.io.vn",
    firstName: "Admin 4",
    lastName: "Demo",
    name: "Demo Admin 4",
    initials: "A4",
    role: "ADMIN" as const,
    badge: "Demo 4",
    description: "Owner demo-4 • MEMBER/HM/REC in 1..3",
  },
} as const;
