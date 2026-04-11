# AI활용 차세대 교육 솔루션

---

# Day1 My Questions

(수정 금지)

## Implements & Architecture:

### 1) def pain-points

### 2) provide Solution with AI

- 문제 정의
- 기존 Pain-point를 어떻게 AI와 접목시켜 해결할 것인가?
- 해당 기능을 어떤 형태로 구현할 것인가?

### 3-1) backend

- Spring vs Nest.JS: 이유 설명
- OAuth부터 AI API 이용까지의 Data-Flow
- 다수 이용자의 트래픽 분산 계획
- 편의성을 위한 In-Memory DB 등의 신기술 접목
- Injection, 배포시의 Risk 등 요즘 화제된 보안 관련 예방 계획

### 3-2) frontend

- Next.JS vs Vite-React/TS: 이유 설명
- 유저 편의를 극대화 할 수 있는 UI/UX 계획: 레퍼런스 찾아보기
- Axios 등 백엔드와의 원활한 Data-Flow를 위한 계획

### 3-3) DB

- 어떤 스키마, 정보를 가져야 하는가?: 도메인 별 분리
- 트랜잭션에 어떻게 대응할 것인가?
- AI와의 연결은 어떻게 할 것인가?

---

# codex reply

(아래에 답변)

## 1) def pain-points

- 교육 현장에서는 강의는 진행되지만, 수강생별 이해도 차이와 질문 누락을 실시간으로 따라가기 어렵다.
- 교강사는 반복 질문 응대, 과제 피드백, 출결 및 학습 진도 확인에 많은 시간을 소모한다.
- 교육 운영자는 이탈 위험 수강생, 강의 품질, 과제 제출 현황을 한눈에 파악하기 어렵다.
- 수강생은 "무엇을 모르는지" 스스로 정리하기 어렵고, 질문 자체를 부담스러워하는 경우가 많다.

## 2) provide Solution with AI

### 문제 정의

교육 현장의 핵심 문제는 "같은 강의를 들어도 학습 격차가 빠르게 벌어지고, 이를 교강사와 운영자가 제때 발견하고 개입하기 어렵다"는 점이다.

### 기존 Pain-point를 어떻게 AI와 접목시켜 해결할 것인가?

우리는 AI 기반 LMS + 학습 코파일럿 플랫폼을 제안한다. 핵심은 강의 업로드/수강/진도관리 같은 LMS 기본 기능 위에, 강의 자료, 과제, 질의응답, 학습 로그를 통합한 AI 지원 기능을 얹어 수강생 맞춤형 지원과 운영 자동화를 동시에 제공하는 것이다.

- 수강생용 AI 튜터
강의 자료와 과제 기준으로 개인 맞춤 설명, 요약, 추가 예시, 예상 문제를 생성한다.
- AI 질문 정리기
수강생의 애매한 질문도 의도를 보정해 정리하고, 강의 문맥에 맞는 답변을 우선 제공한다.
- AI 학습 위험 탐지
출결, 과제 지연, 질문 빈도, 퀴즈 성적을 종합해 이탈 위험 또는 이해 부족 수강생을 조기 탐지한다.
- 교강사용 AI 피드백 어시스턴트
과제 초안 채점 보조, 반복 질문 자동 응답, 강의별 이해도 리포트를 제공한다.
- LMS 강의 운영 기능
강사는 인프런처럼 강의를 생성하고, 섹션/커리큘럼/영상/첨부자료를 업로드하며, 수강생은 강의를 탐색하고 신청한 뒤 순차적으로 수강할 수 있다.
- 운영자용 AI 대시보드
반별 학습 진도, 위험군, 과목별 병목 구간을 요약해 운영 효율을 높인다.

### 해당 기능을 어떤 형태로 구현할 것인가?

