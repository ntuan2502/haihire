import type { ReactNode } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Inter } from "next/font/google";
import { ThemeProvider, QueryProvider } from "@/components/providers";
import { AuthProvider } from "@/context/auth-context";
import {
  I18nProvider,
  LOCALE_COOKIE_KEY,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@/i18n";
import { Toaster } from "sonner";
import { BRAND_CONFIG } from "@haihire/shared";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
  const rawLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value;
  const locale: SupportedLocale = rawLocale === "vi" ? "vi" : DEFAULT_LOCALE;

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased font-sans`}
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try{var d=document.documentElement,t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark');}else{d.classList.remove('dark');}}catch(_){}`}
        </Script>
      </head>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-200">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-xs shadow-lg transition-all"
        >
          {locale === "vi"
            ? "Bỏ qua đến nội dung chính"
            : "Skip to main content"}
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <I18nProvider initialLocale={locale}>
              <AuthProvider>{children}</AuthProvider>
              <Toaster
                richColors
                position="top-right"
                containerAriaLabel={
                  locale === "vi" ? "Thông báo hệ thống" : "Notifications"
                }
              />
            </I18nProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
