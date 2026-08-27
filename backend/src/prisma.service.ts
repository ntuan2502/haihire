import { Injectable } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { connectDatabase, db } from "./prisma/db";

@Injectable()
export class PrismaService implements OnModuleInit {
  readonly db = db;

  async onModuleInit() {
    try {
      await connectDatabase();
      const existingUser = await this.db.orm.public.User.select("id").first();
      if (!existingUser) {
        const hashedPassword = bcrypt.hashSync("password123", 10);
        await this.db.orm.public.User.upsert({
          create: {
            email: "demo@tun.io.vn",
            name: "Demo Recruiter",
            role: "HR",
            password: hashedPassword,
            organizationId: null,
          },
          update: {},
          conflictOn: { id: "00000000-0000-0000-0000-000000000000" },
        });
        console.log("Initialized default demo recruiter: demo@tun.io.vn");
      }
    } catch (error: any) {
      console.warn("Database connection pending or initializing...", error?.message ?? error);
    }
  }
}
