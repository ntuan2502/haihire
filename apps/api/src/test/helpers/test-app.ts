import { NestFactory } from "@nestjs/core";
import { ValidationPipe, type INestApplication } from "@nestjs/common";
import type { Server } from "node:http";
import { AppModule } from "../../app.module";
import { GlobalExceptionFilter } from "../../common/http-exception.filter";
import { validationExceptionFactory } from "../../common/dto-validation.pipe";
import { PrismaService } from "../../prisma/prisma.service";
import { restoreDatabaseSnapshot } from "./test-db";

export interface TestAgent {
  get(path: string, headers?: Record<string, string>): Promise<Response>;
  post(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Response>;
  patch(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Response>;
  put(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
  ): Promise<Response>;
  delete(path: string, headers?: Record<string, string>): Promise<Response>;
  postMultipart(
    path: string,
    formData: FormData,
    headers?: Record<string, string>,
  ): Promise<Response>;
  getCookies(): Record<string, string>;
  setCookie(key: string, value: string): void;
  clearCookies(): void;
}

export interface TestAppContext {
  app: INestApplication;
  server: Server;
  prisma: PrismaService;
  baseUrl: string;
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
  createAgent: () => TestAgent;
  close: () => Promise<void>;
}

export async function createTestApp(): Promise<TestAppContext> {
  const app = await NestFactory.create(AppModule, { logger: false });

  // 1. Replicate main.ts cookie parser middleware
  app.use(
    (
      req: { headers?: { cookie?: string }; cookies?: Record<string, string> },
      _res: unknown,
      next: () => void,
    ) => {
      if (req.headers?.cookie && !req.cookies) {
        const parsed: Record<string, string> = {};
        const pairs = req.headers.cookie.split(";");
        for (const pair of pairs) {
          const idx = pair.indexOf("=");
          if (idx > 0) {
            try {
              const key = decodeURIComponent(pair.slice(0, idx).trim());
              const val = decodeURIComponent(pair.slice(idx + 1).trim());
              parsed[key] = val;
            } catch {
              // Malformed URL encoding in cookie string, ignore malformed pair safely
            }
          }
        }
        req.cookies = parsed;
      } else if (!req.cookies) {
        req.cookies = {};
      }
      next();
    },
  );

  // 2. Replicate main.ts global ValidationPipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  // 3. Replicate main.ts global GlobalExceptionFilter
  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(0);
  const server = app.getHttpServer() as Server;
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;
  const prisma = app.get(PrismaService);

  const createAgent = (): TestAgent => {
    const cookieJar: Record<string, string> = {};

    const captureCookies = (res: Response) => {
      const setCookies =
        typeof res.headers.getSetCookie === "function"
          ? res.headers.getSetCookie()
          : [res.headers.get("set-cookie") || ""];

      for (const sc of setCookies) {
        if (!sc) continue;
        const match = sc.match(/^\s*([^=;]+)=([^;]*)/);
        if (match) {
          cookieJar[match[1].trim()] = match[2].trim();
        }
      }
    };

    const getCookieHeader = () => {
      return Object.entries(cookieJar)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    };

    const request = async (
      method: string,
      path: string,
      body?: unknown,
      headers?: Record<string, string>,
    ): Promise<Response> => {
      const url = path.startsWith("http")
        ? path
        : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
      const reqHeaders: Record<string, string> = { ...headers };

      const cookieHeader = getCookieHeader();
      if (cookieHeader && !reqHeaders["cookie"] && !reqHeaders["Cookie"]) {
        reqHeaders["Cookie"] = cookieHeader;
      }

      let reqBody: BodyInit | undefined = undefined;
      if (body !== undefined) {
        if (body instanceof FormData) {
          reqBody = body;
        } else if (typeof body === "string" || Buffer.isBuffer(body)) {
          reqBody = body as unknown as BodyInit;
        } else {
          reqBody = JSON.stringify(body);
          if (!reqHeaders["content-type"] && !reqHeaders["Content-Type"]) {
            reqHeaders["Content-Type"] = "application/json";
          }
        }
      }

      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: reqBody,
      });

      captureCookies(res);
      return res;
    };

    return {
      get: (path, headers) => request("GET", path, undefined, headers),
      post: (path, body, headers) => request("POST", path, body, headers),
      patch: (path, body, headers) => request("PATCH", path, body, headers),
      put: (path, body, headers) => request("PUT", path, body, headers),
      delete: (path, headers) => request("DELETE", path, undefined, headers),
      postMultipart: (path, formData, headers) =>
        request("POST", path, formData, headers),
      getCookies: () => ({ ...cookieJar }),
      setCookie: (k, v) => {
        cookieJar[k] = v;
      },
      clearCookies: () => {
        for (const k of Object.keys(cookieJar)) {
          delete cookieJar[k];
        }
      },
    };
  };

  const fetchWrapper = async (
    path: string,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = path.startsWith("http")
      ? path
      : `${baseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
    return fetch(url, init);
  };

  return {
    app,
    server,
    prisma,
    baseUrl,
    fetch: fetchWrapper,
    createAgent,
    close: async () => {
      try {
        await restoreDatabaseSnapshot(prisma);
      } finally {
        await app.close();
      }
    },
  };
}
