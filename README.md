# 입시컨설팅 CRM

입시컨설팅 학원을 위한 리드 관리 시스템입니다. Tally Form에서 유입된 상담 문의를 관리하고, 파이프라인을 추적합니다.

## 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **Backend**: Next.js Route Handlers, Server Components
- **Database**: Supabase (PostgreSQL)
- **기타**: Zod (검증), Day.js (날짜 처리), Lucide React (아이콘)

## 주요 기능

### 1. 홈 (`/`)
- 대시보드와 DB 화면으로 이동하는 간단한 네비게이션

### 2. 대시보드 (`/dashboard`)
- **전환율**: 상담완료 이상 / 전체 리드 비율
- **리드 유입**: 기간별 리드 수 및 일별 추이 차트
- **지역/학년 분포**: 상위 5개 지역 및 학년별 분포
- **파이프라인**: 단계별(NEW/CONTACTED/BOOKED/CONSULTED/PAID/LOST) 분포

### 3. 리드 DB (`/db`)
- 리드 목록 테이블 (검색, 페이지네이션)
- 상세보기 모달에서 단계 변경, 메모 추가, 예약 등록

### 4. Tally Webhook
- `POST /api/tally/webhook`: Tally Form 제출 시 자동으로 리드 저장

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경변수 설정

`.env.example`을 복사하여 `.env.local` 파일을 생성합니다:

```bash
cp .env.example .env.local
```

환경변수 값을 채웁니다:

```env
# Supabase 설정
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Tally Webhook 시크릿
TALLY_WEBHOOK_SECRET=your-webhook-secret
```

### 3. Supabase 스키마 설정

Supabase 대시보드의 SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## Tally Webhook 설정

### 1. Tally Form 설정

1. Tally 폼 편집 화면에서 **Integrations** > **Webhooks** 선택
2. Webhook URL 입력: `https://your-domain.com/api/tally/webhook`
3. (선택) Secret 설정 후 `.env.local`의 `TALLY_WEBHOOK_SECRET`과 동일하게 설정

### 2. 폼 필드 매핑

Tally 폼에서 다음 필드명(또는 라벨)을 사용하면 자동으로 매핑됩니다:

| CRM 필드 | Tally 필드명/라벨 예시 |
|---------|---------------------|
| parent_name | 학부모 이름, 이름, name |
| parent_phone | 학부모 전화번호, 전화번호, 연락처, phone |
| student_grade | 학년, grade |
| desired_timing | 상담 시기, 원하는 시기, timing |
| question_context | 궁금한 점, 문의 내용, question |
| region | 지역, 거주지 |
| utm_* | utm_source, utm_medium 등 |

### 3. 로컬 테스트 (curl)

```bash
# Webhook 상태 확인
curl http://localhost:3000/api/tally/webhook

# 테스트 데이터 전송
curl -X POST http://localhost:3000/api/tally/webhook \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-webhook-secret" \
  -d '{
    "eventId": "test-event-001",
    "eventType": "FORM_RESPONSE",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "data": {
      "responseId": "resp-001",
      "submissionId": "sub-001",
      "formId": "form-001",
      "formName": "상담 문의",
      "createdAt": "2024-01-15T10:00:00.000Z",
      "fields": [
        {"key": "question_name", "label": "학부모 이름", "type": "INPUT_TEXT", "value": "홍길동"},
        {"key": "question_phone", "label": "전화번호", "type": "INPUT_PHONE_NUMBER", "value": "01012345678"},
        {"key": "question_grade", "label": "학년", "type": "DROPDOWN", "value": "고2"},
        {"key": "question_timing", "label": "상담 시기", "type": "DROPDOWN", "value": "이번주"},
        {"key": "question_context", "label": "궁금한 점", "type": "TEXTAREA", "value": "입시 전략 상담 원합니다."},
        {"key": "utm_source", "label": "utm_source", "type": "HIDDEN", "value": "instagram"},
        {"key": "utm_medium", "label": "utm_medium", "type": "HIDDEN", "value": "paid"}
      ]
    }
  }'
```

## 프로젝트 구조

```
src/
├── app/
│   ├── api/
│   │   ├── dashboard/route.ts     # 대시보드 API
│   │   ├── leads/
│   │   │   ├── route.ts           # 리드 목록 API
│   │   │   └── [id]/
│   │   │       ├── route.ts       # 리드 상세/수정 API
│   │   │       ├── interactions/  # 메모 추가 API
│   │   │       └── appointments/  # 예약 추가 API
│   │   └── tally/webhook/route.ts # Tally Webhook
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── components/
│   ├── db/
│   │   ├── page.tsx
│   │   └── components/
│   │       ├── LeadsTable.tsx
│   │       └── LeadDetailModal.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── queries/
│   │   ├── dashboard.ts           # 대시보드 쿼리
│   │   └── leads.ts               # 리드 쿼리
│   └── supabase/
│       ├── client.ts              # 클라이언트용 Supabase
│       └── server.ts              # 서버용 Supabase
└── types/
    └── database.ts                # 타입 정의
```

## RLS (Row Level Security) 정책

### 프로덕션 권장 설정

현재는 개발 편의를 위해 `anon` 역할에도 읽기/쓰기를 허용하고 있습니다.
프로덕션 환경에서는 다음 정책들을 제거하거나 수정하세요:

```sql
-- 제거할 정책 (supabase/schema.sql에서)
DROP POLICY IF EXISTS "Allow anon read leads" ON leads;
DROP POLICY IF EXISTS "Allow anon update leads" ON leads;
DROP POLICY IF EXISTS "Allow anon read interactions" ON interactions;
DROP POLICY IF EXISTS "Allow anon insert interactions" ON interactions;
-- ... 등
```

### Webhook Insert

Webhook에서의 리드 삽입은 `SUPABASE_SERVICE_ROLE_KEY`를 사용합니다.
이 키는 RLS를 우회하므로 **절대 클라이언트에 노출하지 마세요**.

## 스크립트

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버 실행
npm run lint     # ESLint 검사
```

## 파이프라인 단계

| 단계 | 설명 |
|-----|------|
| NEW | 신규 리드 (유입됨) |
| CONTACTED | 연락 완료 |
| BOOKED | 상담 예약됨 |
| CONSULTED | 상담 완료 |
| PAID | 결제 완료 (등록) |
| LOST | 이탈 |

## 향후 확장

- [ ] Supabase Auth 연동 (로그인 필수)
- [ ] 알림 기능 (카카오톡, 이메일)
- [ ] 리드 일괄 수정
- [ ] 엑셀 내보내기
- [ ] 통계 기간 커스텀 선택
