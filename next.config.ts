import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: 'http://127.0.0.1:8000/api/auth/:path*', // Proxy to FastAPI
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*', // Fallback for other API routes if they don't exist in Next.js
      },
    ];
  },
};

export default nextConfig;
