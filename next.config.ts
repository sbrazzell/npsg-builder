import type { NextConfig } from "next";

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
  // Content Security Policy — restrict resource origins
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js needs unsafe-eval in dev; in prod it's fine to remove it but we keep it here for simplicity
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      // Google profile photos for signed-in users
      "img-src 'self' blob: data: https://lh3.googleusercontent.com",
      "font-src 'self'",
      // Google OAuth redirect
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
