import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // База собирается при деплое (`npm run vercel-build`) и должна попасть в серверные функции
  outputFileTracingIncludes: { "/**": ["./data/trajectory.db"] },
};

export default nextConfig;
