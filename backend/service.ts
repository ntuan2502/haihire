import node from "@prisma/composer/node";
import { compute } from "@prisma/composer-prisma-cloud";
import { pnPostgres } from "@prisma/composer-prisma-cloud/prisma-next";

import { appContract } from "./src/prisma/composer.ts";

export default compute({
  name: "app",
  deps: {
    database: pnPostgres(appContract),
  },
  build: node({ module: import.meta.url, entry: "./dist/server.mjs" }),
});
