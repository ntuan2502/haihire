import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load single source: root .env
const candidateEnvs = [
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(process.cwd(), ".env"),
];
const rootEnv = candidateEnvs.find((p) => fs.existsSync(p));
if (rootEnv) {
  process.loadEnvFile(rootEnv);
} else {
  console.error("Root .env not found in candidates:", candidateEnvs);
  process.exit(1);
}

// Set PORT for Next.js from FRONTEND_PORT (if not already set)
if (!process.env.PORT && process.env.FRONTEND_PORT) {
  process.env.PORT = process.env.FRONTEND_PORT;
}

const backendHost = process.env.BACKEND_HOST || "127.0.0.1";
const backendPort = Number(process.env.BACKEND_PORT) || 3001;
const frontendPort = Number(process.env.FRONTEND_PORT) || Number(process.env.PORT) || 3000;

function waitForBackend(host: string, port: number, timeoutMs = 60000): Promise<boolean> {
  const start = Date.now();
  return new Promise((resolve) => {
    function tryConnect() {
      const socket = net.createConnection(port, host);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          console.warn(`[web dev] Backend on port ${port} not reachable within timeout. Starting web anyway.`);
          resolve(false);
        } else {
          setTimeout(tryConnect, 400);
        }
      });
    }
    tryConnect();
  });
}

async function main() {
  console.log(`[web dev] Waiting for backend on ${backendHost}:${backendPort}...`);
  await waitForBackend(backendHost, backendPort);
  console.log(`[web dev] Starting Next.js on port ${frontendPort}...`);

  const child = spawn("pnpm", ["exec", "next", "dev"], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(frontendPort) },
    shell: true,
  });

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
