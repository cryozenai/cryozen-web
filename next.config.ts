import type { NextConfig } from "next";

/*
 * Content Security Policy.
 *
 * `'unsafe-inline'` on script-src is deliberate. Next.js inlines its bootstrap
 * and streaming payload into the document, so the alternative is a per-request
 * nonce, which requires middleware and turns every page dynamic - trading the
 * static prerendering this site is built on for a guarantee it barely needs.
 * The injection surface here is a marketing site with no user input, no auth,
 * and no cookies. The one piece of third-party content is GitHub release-note
 * markdown on /changelog, which react-markdown escapes rather than renders as
 * HTML and whose URLs it filters, so `javascript:` links never reach the DOM.
 *
 * Revisit this the moment the site grows a form, a login, or raw HTML
 * rendering: at that point nonces are worth the dynamic rendering.
 *
 * `'unsafe-inline'` on style-src is not optional - Tailwind and the decorative
 * gradients set inline styles, and CSP has no nonce-free way around it.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  // data: covers the generated OG image; blob: covers Next's image pipeline.
  "img-src 'self' data: blob:",
  // next/font self-hosts Geist at build time, so no external font origin.
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    /*
     * Two years, subdomains included. No `preload`: that directive is a
     * request to be baked into browsers' preload lists, which is slow to
     * reverse, and it should be a deliberate submission rather than a side
     * effect of a header. includeSubDomains does commit every future
     * *.cryozen.ai host to HTTPS.
     */
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Redundant with frame-ancestors for modern browsers, kept for old ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    // The site uses none of these; deny them rather than leave them open.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
