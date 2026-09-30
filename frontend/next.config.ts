import type { NextConfig } from "next";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

const rootEnv = path.resolve(process.cwd(), "..", ".env");
if (fs.existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}
const localEnv = path.resolve(process.cwd(), ".env");
if (fs.existsSync(localEnv)) {
  process.loadEnvFile(localEnv);
}

const frontendPort = process.env.FRONTEND_PORT || process.env.PORT || "3000";
const backendPort = process.env.BACKEND_PORT || "3001";
const minioPort = process.env.MINIO_PORT || "9000";
const backendUrl = process.env.BACKEND_HOST
  ? `http://${process.env.BACKEND_HOST}:${backendPort}`
  : (process.env.INTERNAL_API_URL || `http://127.0.0.1:${backendPort}`);
const minioUrl = process.env.MINIO_HOST
  ? `http://${process.env.MINIO_HOST}:${minioPort}`
  : `http://127.0.0.1:${minioPort}`;

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    `localhost:${frontendPort}`,
    "127.0.0.1",
    `127.0.0.1:${frontendPort}`,
    "0.0.0.0",
    `0.0.0.0:${frontendPort}`,
    "*.local",
  ]);

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" || (iface.family as unknown as number) === 4) {
        const ip = iface.address;
        origins.add(ip);
        origins.add(`${ip}:${frontendPort}`);

        // Tự động cho phép toàn bộ dải mạng /24 của card mạng hiện tại
        const parts = ip.split(".");
        if (parts.length === 4) {
          const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
          for (let i = 1; i <= 254; i++) {
            const subnetIp = `${prefix}.${i}`;
            origins.add(subnetIp);
            origins.add(`${subnetIp}:${frontendPort}`);
          }
        }
      }
    }
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  output: "standalone",
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
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
      {
        source: "/organizations/:path*",
        destination: `${backendUrl}/organizations/:path*`,
      },
      {
        source: "/jobs/:path*",
        destination: `${backendUrl}/jobs/:path*`,
      },
      {
        source: "/applications/:path*",
        destination: `${backendUrl}/applications/:path*`,
      },
      {
        source: "/users/:path*",
        destination: `${backendUrl}/users/:path*`,
      },
      {
        source: "/events/:path*",
        destination: `${backendUrl}/events/:path*`,
      },
      {
        source: "/haihire-resumes/:path*",
        destination: `${minioUrl}/haihire-resumes/:path*`,
      },
    ];
  },
};

export default nextConfig;
