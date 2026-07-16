import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        // The separate admin portal was retired — every role now signs in
        // through the one common login form.
        source: "/login/admin",
        destination: "/login",
        permanent: true,
      },
    ];
  },
  experimental: {
    // Every page here is per-user (cookies-based auth). Without this, the
    // client Router Cache can reuse an RSC payload rendered for a previous
    // session in the same tab after switching accounts, showing one user's
    // page content under another user's header.
    // `static` has an enforced minimum of 30s in this Next version — it only
    // applies to routes explicitly prefetched with `prefetch={true}`, which
    // nothing in this app uses, so the floor value is inert here anyway.
    staleTimes: {
      dynamic: 0,
      static: 30,
    },
  },
};

export default nextConfig;
