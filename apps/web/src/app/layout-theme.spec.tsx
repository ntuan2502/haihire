import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { mockCookiesGet, mockHeadersGet } = vi.hoisted(() => ({
  mockCookiesGet: vi.fn(),
  mockHeadersGet: vi.fn(),
}));

const capturedScripts: Array<{ id?: string; body: string }> = [];
const capturedThemeProviderProps: Array<Record<string, unknown>> = [];

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockCookiesGet,
  }),
  headers: vi.fn().mockResolvedValue({
    get: mockHeadersGet,
  }),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
}));

vi.mock("next/script", () => ({
  default: ({ id, children }: { id?: string; children?: ReactNode }) => {
    capturedScripts.push({
      id,
      body: typeof children === "string" ? children : String(children ?? ""),
    });
    return null;
  },
}));

vi.mock("./globals.css", () => ({}));

vi.mock("@/components/providers", () => ({
  ThemeProvider: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => {
    capturedThemeProviderProps.push(props);
    return children;
  },
  QueryProvider: ({ children }: { children: ReactNode }) => children,
  LocalizationProvider: ({ children }: { children: ReactNode }) => children,
  ToastProvider: () => null,
}));

vi.mock("@/context/auth-context", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import RootLayout from "./layout";

function mockMatchMedia(isDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: dark)" ? isDark : false,
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("RootLayout theme and locale initialization", () => {
  beforeEach(() => {
    capturedScripts.length = 0;
    capturedThemeProviderProps.length = 0;
    mockCookiesGet.mockReset().mockReturnValue(undefined);
    mockHeadersGet.mockReset().mockReturnValue(null);
    localStorage.clear();
    document.cookie = "haihire_theme=; max-age=0; path=/";
    document.cookie = "haihire_resolved_theme=; max-age=0; path=/";
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
  });

  it("enables system theme tracking by default on ThemeProvider", async () => {
    const element = await RootLayout({ children: <div>child</div> });
    renderToStaticMarkup(element);

    expect(capturedThemeProviderProps).toHaveLength(1);
    expect(capturedThemeProviderProps[0]).toMatchObject({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
      initialTheme: "system",
    });
  });

  it("theme-init pre-paint script resolves system theme according to OS dark/light and syncs cookies", async () => {
    const element = await RootLayout({ children: <div>child</div> });
    renderToStaticMarkup(element);

    const initScript = capturedScripts.find((s) => s.id === "theme-init");
    expect(initScript).toBeDefined();
    const runInitScript = () => new Function(initScript!.body)();

    // Stored "system" + OS dark -> dark
    localStorage.setItem("theme", "system");
    mockMatchMedia(true);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(document.cookie).toContain("haihire_theme=system");
    expect(document.cookie).toContain("haihire_resolved_theme=dark");

    // Stored "system" + OS light -> light
    mockMatchMedia(false);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.cookie).toContain("haihire_theme=system");
    expect(document.cookie).toContain("haihire_resolved_theme=light");

    // Unset + OS dark -> dark
    localStorage.removeItem("theme");
    mockMatchMedia(true);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Explicit "light" even when OS is dark -> light
    localStorage.setItem("theme", "light");
    mockMatchMedia(true);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.cookie).toContain("haihire_theme=light");
    expect(document.cookie).toContain("haihire_resolved_theme=light");

    // Explicit "dark" even when OS is light -> dark
    localStorage.setItem("theme", "dark");
    mockMatchMedia(false);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.cookie).toContain("haihire_theme=dark");
    expect(document.cookie).toContain("haihire_resolved_theme=dark");
  });

  it('resolves lang="vi" from Accept-Language header when no locale cookie is set', async () => {
    mockHeadersGet.mockImplementation((name: string) =>
      name.toLowerCase() === "accept-language"
        ? "vi-VN,vi;q=0.9,en-US;q=0.8"
        : null,
    );

    const element = await RootLayout({ children: <div>child</div> });
    const html = renderToStaticMarkup(element);

    expect(html).toContain('<html lang="vi"');
  });

  it("passes initialTheme from haihire_theme cookie and applies resolved dark class on html", async () => {
    mockCookiesGet.mockImplementation((name: string) => {
      if (name === "haihire_theme") return { value: "system" };
      if (name === "haihire_resolved_theme") return { value: "dark" };
      return undefined;
    });

    const element = await RootLayout({ children: <div>child</div> });
    const html = renderToStaticMarkup(element);

    expect(capturedThemeProviderProps[0]).toMatchObject({
      initialTheme: "system",
    });
    expect(html).toMatch(/<html[^>]*class="[^"]*\bdark\b[^"]*"/);
    expect(html).toMatch(/color-scheme:dark/);
  });
});
