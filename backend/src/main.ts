import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { env } from "./config/env";
import { GlobalExceptionFilter } from "./common/http-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  await app.listen(env.PORT, "0.0.0.0");
  console.log(`HaiHire Backend running at http://0.0.0.0:${env.PORT}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
