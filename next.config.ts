import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // クライアント Router Cache の再利用時間(秒)。
    // 再遷移・戻る/進む時にサーバー(Neon)へ再クエリせずキャッシュを使う。
    // 変更(作成/更新/削除)は各ハンドラの router.refresh() が Router Cache を破棄するため、
    // 自分の編集は即時反映。家族の変更は最大 dynamic 秒だけ古く見える(数分許容の方針)。
    // 設計の全体像は docs/caching-strategy.md を参照。
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default nextConfig;
