/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for better debugging
  reactStrictMode: true,
  
  // Output standalone for Vercel
  output: 'standalone',
  
  // Environment variable validation
  env: {
    NEXT_PUBLIC_GATEKEEPER_URL: process.env.NEXT_PUBLIC_GATEKEEPER_URL,
  },
  
  // Handle ngrok headers for development
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: '1',
          },
        ],
      },
    ];
  },
  
  // Ignore TypeScript errors during build for hackathon (remove in production)
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
