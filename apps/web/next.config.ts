import type { NextConfig } from "next";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

function findWorkspaceRoot(): string {
  let curr = process.cwd();
  while (curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, "pnpm-workspace.yaml"))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  return process.cwd();
}

const repoRoot = findWorkspaceRoot();

const rootEnv = path.resolve(repoRoot, ".env");
if (fs.existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

const frontendPort = process.env.FRONTEND_PORT || process.env.PORT || "3000";
const gatewayPort = process.env.GATEWAY_PORT || "8080";

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    `localhost:${frontendPort}`,
    `localhost:${gatewayPort}`,
    "127.0.0.1",
    `127.0.0.1:${frontendPort}`,
    `127.0.0.1:${gatewayPort}`,
    "0.0.0.0",
    `0.0.0.0:${frontendPort}`,
    `0.0.0.0:${gatewayPort}`,
    "*.local",
  ]);

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (
        iface.family === "IPv4" ||
        (iface.family as unknown as number) === 4
      ) {
        const ip = iface.address;
        origins.add(ip);
        origins.add(`${ip}:${frontendPort}`);
        origins.add(`${ip}:${gatewayPort}`);

        // Automatically allow entire /24 subnet of current network interface
        const parts = ip.split(".");
        if (parts.length === 4) {
          const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
          for (let i = 1; i <= 254; i++) {
            const subnetIp = `${prefix}.${i}`;
            origins.add(subnetIp);
            origins.add(`${subnetIp}:${frontendPort}`);
            origins.add(`${subnetIp}:${gatewayPort}`);
          }
        }
      }
    }
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: repoRoot,
  allowedDevOrigins: getAllowedDevOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "minio",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "www.gravatar.com",
      },
    ],
  },
};

export default nextConfig;
