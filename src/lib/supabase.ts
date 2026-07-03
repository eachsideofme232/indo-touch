import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 듀얼 클라이언트 패턴:
// - service role: API 라우트(스캔/리포트 파이프라인) 전용, RLS 우회. 절대 클라이언트에 노출 금지.
// - anon: 대시보드 Server Component 읽기 전용 (RLS로 select만 허용).

export function createServiceClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
  );
}

export function createAnonClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false } },
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
