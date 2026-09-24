import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Google アカウントのプロフィール画像(lh3.googleusercontent.com 等)を next/image で表示するため許可。
    remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com" }],
  },
  experimental: {
    // クライアント Router Cache の再利用時間(秒)。
    // (filer) 内の遷移は pushState + クライアントストアのため関与せず、(filer) 外のページ(通知・設定)
    // との行き来や、外から (filer) へ入るときの RSC の再利用に効く。
    // 設計の全体像は docs/caching-strategy.md を参照。
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
