import { Injectable } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import { connectDatabase, db } from "./prisma/db";

@Injectable()
export class PrismaService implements OnModuleInit {
  readonly db = db;

  async onModuleInit() {
    try {
      await connectDatabase();
    } catch (error: any) {
      console.warn("Database connection pending or initializing...", error?.message ?? error);
    }
  }
}
