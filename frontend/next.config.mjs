/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No ESLint config is shipped with this starter; don't block builds on it.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
