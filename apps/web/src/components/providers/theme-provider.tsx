"use client";

import { createContext, useContext, type ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import {
  THEME_COOKIE_KEY,
  RESOLVED_THEME_COOKIE_KEY,
  syncThemeCookies,
  type ThemeMode,
} from "@/lib/theme";

export {
  THEME_COOKIE_KEY,
  RESOLVED_THEME_COOKIE_KEY,
  syncThemeCookies,
  type ThemeMode,
};

const InitialThemeContext = createContext<ThemeMode>("system");

export function useInitialTheme(): ThemeMode {
  return useContext(InitialThemeContext);
}

export interface ThemeProviderProps extends ComponentProps<
  typeof NextThemesProvider
> {
  initialTheme?: ThemeMode;
}

export function ThemeProvider({
  children,
  initialTheme = "system",
  ...props
}: ThemeProviderProps) {
  return (
    <InitialThemeContext.Provider value={initialTheme}>
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </InitialThemeContext.Provider>
  );
}
