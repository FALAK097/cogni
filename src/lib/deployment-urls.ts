export function getRootHref(path = "") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized;
}

export function getDashboardHref() {
  return "/dashboard";
}

export function getDocsHref(path = "") {
  return getRootHref(path);
}
