"use client";

import { createContext, useContext, useRef, type ComponentProps } from "react";
import { useServerInsertedHTML } from "next/navigation";
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

export const THEME_INIT_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem('theme'),mode=(t==='light'||t==='dark'||t==='system')?t:'system',isDark=mode==='dark'||(mode==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches),resolved=isDark?'dark':'light';if(isDark){d.classList.add('dark');d.classList.remove('light');}else{d.classList.remove('dark');d.classList.add('light');}d.style.colorScheme=resolved;try{document.cookie='${THEME_COOKIE_KEY}='+mode+'; path=/; max-age=31536000; SameSite=Lax';document.cookie='${RESOLVED_THEME_COOKIE_KEY}='+resolved+'; path=/; max-age=31536000; SameSite=Lax';}catch(_){}}catch(_){}`;

/**
 * Injects the pre-paint theme initialization script into SSR HTML via
 * `useServerInsertedHTML` so React 19 never sees a `<script>` element
 * inside client component renders.
 */
export function ThemeInitScript() {
  const insertedRef = useRef(false);

  useServerInsertedHTML(() => {
    if (insertedRef.current) return null;
    insertedRef.current = true;
    return (
      <script
        id="theme-init"
        dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      />
    );
  });

  return null;
}

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
  scriptProps,
  ...props
}: ThemeProviderProps) {
  return (
    <InitialThemeContext.Provider value={initialTheme}>
      <ThemeInitScript />
      <NextThemesProvider
        {...props}
        scriptProps={{ ...scriptProps, type: "text/plain" }}
      >
        {children}
      </NextThemesProvider>
    </InitialThemeContext.Provider>
  );
}
