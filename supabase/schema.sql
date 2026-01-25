-- =========================================
-- 입시컨설팅 CRM Supabase 스키마
-- =========================================

-- 1. stage enum 타입 생성
DO $$ BEGIN
    CREATE TYPE lead_stage AS ENUM ('NEW', 'CONTACTED', 'BOOKED', 'CONSULTED', 'PAID', 'LOST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. interaction type enum 생성
DO $$ BEGIN
    CREATE TYPE interaction_type AS ENUM ('CALL', 'KAKAO', 'SMS', 'MEETING', 'MEMO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. appointment status enum 생성
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('BOOKED', 'DONE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================================
-- 테이블: leads (리드/상담문의)
-- =========================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 유입 소스
    source TEXT NOT NULL DEFAULT 'tally',
    form_submission_id TEXT UNIQUE,

    -- 학부모/학생 정보
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    student_grade TEXT,
    desired_track TEXT, -- 희망계열 (예: 이과계열, 문과계열)
    region TEXT -- 지역 (향후 확장용)

    -- 상담 관련
    desired_timing TEXT, -- 상담 원하는 시기
    question_context TEXT, -- 궁금한 상황

    -- 파이프라인 단계
    stage lead_stage NOT NULL DEFAULT 'NEW',

    -- UTM 파라미터
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,

    -- 원본 데이터 (디버깅/추적용)
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- leads 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_parent_phone ON leads(parent_phone);
CREATE INDEX IF NOT EXISTS idx_leads_parent_name ON leads(parent_name);

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 테이블: interactions (상담기록/메모)
-- =========================================
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    type interaction_type NOT NULL DEFAULT 'MEMO',
    content TEXT NOT NULL,
    created_by TEXT -- 추후 사용자 연동 대비
);

-- interactions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_interactions_lead_id ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON interactions(created_at DESC);

-- =========================================
-- 테이블: appointments (상담예약)
-- =========================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    scheduled_at TIMESTAMPTZ NOT NULL,
    status appointment_status NOT NULL DEFAULT 'BOOKED',
    notes TEXT
);

-- appointments 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- =========================================
-- RLS (Row Level Security) 정책
-- =========================================

-- RLS 활성화
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (재실행 시 충돌 방지)
DROP POLICY IF EXISTS "Allow authenticated read leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated insert leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated update leads" ON leads;
DROP POLICY IF EXISTS "Allow authenticated delete leads" ON leads;
DROP POLICY IF EXISTS "Allow service role all on leads" ON leads;

DROP POLICY IF EXISTS "Allow authenticated read interactions" ON interactions;
DROP POLICY IF EXISTS "Allow authenticated insert interactions" ON interactions;
DROP POLICY IF EXISTS "Allow authenticated update interactions" ON interactions;
DROP POLICY IF EXISTS "Allow authenticated delete interactions" ON interactions;

DROP POLICY IF EXISTS "Allow authenticated read appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated insert appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated update appointments" ON appointments;
DROP POLICY IF EXISTS "Allow authenticated delete appointments" ON appointments;

-- =========================================
-- leads 테이블 정책
-- =========================================

-- 인증된 사용자: 읽기 허용
CREATE POLICY "Allow authenticated read leads" ON leads
    FOR SELECT
    TO authenticated
    USING (true);

-- 인증된 사용자: 수정 허용
CREATE POLICY "Allow authenticated update leads" ON leads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 인증된 사용자: 삭제 허용
CREATE POLICY "Allow authenticated delete leads" ON leads
    FOR DELETE
    TO authenticated
    USING (true);

-- Service role: INSERT 허용 (webhook에서 사용)
-- service_role은 RLS를 우회하므로 별도 정책 불필요
-- 하지만 명시적으로 anon에게는 insert 권한을 주지 않음

-- 개발 편의를 위한 anon 읽기 정책 (프로덕션에서는 제거 권장)
DROP POLICY IF EXISTS "Allow anon read leads" ON leads;
CREATE POLICY "Allow anon read leads" ON leads
    FOR SELECT
    TO anon
    USING (true);

-- =========================================
-- interactions 테이블 정책
-- =========================================

CREATE POLICY "Allow authenticated read interactions" ON interactions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert interactions" ON interactions
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update interactions" ON interactions
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete interactions" ON interactions
    FOR DELETE
    TO authenticated
    USING (true);

-- 개발용 anon 읽기
DROP POLICY IF EXISTS "Allow anon read interactions" ON interactions;
CREATE POLICY "Allow anon read interactions" ON interactions
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Allow anon insert interactions" ON interactions;
CREATE POLICY "Allow anon insert interactions" ON interactions
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- =========================================
-- appointments 테이블 정책
-- =========================================

CREATE POLICY "Allow authenticated read appointments" ON appointments
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated insert appointments" ON appointments
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated update appointments" ON appointments
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated delete appointments" ON appointments
    FOR DELETE
    TO authenticated
    USING (true);

-- 개발용 anon 읽기
DROP POLICY IF EXISTS "Allow anon read appointments" ON appointments;
CREATE POLICY "Allow anon read appointments" ON appointments
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Allow anon insert appointments" ON appointments;
CREATE POLICY "Allow anon insert appointments" ON appointments
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- =========================================
-- 개발용 anon 정책 추가 (leads 수정)
-- 프로덕션에서는 이 정책들을 제거하고 인증을 강제해야 함
-- =========================================
DROP POLICY IF EXISTS "Allow anon update leads" ON leads;
CREATE POLICY "Allow anon update leads" ON leads
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- =========================================
-- 뷰: 대시보드용 집계 뷰 (선택적)
-- =========================================

-- 단계별 리드 수
CREATE OR REPLACE VIEW v_leads_by_stage AS
SELECT
    stage,
    COUNT(*) as count
FROM leads
GROUP BY stage;

-- 일별 리드 유입 수
CREATE OR REPLACE VIEW v_leads_daily AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as count
FROM leads
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- =========================================
-- 코멘트 추가
-- =========================================
COMMENT ON TABLE leads IS '리드(상담문의) 테이블 - Tally Form webhook으로 유입';
COMMENT ON TABLE interactions IS '상담 기록/메모 테이블';
COMMENT ON TABLE appointments IS '상담 예약 테이블';

COMMENT ON COLUMN leads.stage IS '파이프라인 단계: NEW, CONTACTED, BOOKED, CONSULTED, PAID, LOST';
COMMENT ON COLUMN leads.form_submission_id IS 'Tally Form submission ID (중복 방지용)';
COMMENT ON COLUMN leads.raw_payload IS '원본 webhook payload (디버깅/추적용)';
