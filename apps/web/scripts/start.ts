import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const candidateEnvs = [
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env"),
];
const rootEnv = candidateEnvs.find((p) => fs.existsSync(p));
if (rootEnv) {
  process.loadEnvFile(rootEnv);
}

const frontendPort =
  Number(process.env.FRONTEND_PORT) || Number(process.env.PORT) || 3000;

console.log(
  `[web start] Starting Next.js production server on port ${frontendPort}...`,
);

const nextBin = require.resolve("next/dist/bin/next");
const child = spawn(
  process.execPath,
  [nextBin, "start", "-p", String(frontendPort)],
  {
    stdio: "inherit",
    env: { ...process.env, PORT: String(frontendPort) },
  },
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
