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
