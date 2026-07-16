import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 배포: 최소 실행 파일만 담은 standalone 서버 출력(.next/standalone → node server.js)
  output: "standalone",
};

export default nextConfig;
