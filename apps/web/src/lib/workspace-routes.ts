export const WORKSPACE_ROUTE_PREFIXES = [
  "/dashboard",
  "/jobs",
  "/candidates",
  "/applications",
  "/interviews",
  "/source-tracking",
  "/settings",
  "/account",
] as const;

export function isWorkspaceRoute(pathname: string): boolean {
  return WORKSPACE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
