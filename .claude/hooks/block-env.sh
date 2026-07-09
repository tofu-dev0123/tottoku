#!/usr/bin/env bash
# PreToolUse(Edit|Write): .env ファイルへの書き込みをブロックする（秘密情報のコミット防止）。
# .env.example のみ許可。ブロック時は exit 2 で Claude に理由を返す。
set -u

input=$(cat)
file=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).tool_input.file_path||""))}catch(e){}})' 2>/dev/null)

[ -z "$file" ] && exit 0
base=$(basename "$file")

case "$base" in
  .env.example) exit 0 ;;
  .env | .env.*)
    echo ".env ファイル ($base) への書き込みはブロックされています。秘密情報は環境変数(Vercel)で管理し、リポジトリに含めないでください。テンプレートが必要なら .env.example を使ってください。" >&2
    exit 2
    ;;
esac

exit 0