- Web 기반 SaaS 형태로 구현한다.
- 수강생 화면에서는 강의 탐색, 강의 상세, 강의 수강 플레이어, 진도율 확인, 챗봇, 요약 카드, 맞춤 퀴즈, 학습 경고/추천 기능을 제공한다.
- 교강사 화면에서는 강의 생성, 커리큘럼 편집, 영상 및 학습자료 업로드, 과제 출제, 과제 피드백 초안, 질문 묶음 답변, 이해도 리포트를 제공한다.
- 운영자 화면에서는 코호트별 지표, 리스크 알림, 공지 추천 기능을 제공한다.

## 3-1) backend

### Spring vs Nest.JS: 이유 설명

Nest.JS를 선택한다.

- TypeScript 기반으로 프론트엔드와 언어를 통일할 수 있어 초기 개발 속도가 빠르다.
- 모듈 구조, DI, Guard, Interceptor 체계가 명확해 인증, 로깅, 예외 처리, AI 호출 계층을 분리하기 좋다.
- 공모전 기간 내 MVP를 빠르게 만들면서도 확장 가능한 구조를 잡기에 유리하다.
- AI API 호출, 비동기 작업 큐, WebSocket 알림 기능을 구성하기 편하다.

Spring도 대규모 엔터프라이즈에 강점이 있지만, 본 프로젝트는 짧은 기간 안에 AI 연동형 MVP를 완성해야 하므로 생산성이 더 중요한 선택 기준이다.

### OAuth부터 AI API 이용까지의 Data-Flow

1. 사용자가 Google/Kakao 등 OAuth로 로그인한다.
2. 백엔드는 OAuth provider에서 사용자 정보를 검증한 뒤 자체 JWT Access/Refresh Token을 발급한다.
3. 프론트엔드는 Access Token으로 API를 호출한다.
4. 사용자가 질문, 과제 분석, 요약 요청을 보내면 백엔드는 권한과 입력 유효성을 먼저 검증한다.
5. 백엔드는 수업 자료, 과거 대화, 과제 조건, 사용자 학습 로그를 조회해 AI 프롬프트 문맥을 구성한다.
6. 필요 시 RAG 방식으로 벡터 검색 결과를 함께 묶어 AI API에 전달한다.
7. AI 응답은 후처리 과정을 거쳐 금칙어, 개인정보, 환각 가능성을 필터링한 뒤 사용자에게 반환한다.
8. 요청/응답 메타데이터는 로그와 분석 테이블에 저장해 추천 품질과 운영 리포트에 활용한다.

### 다수 이용자의 트래픽 분산 계획

- API 서버는 Stateless 구조로 설계해 수평 확장을 가능하게 한다.
- Nginx 또는 Cloud Load Balancer를 앞단에 두고 여러 인스턴스로 분산한다.
- Redis를 사용해 세션성 데이터, 캐시, rate limit을 처리한다.
- AI 요청은 즉시 응답형과 비동기 처리형을 분리한다.
요약, 리포트 생성 등 무거운 작업은 Queue(BullMQ 등)로 넘긴다.
- CDN을 활용해 정적 자원 부하를 줄인다.

### 편의성을 위한 In-Memory DB 등의 신기술 접목

- Redis를 적극 활용한다.
- 자주 조회되는 강의 메타데이터, 사용자 최근 학습 상태, AI 응답 캐시를 저장해 응답 속도를 줄인다.
- 실시간 랭킹, 세션 상태, 알림 큐 처리에도 활용 가능하다.
- 개발 단계에서는 SQLite 또는 Docker 기반 Postgres로 단순화하되, 운영은 Postgres + Redis 조합으로 간다.

### Injection, 배포시의 Risk 등 요즘 화제된 보안 관련 예방 계획

- ORM과 parameterized query를 사용해 SQL Injection을 방지한다.
- DTO validation, sanitize, file upload 제한으로 입력값 공격을 차단한다.
- OAuth/JWT 토큰 만료 및 refresh rotation을 적용한다.
- 관리자/강사/수강생 권한을 RBAC로 분리한다.
- AI Prompt Injection 대응을 위해 system prompt 분리, 외부 문서 신뢰도 제한, 민감정보 마스킹을 적용한다.
- API rate limit, WAF, CORS 정책, Helmet 등 기본 웹 보안을 적용한다.
- 배포 시 `.env` 기반 비밀키 관리, GitHub secret, API key 서버 보관 원칙을 지킨다.
- 로그에는 개인정보와 원문 프롬프트를 그대로 남기지 않고 최소한의 메타데이터만 저장한다.

