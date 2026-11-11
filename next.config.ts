import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["unpdf", "mammoth", "@electric-sql/pglite"],
  // modo demonstração: o banco embutido lê as migrações e os arquivos do PGlite em tempo de execução
  outputFileTracingIncludes: { "/**": ["./supabase/**/*.sql", "./node_modules/@electric-sql/pglite/dist/**/*"] },
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
