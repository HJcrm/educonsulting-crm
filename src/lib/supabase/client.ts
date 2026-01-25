import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * 클라이언트 사이드용 Supabase 클라이언트
 * anon key 사용, RLS 정책 적용됨
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}
