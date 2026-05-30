import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is required by Next.js dev/runtime; connect.facebook.net for Meta Embedded Signup SDK
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Same-origin API + WebSocket (socket.io) plus Meta Graph API
              "connect-src 'self' ws: wss: https://graph.facebook.com https://www.facebook.com",
              // Meta Embedded Signup renders inside an iframe served from facebook.com
              "frame-src 'self' https://www.facebook.com https://web.facebook.com https://business.facebook.com",
              "form-action 'self' https://www.facebook.com",
              "base-uri 'self'",
              "frame-ancestors 'self'",
            ].join('; ')
          }
        ]
      }
    ];
  }
};

export default nextConfig;
