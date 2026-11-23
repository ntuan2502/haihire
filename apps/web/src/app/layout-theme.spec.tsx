import { describe, it, expect, vi, beforeEach } from "vitest";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const { mockCookiesGet, mockHeadersGet, serverInsertedCallbacks } = vi.hoisted(
  () => ({
    mockCookiesGet: vi.fn(),
    mockHeadersGet: vi.fn(),
    serverInsertedCallbacks: [] as Array<() => ReactNode>,
  }),
);

const capturedThemeProviderProps: Array<Record<string, unknown>> = [];

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: mockCookiesGet,
  }),
  headers: vi.fn().mockResolvedValue({
    get: mockHeadersGet,
  }),
}));

vi.mock("next/navigation", () => ({
  useServerInsertedHTML: (cb: () => ReactNode) => {
    serverInsertedCallbacks.push(cb);
  },
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
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
    serverInsertedCallbacks.length = 0;
    capturedThemeProviderProps.length = 0;
    mockCookiesGet.mockReset().mockReturnValue(undefined);
    mockHeadersGet.mockReset().mockReturnValue(null);
    localStorage.clear();
    document.cookie = "haihire_theme=; max-age=0; path=/";
    document.cookie = "haihire_resolved_theme=; max-age=0; path=/";
    document.documentElement.className = "";
    document.documentElement.style.colorScheme = "";
  });

  it("enables system theme tracking by default on ThemeProvider and renders no inline <script> in RootLayout", async () => {
    const element = await RootLayout({ children: <div>child</div> });
    const html = renderToStaticMarkup(element);

    expect(html).not.toContain("<script");
    expect(capturedThemeProviderProps).toHaveLength(1);
    expect(capturedThemeProviderProps[0]).toMatchObject({
      attribute: "class",
      defaultTheme: "system",
      enableSystem: true,
      initialTheme: "system",
    });
  });

  it("ThemeInitScript injects #theme-init via useServerInsertedHTML once and renders empty JSX", async () => {
    const { ThemeInitScript, ThemeProvider, THEME_INIT_SCRIPT } =
      await vi.importActual<
        typeof import("@/components/providers/theme-provider")
      >("@/components/providers/theme-provider");

    const rendered = renderToStaticMarkup(createElement(ThemeInitScript));
    expect(rendered).toBe("");
    expect(serverInsertedCallbacks).toHaveLength(1);

    const insertedNode = serverInsertedCallbacks[0]() as ReactElement<{
      id?: string;
      dangerouslySetInnerHTML?: { __html: string };
    }> | null;
    expect(insertedNode).not.toBeNull();
    expect(insertedNode?.type).toBe("script");
    expect(insertedNode?.props.id).toBe("theme-init");
    expect(insertedNode?.props.dangerouslySetInnerHTML?.__html).toBe(
      THEME_INIT_SCRIPT,
    );

    // Repeating callback within same render ref is idempotent
    expect(serverInsertedCallbacks[0]()).toBeNull();

    // ThemeProvider marks next-themes script block as text/plain so React 19 never warns
    mockMatchMedia(false);
    const providerHtml = renderToStaticMarkup(
      createElement(ThemeProvider, null, createElement("span", null, "ok")),
    );
    expect(providerHtml).toContain('type="text/plain"');
  });

  it("theme-init pre-paint script resolves system theme according to OS dark/light and syncs cookies", async () => {
    const { THEME_INIT_SCRIPT } = await vi.importActual<
      typeof import("@/components/providers/theme-provider")
    >("@/components/providers/theme-provider");

    const runInitScript = () => new Function(THEME_INIT_SCRIPT)();

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
