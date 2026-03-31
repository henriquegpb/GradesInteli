import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  experimental: {
    devtoolSegmentExplorer: false,
  },
};

export default nextConfig;
