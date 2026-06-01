import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiFetch } from "./api-base";

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

const setAuthToken = (token: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
};

export const clearLocalAuthSession = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;

    try {
      const payload = JSON.parse(text) as {
        message?: string;
        error?: string;
        detail?: string;
        issues?: Array<{ message?: string }>;
      };
      message =
        payload.error ||
        payload.message ||
        payload.detail ||
        payload.issues?.map((issue) => issue.message).filter(Boolean).join(", ") ||
        message;
    } catch {
      if (text.trim().startsWith("<!DOCTYPE")) {
        message = "The API returned an HTML page instead of JSON. Check the API URL or local dev proxy.";
      }
    }

    throw new Error(message);
  }
}

let refreshPromise: Promise<boolean> | null = null;

const isRefreshableStatus = (status: number) => status === 401 || status === 403;

const shouldAttemptTokenRefresh = (url: RequestInfo | URL) => {
  if (!getAuthToken()) return false;
  if (typeof url !== "string") return true;
  return ![
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/refresh",
    "/api/auth/logout",
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
    "/auth/logout",
  ].some((path) => url.startsWith(path));
};

export async function refreshAuthSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await apiFetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (!response.ok) {
          clearLocalAuthSession();
          return false;
        }

        const payload = (await response.json()) as { token?: string };
        if (!payload.token) {
          clearLocalAuthSession();
          return false;
        }

        setAuthToken(payload.token);
        return true;
      } catch {
        clearLocalAuthSession();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

async function fetchWithAuthRefresh(input: RequestInfo | URL, init: RequestInit = {}, allowRefresh = true) {
  const response = await apiFetch(input, init);
  if (!allowRefresh || !isRefreshableStatus(response.status) || !shouldAttemptTokenRefresh(input)) {
    return response;
  }

  const refreshed = await refreshAuthSession();
  if (!refreshed) return response;

  const retryHeaders = new Headers(init.headers);
  const token = getAuthToken();
  if (token) retryHeaders.set("Authorization", `Bearer ${token}`);

  return apiFetch(input, {
    ...init,
    headers: retryHeaders,
    credentials: init.credentials ?? "include",
  });
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (data) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetchWithAuthRefresh(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

export const authFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetchWithAuthRefresh(input, {
    ...init,
    headers,
    credentials: init.credentials ?? "include",
  });
};

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [url, ...params] = queryKey as unknown[];
    const token = getAuthToken();
    let finalUrl = String(url);

    if (params.length > 0) {
      const searchParams = new URLSearchParams();
      params.forEach((param, index) => {
        if (param === undefined || param === null) return;
        if (typeof param === "object") {
          Object.entries(param as Record<string, unknown>).forEach(([key, value]) => {
            if (value === undefined || value === null) return;
            searchParams.set(key, String(value));
          });
        } else {
          searchParams.set(`p${index}`, String(param));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        finalUrl = `${finalUrl}?${queryString}`;
      }
    }

    const res = await fetchWithAuthRefresh(finalUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      clearLocalAuthSession();
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
