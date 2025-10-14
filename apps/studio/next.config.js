/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  experimental: {
    serverSourceMaps: true
  }
};
module.exports = nextConfig;


