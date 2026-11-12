import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const capturedScripts: Array<{ id?: string; body: string }> = [];
const capturedThemeProviderProps: Array<Record<string, unknown>> = [];

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined),
  }),
}));

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-sans" }),
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

describe("RootLayout theme initialization", () => {
  beforeEach(() => {
    capturedScripts.length = 0;
    capturedThemeProviderProps.length = 0;
    localStorage.clear();
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
    });
  });

  it("theme-init pre-paint script resolves system theme according to OS dark/light", async () => {
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

    // Stored "system" + OS light -> light
    mockMatchMedia(false);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.style.colorScheme).toBe("light");

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

    // Explicit "dark" even when OS is light -> dark
    localStorage.setItem("theme", "dark");
    mockMatchMedia(false);
    runInitScript();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
