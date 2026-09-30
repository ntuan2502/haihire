import { z } from "zod";

const isServer = typeof window === "undefined";

// Client-side environment schema (variables prefixed with NEXT_PUBLIC_)
const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().default(""),
  NEXT_PUBLIC_MINIO_URL: z.string().default("/haihire-resumes"),
});

// Server-only environment schema (accessible only on Node.js / SSR)
const serverEnvSchema = z.object({
  INTERNAL_API_URL: z
    .string()
    .min(1, "INTERNAL_API_URL is required in frontend/.env for Server-Side API communication"),
});

export interface FrontendEnv {
  INTERNAL_API_URL: string;
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_MINIO_URL: string;
}

// Validate client variables (safe for both browser and server)
const parsedClient = clientEnvSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_MINIO_URL: process.env.NEXT_PUBLIC_MINIO_URL,
});

if (!parsedClient.success) {
  console.error("❌ Invalid Client Environment:", parsedClient.error.format());
  throw new Error("Invalid client environment configuration.");
}

// Validate server-only variables strictly when executing on the server
let internalApiUrl = "";
if (isServer) {
  const fallbackUrl = process.env.BACKEND_PORT
    ? `http://127.0.0.1:${process.env.BACKEND_PORT}`
    : undefined;

  const parsedServer = serverEnvSchema.safeParse({
    INTERNAL_API_URL: process.env.INTERNAL_API_URL || fallbackUrl,
  });

  if (!parsedServer.success) {
    console.error("\n===========================================================");
    console.error("❌ CRITICAL CONFIGURATION ERROR: Missing Server-Side Environment!");
    console.error("===========================================================");
    console.error(parsedServer.error.format());
    console.error("===========================================================\n");
    throw new Error("Missing INTERNAL_API_URL in frontend/.env for server-side communication.");
  }
  internalApiUrl = parsedServer.data.INTERNAL_API_URL;
}

export const env: FrontendEnv = {
  INTERNAL_API_URL: internalApiUrl,
  NEXT_PUBLIC_API_URL: parsedClient.data.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_MINIO_URL: parsedClient.data.NEXT_PUBLIC_MINIO_URL,
};
