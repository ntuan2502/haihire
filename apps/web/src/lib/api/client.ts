import axios, { type InternalAxiosRequestConfig } from "axios";
import { env } from "../env";

export const getApiBaseUrl = () => {
  if (typeof window !== "undefined") {
    // In browser, if an external non-localhost URL is explicitly provided, use it.
    // Otherwise, always use relative "/api" so requests proxy through Next.js rewrites.
    const customUrl = env.NEXT_PUBLIC_API_URL;
    if (
      customUrl &&
      !customUrl.includes("localhost") &&
      !customUrl.includes("127.0.0.1")
    ) {
      return customUrl;
    }
    return "/api";
  }
  // Server-side (SSR / Server Actions) communicates directly with backend via validated internal URL
  return env.INTERNAL_API_URL;
};

export const getDocumentUrl = (url: string) => {
  if (!url) return "";
  const apiUrl = getApiBaseUrl().replace(/\/+$/, "");
  if (url.includes("/documents/download")) {
    const separator = url.includes("?") ? "&" : "?";
    const fullUrl = url.startsWith("http")
      ? url
      : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
    return fullUrl.includes("disposition=")
      ? fullUrl
      : `${fullUrl}${separator}disposition=inline`;
  }
  if (url.includes("/haihire-resumes/")) {
    const idx = url.indexOf("/haihire-resumes/");
    return url.slice(idx);
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Defensive Gatekeeper: Prevent malformed URLs containing unparsed JavaScript objects
api.interceptors.request.use((config) => {
  if (
    config.url &&
    (config.url.includes("[object") || config.url.includes("%5Bobject"))
  ) {
    return Promise.reject(
      new Error(
        `[HaiHire API Gatekeeper] Malformed request URL containing unparsed object: ${config.url}`,
      ),
    );
  }
  return config;
});

function clearClientAuthCookies() {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `haihire_token=; path=/; max-age=0; SameSite=Lax${secure}`;
  document.cookie = `haihire_has_org=; path=/; max-age=0; SameSite=Lax${secure}`;
}

// Silent Token Refresh Queue & Handling
interface QueueItem {
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor for 401 Silent Refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error?.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry
    ) {
      const url = originalRequest.url || "";
      if (
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/change-password")
      ) {
        return Promise.reject(error);
      }

      if (typeof window === "undefined") {
        return Promise.reject(error);
      }

      const refreshToken = localStorage.getItem(
        "haihire_recruiter_refresh_token",
      );
      if (!refreshToken) {
        clearClientAuthCookies();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              resolve(api.request(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post<{
          accessToken: string;
          refreshToken?: string;
        }>(
          `${getApiBaseUrl()}/auth/refresh`,
          { refreshToken },
          { withCredentials: true },
        );

        const newAccessToken = refreshRes.data.accessToken;
        const newRefreshToken = refreshRes.data.refreshToken;

        localStorage.setItem("haihire_recruiter_token", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem(
            "haihire_recruiter_refresh_token",
            newRefreshToken,
          );
        }

        const maxAge = 60 * 60 * 24 * 7;
        const secure =
          window.location.protocol === "https:" ? "; Secure" : "";
        document.cookie = `haihire_token=${newAccessToken}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api.request(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem("haihire_recruiter_token");
        localStorage.removeItem("haihire_recruiter_refresh_token");
        localStorage.removeItem("haihire_recruiter_user");
        clearClientAuthCookies();
        delete api.defaults.headers.common.Authorization;
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export async function downloadAuthenticatedFile(
  downloadPath: string,
  fileName: string,
): Promise<void> {
  const response = await api.get(downloadPath, { responseType: "blob" });
  const blob = new Blob([response.data]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
