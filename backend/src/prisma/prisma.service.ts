import { Injectable } from "@nestjs/common";
import type { OnModuleInit } from "@nestjs/common";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { connectDatabase, db } from "./db";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../auth/constants";

@Injectable()
export class PrismaService implements OnModuleInit {
  readonly db = db;

  async onModuleInit() {
    try {
      await connectDatabase();
      const existingUser = await this.db.orm.public.User.select("id").first();
      if (!existingUser) {
        const hashedPassword = bcrypt.hashSync(DEMO_PASSWORD, 10);
        const adminUserId = crypto.randomUUID();
        const adminOrgId = crypto.randomUUID();
        const memberUserId = crypto.randomUUID();

        await this.db.orm.public.Organization.upsert({
          create: {
            id: adminOrgId,
            name: "Admin",
            slug: "admin",
            ownerId: adminUserId,
          },
          update: {
            name: "Admin",
            ownerId: adminUserId,
          },
          conflictOn: { slug: "admin" },
        });

        await this.db.orm.public.User.upsert({
          create: {
            id: adminUserId,
            email: DEMO_ACCOUNTS.ADMIN.email,
            name: DEMO_ACCOUNTS.ADMIN.name,
            role: DEMO_ACCOUNTS.ADMIN.role,
            password: hashedPassword,
            organizationId: adminOrgId,
          },
          update: {},
          conflictOn: { email: DEMO_ACCOUNTS.ADMIN.email },
        });

        await this.db.orm.public.User.upsert({
          create: {
            id: memberUserId,
            email: DEMO_ACCOUNTS.MEMBER.email,
            name: DEMO_ACCOUNTS.MEMBER.name,
            role: DEMO_ACCOUNTS.MEMBER.role,
            password: hashedPassword,
            organizationId: null,
          },
          update: {},
          conflictOn: { email: DEMO_ACCOUNTS.MEMBER.email },
        });
        console.log(
          `Initialized default demo accounts: ${DEMO_ACCOUNTS.ADMIN.email} (ADMIN - Org Admin), ${DEMO_ACCOUNTS.MEMBER.email} (MEMBER - No Org)`,
        );
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn("Database connection pending or initializing...", msg);
    }
  }
}
