#!/usr/bin/env bash
# PostToolUse(Edit|Write): 編集されたファイルを Prettier で自動整形する。
# 整形の失敗でツールを止めないよう、常に exit 0。
set -u

input=$(cat)
file=$(printf '%s' "$input" | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{try{process.stdout.write(String(JSON.parse(d).tool_input.file_path||""))}catch(e){}})' 2>/dev/null)

[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs | *.json | *.css | *.md | *.mdx | *.yaml | *.yml) ;;
  *) exit 0 ;;
esac

if [ -x node_modules/.bin/prettier ]; then
  node_modules/.bin/prettier --write --ignore-unknown "$file" >/dev/null 2>&1 || true
fi

exit 0
