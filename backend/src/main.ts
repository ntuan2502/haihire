import "dotenv/config";
import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  // Global validation pipe for incoming request payloads
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const rawPort = (process.env.PORT ?? "").trim();
  const parsedPort = rawPort.length > 0 ? Number(rawPort) : Number.NaN;
  const port =
    Number.isFinite(parsedPort) && parsedPort >= 0 && parsedPort <= 65535 ? parsedPort : 3001;

  await app.listen(port);
  console.log(`ATS Backend running at http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
