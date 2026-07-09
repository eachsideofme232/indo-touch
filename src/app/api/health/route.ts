import { NextResponse } from "next/server";

// Fluid Compute 검증 라우트: Hobby 기본 10초 제한을 넘겨 실행되어야 함.
// 프로덕션에서 15초 후 200이 오면 maxDuration이 실제로 적용된 것.
export const maxDuration = 300;

const HOLD_SECONDS = 15;

export async function GET() {
  const startedAt = Date.now();
  await new Promise((resolve) => setTimeout(resolve, HOLD_SECONDS * 1000));

  return NextResponse.json({
    status: "ok",
    heldForMs: Date.now() - startedAt,
    fluidComputeVerified: true,
  });
}
