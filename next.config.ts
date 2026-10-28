import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  poweredByHeader: false,
  // значок dev-режима перекрывает плашку «Сравнить» внизу экрана; ошибки Next всё равно покажет
  devIndicators: false,
  // База собирается при деплое (`npm run vercel-build`) и должна попасть в серверные функции
  outputFileTracingIncludes: { "/**": ["./data/trajectory.db"] },
};

export default nextConfig;