## 3-2) frontend

### Next.JS vs Vite-React/TS: 이유 설명

Next.JS를 선택한다.

- 대시보드, 랜딩, 인증 흐름, SEO 대응 페이지를 한 프레임워크에서 처리하기 좋다.
- App Router 기반으로 페이지 구조화가 쉽고, 서버 컴포넌트/클라이언트 컴포넌트 분리가 가능하다.
- 추후 SSR, 스트리밍 UI, 서버 액션 등 확장 포인트가 많다.
- 공모전 결과물에서 서비스 완성도를 보여주기 좋다.

Vite-React는 빠르고 가볍지만, 본 프로젝트는 단순 SPA보다 인증, 대시보드, 랜딩, 배포 일체형 구성이 중요하므로 Next.JS가 적합하다.

### 유저 편의를 극대화 할 수 있는 UI/UX 계획: 레퍼런스 찾아보기

- 수강생 홈은 "오늘 해야 할 일", "이해 안 된 개념 다시 보기", "AI에게 바로 질문" 중심의 태스크형 UI로 구성한다.
- 수강 페이지는 인프런처럼 좌측 커리큘럼, 중앙 영상 플레이어, 우측 또는 하단 AI 학습 도우미 구조를 고려한다.
- 긴 텍스트 대신 카드형 요약, 난이도 배지, 진도 그래프를 사용한다.
- AI 답변은 "짧게 설명", "예시 추가", "퀴즈로 변환" 버튼으로 재가공 가능하게 한다.
- 교강사 대시보드는 강의별 수강률, 이탈 구간, 학생 위험도, 반복 질문, 과제 피드백 초안을 우선 노출한다.
- 운영자 화면은 과정/반/기간 단위 필터와 경고 중심의 요약 리포트 구조로 설계한다.

레퍼런스 방향:

- Notion: 정보 구조가 단정하고 학습 정보 정리에 강함
- Duolingo: 학습 동기 유발과 짧은 피드백 루프 설계가 강점
- Slack/Discord: 빠른 질문-응답 인터랙션 참고
- Coursera/Udemy 대시보드: 교육형 정보 배치 참고

### Axios 등 백엔드와의 원활한 Data-Flow를 위한 계획

- Axios 기반 API client를 공통 모듈로 분리한다.
- Request interceptor에서 Access Token을 자동 주입한다.
- Response interceptor에서 401 발생 시 refresh token 재발급 흐름을 처리한다.
- React Query 또는 TanStack Query를 사용해 서버 상태 캐싱, 재시도, optimistic UI를 구성한다.
- SSE 또는 WebSocket을 붙여 AI 분석 완료, 알림, 실시간 질의응답 상태를 전달한다.

## 3-3) DB

### 어떤 스키마, 정보를 가져야 하는가?: 도메인 별 분리

도메인 중심으로 분리한다.

- User
사용자 기본 정보, 역할, 소속, OAuth 정보
- Course
강의 기본 정보, 카테고리, 소개, 썸네일, 공개 여부, 가격, 담당 강사
- Curriculum
섹션, 강의(lesson), 정렬 순서, 영상 길이, 미리보기 여부
- Lecture Asset
동영상 URL, 첨부자료, 자막, 강의 노트
- Enrollment
수강 등록, 수강 권한 여부, 결제 여부, 진도율, 마지막 수강 위치, 상태값
- Lecture Progress
수업별 시청 시간, 완료 여부, 최근 시청 시각
- Assignment
과제, 제출물, 피드백, 점수, 제출 시각
- Quiz
퀴즈, 응답 기록, 정오답, 난이도
- AI Interaction
질문 원문, 문맥 데이터, 응답 요약, 토큰 사용량, 품질 평가
- Risk Analytics
위험 점수, 위험 사유, 추천 개입 액션, 시점별 변화 기록
- Notification
알림 종류, 발송 대상, 읽음 여부, 발송 시각

