/** @type {import('next').NextConfig} */
const config = {
  transpilePackages: ["@satkey/protocol"],
  experimental: {
    serverComponentsExternalPackages: ["ssh2"],
  },
};

export default config;
