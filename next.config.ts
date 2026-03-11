import type { NextConfig } from "next";

// We run validation here so it checks during Vercel's build phase
if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development') {
  // Dynamic import to avoid issues if the file doesn't exist during some build steps
  import('./src/lib/env-check')
    .then(mod => mod.validateEnv())
    .catch(err => console.warn('Env validation check skipped.', err));
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/:path*`, // Proxy to FastAPI
      },
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || ''}/:path*`, // Fallback for other API routes
      },
    ];
  },
};

export default nextConfig;
