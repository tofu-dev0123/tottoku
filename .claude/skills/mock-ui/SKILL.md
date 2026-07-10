---
name: mock-ui
description: >-
  実装前に UI をHTMLモックで素早く作り、Playwright でスクリーンショットを撮って見た目を確認するためのスキル。
  画面デザインの検討・レイアウト案・「モックを作って」「画面イメージを見たい」「デザインを先に固めたい」
  「PC/スマホでの見え方を確認したい」といった要望のときは必ずこのスキルを使う。
  React/本実装を書く前の design-first なワークフロー。成果物(HTML と PNG)は docs/mock/ に置く。
---

# mock-ui — HTML モック + スクリーンショット

React で作り込む前に、**自己完結した HTML でUIモックを作り、Playwright で撮影して見た目を確認する**ためのワークフロー。実装より速く反復でき、スクショで認識合わせができる。

## いつ使うか

- 新しい画面・レイアウトのデザインを固めたいとき
- PC / スマホでの見え方を先に確認したいとき
- 本実装(React コンポーネント)を書く前の design-first な検討

## 進め方

1. **モック HTML を作る** — `docs/mock/<画面名>.html` に**自己完結した HTML**で書く。
   - 依存を避けるため **CSS は `<style>` にインライン**、アイコンは inline SVG。外部 CDN/ネットワークに依存しない(スクショが決定論的になる)。
   - 実アセット(ロゴ等)は相対パスで参照してよい(例 `../../public/tottoku.png`)。
   - 本アプリの世界観に合わせる: アクセント `#185fa5`、危険=赤/注意=黄、角丸・淡いボーダーの落ち着いた見た目。日本語 UI。
2. **スクリーンショットを撮る** — 同梱スクリプトで撮影し `docs/mock/` に PNG を出力する。
   - デスクトップ: `node .claude/skills/mock-ui/scripts/screenshot.mjs docs/mock/foo.html docs/mock/foo-desktop.png 1440 900`
   - モバイル: `... docs/mock/foo.html docs/mock/foo-mobile.png 390 844`
   - `nix develop --command bash -c '...'` 経由で実行(Node/Playwright は dev shell 側)。
3. **見た目を確認する** — 出力 PNG を Read して確認し、必要なら HTML を直して撮り直す。ユーザーにも共有する。
4. **確定したら本実装へ** — モックはデザインの正ではなく検討用。確定後は React で実装し直す(モックの CSS をそのまま持ち込まない)。

## 前提

- `playwright`(devDependency)と Chromium が必要。未導入なら:
  `pnpm add -D playwright && pnpm exec playwright install chromium`
- スクリーンショットは `deviceScaleFactor: 2`・`fullPage: true`(縦は全体をキャプチャ)。

## 配置

- モック HTML と PNG は必ず **`docs/mock/`** に置く(例: `dashboard-desktop.html` / `dashboard-desktop.png`)。
- 命名は `<画面>-<desktop|mobile>.{html,png}` を基本にする。
