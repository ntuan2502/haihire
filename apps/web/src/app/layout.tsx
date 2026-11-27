import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist } from "next/font/google";
import {
  ThemeProvider,
  QueryProvider,
  LocalizationProvider,
  ToastProvider,
} from "@/components/providers";
import { AuthProvider } from "@/context/auth-context";
import { SkipToContent } from "@/components/layout";
import { env } from "@/lib/env";
import {
  THEME_COOKIE_KEY,
  RESOLVED_THEME_COOKIE_KEY,
  type ThemeMode,
} from "@/lib/theme";
import type { User } from "@/types";
import { I18nProvider } from "@/i18n";
import {
  LOCALE_COOKIE_KEY,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@/i18n/config";
import { BRAND_CONFIG, type Permission } from "@haihire/shared";
import "./globals.css";

interface InitialAuthSession {
  initialUser: User | null;
  initialPermissions: Permission[] | null;
  initialHasSessionHint?: boolean;
}

function resolveAcceptLanguageLocale(
  acceptLanguageHeader?: string | null,
): SupportedLocale | null {
  if (!acceptLanguageHeader) return null;
  const candidates = acceptLanguageHeader
    .split(",")
    .map((entry, index) => {
      const [rawTag, ...params] = entry.trim().split(";");
      let q = 1;
      for (const param of params) {
        const match = param.trim().match(/^q=([0-9.]+)$/i);
        if (match) {
          const parsed = Number(match[1]);
          if (Number.isFinite(parsed)) {
            q = parsed;
          }
        }
      }
      return { tag: (rawTag ?? "").toLowerCase(), q, index };
    })
    .filter((item) => item.tag && item.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);

  for (const { tag } of candidates) {
    if (tag.startsWith("vi")) return "vi";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}

function resolveInitialLocale({
  cookieLocale,
  acceptLanguage,
  initialUser,
}: {
  cookieLocale?: string;
  acceptLanguage?: string | null;
  initialUser: User | null;
}): SupportedLocale {
  if (
    initialUser?.preferredLanguage === "vi" ||
    initialUser?.preferredLanguage === "en"
  ) {
    return initialUser.preferredLanguage;
  }
  if (cookieLocale === "vi" || cookieLocale === "en") {
    return cookieLocale;
  }
  const orgDefault = initialUser?.organization?.defaultLanguage;
  if (orgDefault === "vi" || orgDefault === "en") {
    return orgDefault;
  }
  return resolveAcceptLanguageLocale(acceptLanguage) ?? DEFAULT_LOCALE;
}

function normalizeCookieToken(rawValue?: string): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null;
  }
  return trimmed;
}

async function resolveInitialAuthSession(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<InitialAuthSession> {
  const accessToken = normalizeCookieToken(
    cookieStore.get("haihire_token")?.value,
  );
  const refreshToken = normalizeCookieToken(
    cookieStore.get("haihire_refresh_token")?.value,
  );

  const customPublicApiUrl = env.NEXT_PUBLIC_API_URL;
  const isSameOriginCookieAuth =
    !customPublicApiUrl ||
    customPublicApiUrl.includes("localhost") ||
    customPublicApiUrl.includes("127.0.0.1");

  const initialHasSessionHint = isSameOriginCookieAuth
    ? Boolean(accessToken || refreshToken)
    : undefined;

  if (accessToken && env.INTERNAL_API_URL) {
    const baseUrl = env.INTERNAL_API_URL.replace(/\/+$/, "");
    const cookieParts = [`haihire_token=${encodeURIComponent(accessToken)}`];
    if (refreshToken) {
      cookieParts.push(
        `haihire_refresh_token=${encodeURIComponent(refreshToken)}`,
      );
    }
    const cookieHeader = cookieParts.join("; ");

    try {
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        method: "GET",
        headers: { Cookie: cookieHeader },
        cache: "no-store",
        signal: AbortSignal.timeout(1500),
      });

      if (meRes.ok) {
        const initialUser = (await meRes.json()) as User;
        let initialPermissions: Permission[] | null = null;

        if (
          initialUser?.id &&
          initialUser.organizationId &&
          !initialUser.isOwner &&
          initialUser.role !== "ADMIN"
        ) {
          try {
            const permRes = await fetch(`${baseUrl}/auth/me/permissions`, {
              method: "GET",
              headers: { Cookie: cookieHeader },
              cache: "no-store",
              signal: AbortSignal.timeout(1500),
            });
            if (permRes.ok) {
              const permData = (await permRes.json()) as {
                permissions?: Permission[];
              };
              if (Array.isArray(permData?.permissions)) {
                initialPermissions = permData.permissions;
              }
            }
          } catch {
            // Fall back to client permission query when SSR permissions prefill fails
          }
        }

        return {
          initialUser,
          initialPermissions,
          initialHasSessionHint: true,
        };
      }

      if (meRes.status === 401 && !refreshToken && isSameOriginCookieAuth) {
        return {
          initialUser: null,
          initialPermissions: null,
          initialHasSessionHint: false,
        };
      }
    } catch {
      // Transient backend error during SSR: keep client hydration fallback
    }
  }

  return {
    initialUser: null,
    initialPermissions: null,
    initialHasSessionHint,
  };
}

const geist = Geist({
  subsets: ["latin", "vietnamese"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: `${BRAND_CONFIG.name} - ${BRAND_CONFIG.tagline}`,
  description: BRAND_CONFIG.description,
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  let acceptLanguage: string | null = null;
  try {
    if (typeof headers === "function") {
      const headerStore = await headers();
      acceptLanguage = headerStore.get("accept-language");
    }
  } catch {
    // Fallback cleanly when headers() is unavailable (e.g. partial unit-test mocks)
  }

  const { initialUser, initialPermissions, initialHasSessionHint } =
    await resolveInitialAuthSession(cookieStore);

  const locale = resolveInitialLocale({
    cookieLocale: cookieStore.get(LOCALE_COOKIE_KEY)?.value,
    acceptLanguage,
    initialUser,
  });

  const initialDictionary =
    locale === "vi"
      ? (await import("@/i18n/locales/vi")).vi
      : (await import("@/i18n/locales/en")).en;

  const rawTheme = cookieStore.get(THEME_COOKIE_KEY)?.value;
  const initialTheme: ThemeMode =
    rawTheme === "light" || rawTheme === "dark" || rawTheme === "system"
      ? rawTheme
      : "system";

  const rawResolvedTheme = cookieStore.get(RESOLVED_THEME_COOKIE_KEY)?.value;
  const initialResolvedTheme: "light" | "dark" | undefined =
    initialTheme === "dark"
      ? "dark"
      : initialTheme === "light"
        ? "light"
        : rawResolvedTheme === "dark" || rawResolvedTheme === "light"
          ? rawResolvedTheme
          : undefined;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geist.variable} h-full antialiased font-sans${initialResolvedTheme ? ` ${initialResolvedTheme}` : ""}`}
      style={
        initialResolvedTheme ? { colorScheme: initialResolvedTheme } : undefined
      }
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          initialTheme={initialTheme}
        >
          <QueryProvider>
            <I18nProvider
              initialLocale={locale}
              initialDictionary={initialDictionary}
            >
              <SkipToContent />
              <AuthProvider
                initialUser={initialUser}
                initialPermissions={initialPermissions}
                initialHasSessionHint={initialHasSessionHint}
              >
                <LocalizationProvider>{children}</LocalizationProvider>
              </AuthProvider>
              <ToastProvider />
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
