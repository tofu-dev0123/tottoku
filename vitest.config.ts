import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // tsconfig の paths を反映
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // server-only は Node 実行時に例外を投げるため、テストでは空モジュールへ差し替える
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
