import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { env } from "./src/config/env";

export default definePrismaConfig({
  skills: {
    agents: ["agents"],
  },
  orm: ormConfig({
    contract: "./src/prisma/contract.prisma",
    db: {
      connection: env.DATABASE_URL,
    },
  }),
  composer: {
    configPath: "./prisma-composer.config.ts",
  },
});
