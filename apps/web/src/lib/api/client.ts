import axios from "axios";
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
  if (url.includes("/haihire-resumes/")) {
    const idx = url.indexOf("/haihire-resumes/");
    return url.slice(idx);
  }
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const apiUrl = getApiBaseUrl();
  return `${apiUrl.replace(/\/+$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
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
