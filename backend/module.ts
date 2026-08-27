import { module } from "@prisma/composer";
import { pnPostgres } from "@prisma/composer-prisma-cloud/prisma-next";

import { appContract } from "./src/prisma/composer.ts";
import app from "./service.ts";

export default module("backend", ({ provision }) => {
  const database = provision(
    pnPostgres({
      name: "database",
      contract: appContract,
      config: "./prisma.config.ts",
    }),
    { id: "database" },
  );

  provision(app, { deps: { database } });
});
