import { NextResponse } from "next/server";

// ドメイン層から投げるHTTPエラー。Route Handler が {error} + status に変換する。
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** 例外を {error} レスポンスに変換する。HttpError は自身の status、他は 500。 */
export function toErrorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "internal_error" }, { status: 500 });
}
