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

export interface DocumentDownloadContext {
  url: string;
  name?: string;
  applicationId?: string;
  candidateId?: string;
  disposition?: "inline" | "attachment";
}

export type DocumentPreviewKind = "pdf" | "image" | "unsupported";

export interface AuthenticatedPreviewResult {
  blobUrl: string;
  mimeType: string;
  kind: DocumentPreviewKind;
}

const INLINE_PDF_MIME = "application/pdf";
const INLINE_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

const PREVIEW_EXTENSION_MIMES: Record<string, string> = {
  ".pdf": INLINE_PDF_MIME,
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function normalizeMimeString(raw?: string | null): string {
  if (!raw) return "";
  return raw.split(";")[0]?.trim().toLowerCase() || "";
}

function inferMimeFromFilenameOrUrl(fileNameOrUrl?: string | null): string {
  if (!fileNameOrUrl) return "";
  const cleanPath = fileNameOrUrl.split(/[?#]/)[0]?.toLowerCase() || "";
  for (const [ext, mime] of Object.entries(PREVIEW_EXTENSION_MIMES)) {
    if (cleanPath.endsWith(ext)) {
      return mime;
    }
  }
  return "";
}

function resolvePreviewMime(
  headerMime?: string | null,
  blobType?: string | null,
  explicitMime?: string | null,
  fileNameOrUrl?: string | null,
): string {
  const candidates = [
    normalizeMimeString(headerMime),
    normalizeMimeString(blobType),
    normalizeMimeString(explicitMime),
  ];
  for (const candidate of candidates) {
    if (
      candidate &&
      candidate !== "application/octet-stream" &&
      candidate !== "binary/octet-stream"
    ) {
      return candidate;
    }
  }
  return (
    inferMimeFromFilenameOrUrl(fileNameOrUrl) || "application/octet-stream"
  );
}

function classifyPreviewMime(mimeType: string): DocumentPreviewKind {
  if (mimeType === INLINE_PDF_MIME) {
    return "pdf";
  }
  if (INLINE_IMAGE_MIMES.has(mimeType)) {
    return "image";
  }
  return "unsupported";
}

/**
 * Builds the tenant-guarded backend endpoint path (relative to `api` baseURL) for document download/preview.
 * Never exposes raw private MinIO `/haihire-resumes/` URLs directly.
 */
export function buildDocumentDownloadPath({
  url,
  name,
  applicationId,
  candidateId,
  disposition,
}: DocumentDownloadContext): string {
  if (!url) return "";

  if (url.includes("/documents/download")) {
    let relative = url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return disposition === "inline" && !url.includes("disposition=")
        ? `${url}${url.includes("?") ? "&" : "?"}disposition=inline`
        : url;
    }
    const apiPrefix = getApiBaseUrl().replace(/\/+$/, "");
    if (apiPrefix.startsWith("/") && relative.startsWith(`${apiPrefix}/`)) {
      relative = relative.slice(apiPrefix.length);
    }
    if (!relative.startsWith("/")) {
      relative = `/${relative}`;
    }
    if (disposition && !relative.includes("disposition=")) {
      relative = `${relative}${relative.includes("?") ? "&" : "?"}disposition=${disposition}`;
    }
    return relative;
  }

  if (applicationId || candidateId) {
    const params = new URLSearchParams();
    params.set("url", url);
    if (name && name.trim()) {
      params.set("name", name.trim());
    }
    if (disposition) {
      params.set("disposition", disposition);
    }
    const prefix = applicationId
      ? `/applications/${applicationId}/documents/download`
      : `/candidates/${candidateId}/documents/download`;
    return `${prefix}?${params.toString()}`;
  }

  return "";
}

export const getDocumentUrl = (
  url: string,
  context?: Omit<DocumentDownloadContext, "url" | "disposition">,
) => {
  if (!url) return "";
  const apiUrl = getApiBaseUrl().replace(/\/+$/, "");

  const downloadPath = buildDocumentDownloadPath({
    url,
    name: context?.name,
    applicationId: context?.applicationId,
    candidateId: context?.candidateId,
    disposition: "inline",
  });
  if (downloadPath) {
    if (
      downloadPath.startsWith("http://") ||
      downloadPath.startsWith("https://")
    ) {
      return downloadPath;
    }
    return `${apiUrl}${downloadPath.startsWith("/") ? "" : "/"}${downloadPath}`;
  }

  // Bucket `haihire-resumes` is private; refuse direct unauthenticated storage access
  if (url.includes("/haihire-resumes/")) {
    return "";
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
  // Note: haihire_token is an HttpOnly cookie cleared by the backend /auth/logout endpoint.
  document.cookie = `haihire_has_org=; path=/; max-age=0; SameSite=Lax${secure}`;
}

function hasClientSessionState(): boolean {
  if (typeof window === "undefined") return false;
  const pathname = window.location.pathname || "";
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/auth/onboarding")
  ) {
    return true;
  }
  return Boolean(
    document.cookie.includes("haihire_has_org=") ||
    localStorage.getItem("haihire_recruiter_token") ||
    localStorage.getItem("haihire_recruiter_user"),
  );
}

async function clearServerAndClientSession(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("haihire_recruiter_token");
    localStorage.removeItem("haihire_recruiter_refresh_token");
    localStorage.removeItem("haihire_recruiter_user");
    delete api.defaults.headers.common.Authorization;
    try {
      await axios.post(
        `${getApiBaseUrl()}/auth/logout`,
        {},
        { withCredentials: true },
      );
    } catch {
      // Best-effort cleanup of HttpOnly session cookies
    }
  }
  clearClientAuthCookies();
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
      (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

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
        url.includes("/auth/logout") ||
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
        if (hasClientSessionState()) {
          await clearServerAndClientSession();
        } else {
          clearClientAuthCookies();
        }
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
          hasOrg?: boolean;
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
        const secure = window.location.protocol === "https:" ? "; Secure" : "";
        if (typeof refreshRes.data.hasOrg === "boolean") {
          document.cookie = `haihire_has_org=${refreshRes.data.hasOrg ? "true" : "false"}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
        }

        api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        processQueue(null, newAccessToken);
        return api.request(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        await clearServerAndClientSession();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

async function normalizeBlobAxiosError(err: unknown): Promise<unknown> {
  if (err && typeof err === "object" && "response" in err) {
    const axiosErr = err as {
      response?: { data?: unknown; status?: number; headers?: unknown };
    };
    const rawData = axiosErr.response?.data;
    if (typeof Blob !== "undefined" && rawData instanceof Blob) {
      try {
        const text = await rawData.text();
        let parsed: unknown = text;
        try {
          parsed = JSON.parse(text);
        } catch {
          // keep text when response body is plain text
        }
        return {
          ...err,
          response: {
            ...axiosErr.response,
            data: parsed,
          },
        };
      } catch {
        return err;
      }
    }
  }
  return err;
}

export async function fetchAuthenticatedDocumentPreview(
  downloadPath: string,
  options?: {
    mimeType?: string | null;
    fileName?: string | null;
    url?: string | null;
  },
): Promise<AuthenticatedPreviewResult> {
  try {
    const response = await api.get<BlobPart>(downloadPath, {
      responseType: "blob",
    });
    const rawData = response.data;
    const blobType =
      typeof Blob !== "undefined" && rawData instanceof Blob
        ? rawData.type
        : "";
    const headers = response.headers as
      Record<string, string | undefined> | undefined;
    const headerMime =
      headers?.["content-type"] ?? headers?.["Content-Type"] ?? "";

    const resolvedMime = resolvePreviewMime(
      headerMime,
      blobType,
      options?.mimeType,
      options?.fileName || options?.url,
    );
    const kind = classifyPreviewMime(resolvedMime);

    if (kind === "unsupported") {
      return {
        blobUrl: "",
        mimeType: resolvedMime,
        kind,
      };
    }

    const typedBlob = new Blob([rawData], { type: resolvedMime });
    const blobUrl = window.URL.createObjectURL(typedBlob);
    return {
      blobUrl,
      mimeType: resolvedMime,
      kind,
    };
  } catch (error) {
    throw await normalizeBlobAxiosError(error);
  }
}

export async function downloadAuthenticatedFile(
  downloadPath: string,
  fileName: string,
): Promise<void> {
  try {
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
  } catch (error) {
    throw await normalizeBlobAxiosError(error);
  }
}
