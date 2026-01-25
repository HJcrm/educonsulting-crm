-- 희망계열 컬럼 추가
-- 실행: Supabase SQL Editor에서 직접 실행하거나 supabase db push

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS desired_track TEXT;

COMMENT ON COLUMN leads.desired_track IS '희망계열 (예: 이과계열, 문과계열, 예체능 등)';
