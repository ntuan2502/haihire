import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Injectable()
export class AppService {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
  ) {}

  getRoot() {
    return {
      message: "hello from create-prisma + nest",
    };
  }

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
