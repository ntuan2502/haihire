import "dotenv/config";
import process from "node:process";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection:
        process.env.DATABASE_URL ||
        "postgresql://ats_user:ats_password@localhost:5432/ats_db?schema=public",
    },
  }),
  composer: {
    configPath: "./prisma-composer.config.ts",
  },
});
