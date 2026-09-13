import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker edge deployment.
  // Only activate when NEXT_OUTPUT=standalone (set in Dockerfile ENV).
  // Do NOT enable by default — causes PageNotFoundError with workspace root
  // detection when a package-lock.json exists in a parent directory.
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
  // Skip type errors during `next build` in Phase 0.
  // Run `npm run typecheck` separately for strict checking.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Skip ESLint errors during build (run `npm run lint` separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [],
  },
  // Node.js built-ins used in RAG retriever (fs) and ABDM crypto — keep server-side only
  serverExternalPackages: ["fs", "path", "crypto"],
  // Security headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=self, microphone=self, geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
