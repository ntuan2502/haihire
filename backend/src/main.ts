import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { env } from "./config/env";
import { GlobalExceptionFilter } from "./common/http-exception.filter";
import { MetricsService } from "./metrics/metrics.service";
import { CorrelationLogger } from "./common/logger/correlation-logger.service";
import { correlationStorage } from "./common/middleware/correlation-id.middleware";
import type { IncomingMessage, ServerResponse } from "node:http";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CorrelationLogger(),
  });
  app.enableShutdownHooks();

  const metricsService = app.get(MetricsService, { strict: false });

  // Strict CORS whitelist from FRONTEND_URL
  const allowedOrigins = env.FRONTEND_URL
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // Standard HTTP security headers
  app.use((_req: unknown, res: { setHeader: (k: string, v: string) => void }, next: () => void) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';");
    next();
  });

  // Production HTTPS redirection
  if (env.NODE_ENV === "production") {
    app.use((req: IncomingMessage & { secure?: boolean; headers: Record<string, string | string[] | undefined>; url?: string }, res: ServerResponse, next: () => void) => {
      const forwardedProto = req.headers["x-forwarded-proto"];
      const isHttps = req.secure || forwardedProto === "https";
      if (!isHttps) {
        const host = req.headers.host || "localhost";
        res.writeHead(301, {
          Location: `https://${host}${req.url || ""}`,
        });
        res.end();
        return;
      }
      next();
    });
  }

  // Structured Logging & Prometheus Request Recording Middleware (Zero PII leak)
  app.use((req: IncomingMessage & { originalUrl?: string; url?: string; user?: { id?: string; organizationId?: string } }, res: ServerResponse, next: () => void) => {
    const start = Date.now();
    const rawUrl = req.originalUrl || req.url || "/";
    const cleanPath = rawUrl.split("?")[0];

    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const status = res.statusCode;

      // 1. Record Prometheus metrics
      if (metricsService) {
        metricsService.recordRequest(cleanPath, status, durationMs);
      }

      // 2. Structured JSON logging (skip polling noise on /health and /metrics unless error)
      if ((cleanPath === "/health" || cleanPath === "/metrics") && status < 400) {
        return;
      }

      const logPayload = {
        level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
        timestamp: new Date().toISOString(),
        type: "HTTP_ACCESS",
        requestId:
          correlationStorage.getStore()?.requestId ||
          (res.getHeader("X-Request-ID") as string) ||
          "-",
        method: req.method,
        path: cleanPath,
        status,
        latencyMs: durationMs,
        userId: req.user?.id || "-",
        orgId: req.user?.organizationId || "-",
      };
      console.log(JSON.stringify(logPayload));
    });

    next();
  });

  // Lightweight cookie parser middleware
  app.use((req: { headers?: { cookie?: string }; cookies?: Record<string, string> }, _res: unknown, next: () => void) => {
    if (req.headers?.cookie && !req.cookies) {
      const parsed: Record<string, string> = {};
      const pairs = req.headers.cookie.split(";");
      for (const pair of pairs) {
        const idx = pair.indexOf("=");
        if (idx > 0) {
          const key = decodeURIComponent(pair.slice(0, idx).trim());
          const val = decodeURIComponent(pair.slice(idx + 1).trim());
          parsed[key] = val;
        }
      }
      req.cookies = parsed;
    } else if (!req.cookies) {
      req.cookies = {};
    }
    next();
  });

  // Global validation pipe for incoming request payloads
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter handling Rate Limiting (429) and standard HTTP errors
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Graceful shutdown on SIGTERM / SIGINT with 30s timeout guard
  const gracefulShutdown = async (signal: string) => {
    console.log(`[Lifecycle] Received ${signal}. Starting 30s graceful shutdown drain...`);
    const forceExitTimer = setTimeout(() => {
      console.error("[Lifecycle] Graceful shutdown timeout (30s) exceeded. Forcing process exit.");
      process.exit(1);
    }, 30000);
    forceExitTimer.unref?.();

    try {
      await app.close();
      clearTimeout(forceExitTimer);
      console.log("[Lifecycle] HaiHire backend shutdown completed cleanly.");
      process.exit(0);
    } catch (err: unknown) {
      clearTimeout(forceExitTimer);
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Lifecycle] Error during shutdown:", msg);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  await app.listen(env.PORT, "0.0.0.0");
  console.log(`HaiHire Backend running at http://0.0.0.0:${env.PORT}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

