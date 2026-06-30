/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @libsql/client is a native-ish dep; keep it external to the server bundle.
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client", "libsql"],
  },
};

module.exports = nextConfig;
