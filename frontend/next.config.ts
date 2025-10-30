import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'arweave.net',
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'devnet.irys.xyz',
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'irys.xyz',
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: "",
        pathname: "/**",
      },
      {
        protocol: 'https',
        hostname: 'nftstorage.link',
        port: "",
        pathname: "/**",
      },
    ],
  }
};

export default nextConfig;
