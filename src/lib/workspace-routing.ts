export const WORKSPACE_ROUTES = ["/agents"] as const;

export function isWorkspaceRoute(pathname: string): boolean {
  return pathname === "/agents" || pathname.startsWith("/agents/");
}

export function isAgentRoute(pathname: string): boolean {
  return !isWorkspaceRoute(pathname) && pathname !== "/onboarding";
}
