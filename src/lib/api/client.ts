type ApiParams = {
  path?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | null | undefined>;
};

type ApiResult<T> = {
  data?: T;
  error?: unknown;
  response: Response;
};

function interpolatePath(path: string, params?: ApiParams["path"]) {
  let resolved = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      resolved = resolved.replace(`{${key}}`, encodeURIComponent(String(value)));
    }
  }
  return resolved;
}

function withQuery(url: string, query?: ApiParams["query"]) {
  if (!query) return url;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `${url}?${queryString}` : url;
}

function mapPath(path: string) {
  if (path === "/api/auth/me") return "/api/dashboard/me";
  if (path === "/api/auth/logout") return "/api/auth/sign-out";
  if (path.startsWith("/api/workspaces/{workspace_id}/widget-config")) {
    return path.replace("/api/workspaces/{workspace_id}/widget-config", "/api/dashboard/widget");
  }
  if (path === "/api/workspaces") return "/api/dashboard/workspaces";
  if (path.startsWith("/api/workspaces/{workspace_id}/switch")) {
    return "/api/dashboard/workspaces/switch";
  }
  if (path.startsWith("/api/widget/sessions/{session_id}")) {
    return path.replace(
      "/api/widget/sessions/{session_id}",
      "/api/dashboard/widget/sessions/{session_id}",
    );
  }
  if (path === "/api/widget/sessions") return "/api/dashboard/widget/sessions";
  if (path.startsWith("/api/knowledge-base/sources/{source_id}")) {
    return path.replace(
      "/api/knowledge-base/sources/{source_id}",
      "/api/dashboard/knowledge-base/sources/{source_id}",
    );
  }
  if (path.startsWith("/api/knowledge-base/sources/website")) {
    return "/api/dashboard/knowledge-base/sources/website";
  }
  if (path === "/api/conversations") return "/api/dashboard/conversations";
  if (path.startsWith("/api/conversations/")) {
    return path.replace("/api/conversations/", "/api/dashboard/conversations/");
  }
  return path;
}

async function request<T>(
  method: string,
  path: string,
  options?: { params?: ApiParams; body?: unknown },
): Promise<ApiResult<T>> {
  const interpolated = interpolatePath(mapPath(path), options?.params?.path);
  const url = withQuery(interpolated, options?.params?.query);
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: "same-origin",
  });

  let data: T | undefined;
  let error: unknown;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const json = (await response.json()) as T | { error?: string; detail?: string };
    if (!response.ok) {
      error = json;
    } else {
      data = json as T;
    }
  } else if (!response.ok) {
    error = { message: await response.text() };
  }

  return { data, error, response };
}

export function requireData<T>(data: T | undefined, error: unknown, fallback: string): T {
  if (data !== undefined) return data;
  if (error && typeof error === "object") {
    const apiError = error as { detail?: string; error?: string; message?: string };
    if (apiError.detail) throw new Error(apiError.detail);
    if (apiError.error) throw new Error(apiError.error);
    if (apiError.message) throw new Error(apiError.message);
  }
  throw new Error(fallback);
}

export async function getActiveWorkspaceId() {
  const { data } = await api.GET<{ session?: { activeWorkspaceId?: string } }>("/api/auth/me");
  return data?.session?.activeWorkspaceId ?? "";
}

export function getBackendOrigin() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

export const api = {
  GET: <T>(path: string, options?: { params?: ApiParams }) => request<T>("GET", path, options),
  POST: <T>(path: string, options?: { params?: ApiParams; body?: unknown }) =>
    request<T>("POST", path, options),
  PUT: <T>(path: string, options?: { params?: ApiParams; body?: unknown }) =>
    request<T>("PUT", path, options),
  PATCH: <T>(path: string, options?: { params?: ApiParams; body?: unknown }) =>
    request<T>("PATCH", path, options),
  DELETE: <T>(path: string, options?: { params?: ApiParams; body?: unknown }) =>
    request<T>("DELETE", path, options),
};
