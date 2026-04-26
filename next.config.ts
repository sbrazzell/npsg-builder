import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === 'development'

const securityHeaders = [
  // Prevent clickjacking — page cannot be embedded in an iframe
  { key: 'X-Frame-Options',        value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't send the full URL as the Referer to external sites
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Only allow HTTPS for 2 years (including subdomains)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Disable browser features that aren't needed
  { key: 'Permissions-Policy',     value: 'camera=(), microphone=(), geolocation=()' },
  // Content Security Policy — strict in production, relaxed in dev for HMR
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // unsafe-eval only in dev (Next.js HMR requires it); removed in production
      isDev ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Google profile photos for signed-in users
      "img-src 'self' blob: data: https://lh3.googleusercontent.com",
      "font-src 'self'",
      // Google OAuth + Anthropic API (for server-side AI calls, connect-src covers fetch from client)
      "connect-src 'self' https://accounts.google.com",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
