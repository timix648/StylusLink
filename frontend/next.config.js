/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_GATEKEEPER_URL: process.env.NEXT_PUBLIC_GATEKEEPER_URL,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'ngrok-skip-browser-warning',
            value: '1',
          },
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:; img-src 'self' data: https:; font-src 'self' data:;",
          },
        ],
      },
    ];
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
