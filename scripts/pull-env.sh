#!/usr/bin/env bash
#
# Vercel の VERCEL_OIDC_TOKEN を取り直しつつ、既存 .env.local の値を壊さない。
#
# 背景: Vercel の Sensitive 変数(AUTH_* / DATABASE_URL / AWS_* / S3_BUCKET など)は
#       `vercel env pull` で値が空になって返る。素で pull すると既存の実値が消える。
# 方針: 退避 -> 取得 -> マージ。退避した既存値を「正」とし、取得結果からは
#       最新の VERCEL_OIDC_TOKEN だけを取り込む(他の pull 値は使わない)。
#
# 使い方:  pnpm env:pull            (既定: preview)
#          pnpm env:pull production (環境を指定)

set -euo pipefail

cd "$(dirname "$0")/.."

ENV_FILE=".env.local"
BACKUP="${ENV_FILE}.bak"
ENVIRONMENT="${1:-preview}"

# 1) 退避
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$BACKUP"
  echo "退避: $ENV_FILE -> $BACKUP"
else
  echo "既存の $ENV_FILE が無いため、取得結果をそのまま採用します。"
fi

# 2) Vercel から取得($ENV_FILE を上書き)
pnpm dlx vercel env pull "$ENV_FILE" --environment "$ENVIRONMENT" --yes

# 3) マージ(退避ファイルがある場合のみ)
if [ -f "$BACKUP" ]; then
  oidc="$(grep -E '^VERCEL_OIDC_TOKEN=' "$ENV_FILE" || true)"
  if [ -z "$oidc" ]; then
    echo "ERROR: 取得結果に VERCEL_OIDC_TOKEN がありません。退避ファイルから復元して中止します。" >&2
    cp "$BACKUP" "$ENV_FILE"
    exit 1
  fi
  # 退避した既存値を土台に、OIDC トークン行だけ最新へ差し替える。
  { grep -vE '^VERCEL_OIDC_TOKEN=' "$BACKUP"; printf '%s\n' "$oidc"; } > "$ENV_FILE"
  echo "マージ完了: 既存の値を維持し、VERCEL_OIDC_TOKEN のみ更新しました。"
fi

echo "完了: $ENV_FILE ($ENVIRONMENT)"
