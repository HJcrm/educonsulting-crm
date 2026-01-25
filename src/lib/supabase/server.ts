import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * 서버 사이드용 Supabase 클라이언트 (anon key)
 * RLS 정책 적용됨
 */
export function createServerClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * 서버 사이드용 Supabase 클라이언트 (service role key)
 * RLS 우회, webhook insert 등에 사용
 * 주의: 이 클라이언트는 서버에서만 사용해야 함
 */
export function createServiceClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