### 트랜잭션에 어떻게 대응할 것인가?

- 핵심 정합성이 필요한 영역은 DB 트랜잭션으로 처리한다.
예: 수강 등록 및 수강권한 부여, 과제 제출, 점수 반영, 출결 업데이트
- AI 호출처럼 외부 API가 포함되는 작업은 DB 트랜잭션과 분리한다.
- 외부 호출 결과 저장은 비동기 job + 상태값 관리 방식으로 처리한다.
예: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`
- 중복 제출이나 재시도 이슈를 막기 위해 idempotency key를 적용한다.

### AI와의 연결은 어떻게 할 것인가?

- 강의 자료와 과제 기준서를 임베딩해 벡터 스토어에 저장한다.
- 사용자의 질문이 들어오면 관련 문서를 검색해 RAG 기반으로 답변 정확도를 높인다.
- AI 기능은 목적별로 분리한다.
질의응답, 요약, 퀴즈 생성, 과제 피드백, 위험 분석
- 모든 AI 결과는 바로 확정값으로 쓰지 않고, 검토 가능한 보조 결과물로 제공한다.
- 추후에는 사용자 피드백(도움 됨/안 됨)을 수집해 프롬프트와 검색 품질을 개선한다.

### ERD 초안

```text
User
- id (PK)
- role (STUDENT | INSTRUCTOR | ADMIN)
- name
- email
- phone_number
- oauth_provider
- oauth_provider_id
- created_at

Course
- id (PK)
- instructor_id (FK -> User.id)
- category_id (FK -> Category.id)
- title
- description
- thumbnail_url
- status (DRAFT | PUBLISHED | ARCHIVED)
- price
- created_at

Category
- id (PK)
- name

Section
- id (PK)
- course_id (FK -> Course.id)
- title
- sort_order

Lesson
- id (PK)
- section_id (FK -> Section.id)
- title
- lesson_type (VIDEO | QUIZ | DOC)
- sort_order
- duration_sec
- is_preview

LectureAsset
- id (PK)
- lesson_id (FK -> Lesson.id)
- video_url
- attachment_url
- subtitle_url
- note_content

Enrollment
- id (PK)
- user_id (FK -> User.id)
- course_id (FK -> Course.id)
- access_status (PENDING | ACTIVE | EXPIRED | CANCELLED | BLOCKED)
- granted_at
- expired_at
- payment_status (READY | PAID | REFUNDED)
- progress_rate
- last_lesson_id (FK -> Lesson.id, nullable)
- unique(user_id, course_id)

LessonProgress
- id (PK)
- enrollment_id (FK -> Enrollment.id)
- lesson_id (FK -> Lesson.id)
- watched_seconds
- completed
- last_watched_at
- unique(enrollment_id, lesson_id)

Assignment
- id (PK)
- course_id (FK -> Course.id)
- lesson_id (FK -> Lesson.id, nullable)
- title
- description
- due_at

AssignmentSubmission
- id (PK)
- assignment_id (FK -> Assignment.id)
- enrollment_id (FK -> Enrollment.id)
- content
- submitted_at
- score
- ai_feedback_summary

Quiz
- id (PK)
- lesson_id (FK -> Lesson.id)
- title

QuizAttempt
- id (PK)
- quiz_id (FK -> Quiz.id)
- enrollment_id (FK -> Enrollment.id)
- score
- submitted_at

AiInteraction
- id (PK)
- user_id (FK -> User.id)
- course_id (FK -> Course.id)
- lesson_id (FK -> Lesson.id, nullable)
- question
- answer_summary
- token_usage
- created_at

RiskAnalytics
- id (PK)
- enrollment_id (FK -> Enrollment.id)
- risk_score
- risk_reason
- recommended_action
- created_at

