/** Cogni currently exposes only Owner and Member roles. Owners manage settings and approvals. */
export function canManageWorkspace(role: string) {
  return role === "OWNER";
}
