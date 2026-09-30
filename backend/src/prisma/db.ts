import postgres from "@prisma/orm-postgres/runtime";
import dotenv from "dotenv";
import path from "node:path";

import service from "../../service.ts";
import type { Contract } from "./contract.d.ts";
import contractJson from "./contract.json" with { type: "json" };

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "backend/.env") });
dotenv.config();

function loadComposerDatabase() {
  try {
    return service.load().database.client;
  } catch {
    return undefined;
  }
}

const databaseUrl = process.env.DATABASE_URL;

export const db = databaseUrl
  ? postgres<Contract>({ contractJson, url: databaseUrl })
  : (loadComposerDatabase() ?? postgres<Contract>({ contractJson }));

let connection: Promise<void> | undefined;

export function connectDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  connection ??= (url ? db.connect({ url }) : db.connect())
    .then(() => undefined)
    .catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  return connection;
}
