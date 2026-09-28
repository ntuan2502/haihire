import { Controller, Get, Inject } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  getRoot() {
    return {
      message: "hello from create-prisma + nest",
    };
  }

  @Get("health")
  async getHealth() {
    let dbStatus = "up";
    try {
      await this.prismaService.db.orm.public.User.select("id").first();
    } catch {
      dbStatus = "down";
    }

    return {
      status: dbStatus === "up" ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbStatus,
      },
    };
  }
}

