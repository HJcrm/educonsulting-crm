-- =========================================
-- C레벨 리드 관리 시스템 테이블
-- =========================================

-- =========================================
-- 테이블: c_leads (C레벨 리드)
-- =========================================
CREATE TABLE IF NOT EXISTS c_leads (
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
    region TEXT,
    question_context TEXT,

    -- 상태 (ACTIVE, INACTIVE 등)
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    notes TEXT,

    -- UTM 파라미터
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,

    -- 원본 데이터 (디버깅/추적용)
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- c_leads 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_c_leads_created_at ON c_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_c_leads_parent_phone ON c_leads(parent_phone);
CREATE INDEX IF NOT EXISTS idx_c_leads_parent_name ON c_leads(parent_name);
CREATE INDEX IF NOT EXISTS idx_c_leads_status ON c_leads(status);

-- updated_at 자동 업데이트 트리거
DROP TRIGGER IF EXISTS update_c_leads_updated_at ON c_leads;
CREATE TRIGGER update_c_leads_updated_at
    BEFORE UPDATE ON c_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- 테이블: c_lead_messages (메시지 발송 이력)
-- =========================================
CREATE TABLE IF NOT EXISTS c_lead_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    c_lead_id UUID NOT NULL REFERENCES c_leads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- 메시지 정보
    message_type TEXT NOT NULL, -- SMS, LMS
    recipient_phone TEXT NOT NULL,
    content TEXT NOT NULL,

    -- 발송 상태
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    external_message_id TEXT,
    error_message TEXT,
    sent_at TIMESTAMPTZ
);

-- c_lead_messages 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_c_lead_messages_c_lead_id ON c_lead_messages(c_lead_id);
CREATE INDEX IF NOT EXISTS idx_c_lead_messages_created_at ON c_lead_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_c_lead_messages_status ON c_lead_messages(status);

-- =========================================
-- RLS (Row Level Security) 정책
-- =========================================

-- RLS 활성화
ALTER TABLE c_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE c_lead_messages ENABLE ROW LEVEL SECURITY;

-- =========================================
-- c_leads 테이블 정책
-- =========================================

-- 인증된 사용자: 읽기 허용
CREATE POLICY "Allow authenticated read c_leads" ON c_leads
    FOR SELECT
    TO authenticated
    USING (true);

-- 인증된 사용자: 수정 허용
CREATE POLICY "Allow authenticated update c_leads" ON c_leads
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 인증된 사용자: 삭제 허용
CREATE POLICY "Allow authenticated delete c_leads" ON c_leads
    FOR DELETE
    TO authenticated
    USING (true);

-- 개발용 anon 정책
CREATE POLICY "Allow anon read c_leads" ON c_leads
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon update c_leads" ON c_leads
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- =========================================
-- c_lead_messages 테이블 정책
-- =========================================

-- 인증된 사용자: 읽기 허용
CREATE POLICY "Allow authenticated read c_lead_messages" ON c_lead_messages
    FOR SELECT
    TO authenticated
    USING (true);

-- 인증된 사용자: 삽입 허용
CREATE POLICY "Allow authenticated insert c_lead_messages" ON c_lead_messages
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 인증된 사용자: 수정 허용
CREATE POLICY "Allow authenticated update c_lead_messages" ON c_lead_messages
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 개발용 anon 정책
CREATE POLICY "Allow anon read c_lead_messages" ON c_lead_messages
    FOR SELECT
    TO anon
    USING (true);

CREATE POLICY "Allow anon insert c_lead_messages" ON c_lead_messages
    FOR INSERT
    TO anon
    WITH CHECK (true);

CREATE POLICY "Allow anon update c_lead_messages" ON c_lead_messages
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- =========================================
-- 코멘트 추가
-- =========================================
COMMENT ON TABLE c_leads IS 'C레벨 리드 테이블 - CRM 메시지 발송 대상';
COMMENT ON TABLE c_lead_messages IS 'C레벨 리드 메시지 발송 이력';

COMMENT ON COLUMN c_leads.status IS '리드 상태: ACTIVE, INACTIVE 등';
COMMENT ON COLUMN c_lead_messages.message_type IS '메시지 타입: SMS (90자 이하), LMS (90자 초과)';
COMMENT ON COLUMN c_lead_messages.status IS '발송 상태: PENDING, SENT, FAILED';
