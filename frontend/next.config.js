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
  
  // Handle headers for development and CSP for RainbowKit/Wagmi
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: '1',
          },
          // Required for RainbowKit/Wagmi which uses eval-like code internally
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; img-src 'self' data: https:; font-src 'self' data:;",
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