Notification
- id (PK)
- user_id (FK -> User.id)
- type
- title
- body
- is_read
- created_at
```

### 수강 권한 제어 설계

- 학생 계정은 `role=STUDENT`만으로는 강의를 들을 수 없다.
- 특정 강의를 들으려면 `Enrollment` 레코드가 반드시 존재해야 한다.
- 실제 수강 가능 조건은 `Enrollment.access_status = ACTIVE` 이다.
- 결제가 필요한 강의는 결제 완료 후 `payment_status = PAID`가 되면 `access_status`를 `ACTIVE`로 전환한다.
- 무료 강의나 관리자 승인형 강의는 승인 시점에 바로 `ACTIVE`를 부여한다.
- `EXPIRED`, `CANCELLED`, `BLOCKED` 상태인 경우 강의 상세 조회는 가능해도 영상 플레이어, 첨부자료, 과제 제출, AI 튜터 호출은 막는다.
- 백엔드는 `/learn/:courseId`, `/lessons/:lessonId`, `/assignments/:id/submit`, `/ai/chat` 같은 수강 기능 API에서 항상 Enrollment를 먼저 검사해야 한다.
- `LessonProgress`, `AssignmentSubmission`, `QuizAttempt`, `RiskAnalytics`는 모두 `Enrollment`를 기준으로 연결해, 권한 없는 사용자의 데이터 생성 자체를 차단한다.

---

## 4) 폴더구조 / 기술스택 초안

### 폴더구조 초안

```text
frontend-repo
├─ src
│  ├─ app
│  │  ├─ (marketing)
│  │  ├─ (auth)
│  │  ├─ courses                 # 강의 목록/상세
│  │  ├─ learn                   # 수강 플레이어
│  │  ├─ student                 # 내 학습 현황
│  │  ├─ instructor              # 강의 관리
│  │  └─ admin
│  ├─ components
│  ├─ features
│  │  ├─ auth
│  │  ├─ course
│  │  ├─ curriculum
│  │  ├─ video-player
│  │  ├─ ai-chat
│  │  ├─ assignment
│  │  └─ analytics
│  ├─ lib
│  ├─ hooks
│  ├─ services
│  ├─ store
│  └─ types
├─ public
├─ .env.example
└─ package.json

backend-repo
├─ src
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ common
│  │  ├─ guards
│  │  ├─ interceptors
│  │  ├─ filters
│  │  ├─ decorators
│  │  └─ utils
│  ├─ config
│  ├─ auth
│  ├─ users
│  ├─ courses
│  ├─ curriculums
│  ├─ lecture-assets
│  ├─ enrollments
│  ├─ progress
│  ├─ assignments
│  ├─ quizzes
│  ├─ ai
│  │  ├─ chat
│  │  ├─ summary
│  │  ├─ feedback
│  │  ├─ embeddings
│  │  └─ prompts
│  ├─ analytics
│  ├─ notifications
│  └─ jobs
├─ prisma
│  ├─ schema.prisma
│  └─ migrations
├─ test
├─ .env.example
└─ package.json
```

### 기술스택 초안

#### Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- Axios
- Zustand

#### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Passport OAuth2 / JWT
- Swagger

#### AI

- OpenAI API
- Embeddings + RAG
- Vector Store: pgvector 또는 Pinecone
- Prompt Template 관리 모듈
- AI 응답 로깅 및 평가 테이블

#### Infra / DevOps

- Vercel
- AWS EC2 / ECS 또는 Render
- Nginx
- Docker / Docker Compose
- GitHub Actions
- Sentry

#### 협업 / 문서화

- GitHub Projects
- Figma
- Notion
- ERDCloud 또는 dbdiagram

### MVP 우선 구현 범위

- OAuth 로그인
- 강사 강의 생성
- 섹션/커리큘럼/영상/첨부자료 업로드
- 강의 목록/상세/검색
- 학생별 강의 수강 권한 부여
- 강의 수강 플레이어
- 수업별 진도율 저장
- 수강생 대시보드
- AI 학습 챗봇
- 강의 자료 기반 요약/질문응답
- 과제 제출 및 AI 피드백 초안
- 교강사용 위험 수강생 리포트
- 관리자용 기본 통계 대시보드

