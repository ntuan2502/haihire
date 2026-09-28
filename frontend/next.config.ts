import type { NextConfig } from "next";
import os from "node:os";

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "localhost:3000",
    "127.0.0.1",
    "127.0.0.1:3000",
    "0.0.0.0",
    "0.0.0.0:3000",
    "*.local",
  ]);

  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" || (iface.family as unknown as number) === 4) {
        const ip = iface.address;
        origins.add(ip);
        origins.add(`${ip}:3000`);

        // Tự động cho phép toàn bộ dải mạng /24 của card mạng hiện tại
        const parts = ip.split(".");
        if (parts.length === 4) {
          const prefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
          for (let i = 1; i <= 254; i++) {
            const subnetIp = `${prefix}.${i}`;
            origins.add(subnetIp);
            origins.add(`${subnetIp}:3000`);
          }
        }
      }
    }
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:3001/:path*",
      },
      {
        source: "/organizations/:path*",
        destination: "http://127.0.0.1:3001/organizations/:path*",
      },
      {
        source: "/jobs/:path*",
        destination: "http://127.0.0.1:3001/jobs/:path*",
      },
      {
        source: "/applications/:path*",
        destination: "http://127.0.0.1:3001/applications/:path*",
      },
      {
        source: "/users/:path*",
        destination: "http://127.0.0.1:3001/users/:path*",
      },
      {
        source: "/events/:path*",
        destination: "http://127.0.0.1:3001/events/:path*",
      },
      {
        source: "/haihire-resumes/:path*",
        destination: "http://127.0.0.1:9000/haihire-resumes/:path*",
      },
    ];
  },
};

export default nextConfig;
