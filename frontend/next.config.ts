import type { NextConfig } from "next";

function normalizeBackendBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

const backendBaseUrl = normalizeBackendBaseUrl(
  process.env.DJANGO_BACKEND_URL ?? "http://127.0.0.1:8000"
);

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendBaseUrl}/api/:path*`,
      },
      {
        source: "/backend/:path*",
        destination: `${backendBaseUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
