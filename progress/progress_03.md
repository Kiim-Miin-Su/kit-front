# Progress 03

## 1. 전체 아키텍처와 데이터 흐름 등 현재 상황

현재 프론트는 Next.js App Router 기준으로 `(marketing)`, `(platform)`, `(auth)` 3개 영역으로 나뉜다.

- `(marketing)`:
  홈, 공개 강의 탐색 진입, 배너, 필터, 검색, 전체 강의 카드 그리드
- `(platform)`:
  로그인 이후 제품 영역. `courses`, `learn`, `student`, `instructor`, `admin`
- `(auth)`:
  로그인 진입점

기본 셸과 공통 상태는 아래 파일을 기준으로 움직인다.

- 전역 레이아웃: `src/app/layout.tsx`
- 플랫폼 레이아웃: `src/app/(platform)/layout.tsx`
- 상단 네비게이션: `src/components/navigation/top-navigation.tsx`
- 인증 스토어: `src/store/auth-store.ts`
- 공통 API 클라이언트: `src/services/api.ts`

현재 인증은 `zustand + persist` 기반이다.

- `accessToken`, `user`를 로컬 스토리지에 유지
- axios 요청 시 `Authorization` 헤더 주입
- 401 응답 시 세션 제거
- 로그인 여부에 따라 홈의 `이어서 학습하기` 노출 여부 제어
- 상단 네비게이션의 `출석하기` CTA는 홈 포함 전역에서 노출

### 홈 구조

파일:

- `src/app/(marketing)/page.tsx`
- `src/features/home/marketing-home.tsx`

현재 홈은 인프런식 공개 탐색 구조를 참고해 아래 흐름으로 구성돼 있다.

- 상단 검색형 히어로 + 자동 슬라이드 배너
- 1단 필터:
  `수강 시간`, `가격`은 옵션형, `할인`, `무료`, `로드맵`은 토글형
- 2단 카테고리:
  한 줄 토글형
- 강의 카드:
  4열 x 5행, 페이지당 20개
- 페이지네이션
- 로그인 시에만 `이어서 학습하기`
- 우하단 고정형 `문의하기`

홈의 전체 강의 목록은 아직 실제 API가 아니라 확장 목데이터를 사용한다.
카드 개수, 검색, 필터, 페이지네이션 밀도를 검증하기 위해 `marketing-home.tsx` 내부에서 데이터를 늘려 쓰고 있다.

### 강의 도메인 구조

파일:

- 타입: `src/types/course.ts`
- 목데이터: `src/features/course/mock-course-data.ts`
- 서비스: `src/services/course.ts`

현재 `CourseDetail`은 아래 정보를 가진다.

- 기본 강의 정보
- `enrollmentStatus`
- `learningPoints`
- `curriculumPreview`
- 레슨별 `summary`, `headers`

강의 상세는 아래 파일로 구성된다.

- `src/app/(platform)/courses/[courseSlug]/page.tsx`
- `src/features/course/course-detail-view.tsx`
- `src/features/course/course-curriculum-accordion.tsx`

현재 상세 화면은 다음 구조다.

- 상단 히어로
- 강의 개요
- 학습 포인트
- 커리큘럼 아코디언
- 수강 상태 표시
- `ACTIVE`가 아닐 때 학습 CTA 제어
- 미리보기 레슨이면 `/learn`으로 바로 연결

커리큘럼은 토글형 아코디언이고, 레슨을 누르면 설명과 하위 헤더가 펼쳐진다.

### 학습 탭 구조

파일:

- `src/app/(platform)/learn/page.tsx`
- `src/features/course/learn-player-view.tsx`

학습 탭은 더 이상 단순 플레이어 화면이 아니라 `내 강의 허브 + 플레이어 + 운영 진입점` 구조다.

- 상단:
  `My Courses`
- 중단:
  선택한 강의의 큰 플레이어 mock 카드
- 그 아래:
  메트릭 카드
  현재는 `현재 강의`, `현재 레슨`, `수강 상태`
- 하단:
  커리큘럼 카드 그리드
- 우측:
  출석 카드 + Workspace 카드

여기서 중요한 최신 변경은 아래다.

- 중복 정보였던 `Course Info` 섹션 제거
- 상태 카드명을 `수강 상태`로 통일
- 출석 카드는 더 이상 강의 기준이 아니라 학생의 과정/반 기준 데이터와 연결

즉 `/learn`은 강의 단위 정보와 학생 운영 단위 정보가 같이 보이되, 출석 자체는 강의에 종속되지 않도록 분리했다.

### 학생 탭 / 출석 / 캘린더 구조

파일:

- `src/app/(platform)/student/page.tsx`
- `src/features/attendance/student-attendance-workspace.tsx`
- `src/features/attendance/attendance-check-card.tsx`
- `src/features/attendance/mock-attendance-data.ts`
- `src/types/attendance.ts`

여기가 이번 단계에서 가장 많이 바뀐 영역이다.
기존에는 `courseTitle` 기반 출석 카드였지만, 현재는 아래 모델로 재설계했다.

- 학생은 관리자가 부여한 일정 scope만 볼 수 있음
- 예:
  `global` = 학원 전체 행사
  `ai-product-engineering-3` = 특정 반 수업
- 학생 캘린더에는 본인에게 허용된 scope의 일정만 노출
- 그중 `requiresAttendanceCheck = true`인 일정만 출석 탭과 연결
- 출석 카드는 “현재 선택된 필수 출석 일정”을 기준으로 렌더링

현재 타입 구조 핵심은 다음과 같다.

- `StudentAttendanceProfile`
- `StudentScheduleEvent`
- `AttendanceOverview`
- `StudentWorkspaceTab`
- `CalendarViewMode`

학생 탭은 `출석 탭 / 캘린더 탭`으로 나뉜다.

- 출석 탭:
  필수 출석 일정 목록 + 선택된 일정의 출석 카드
- 캘린더 탭:
  `달력형 / 일정형` 두 가지 보기 제공

캘린더 탭 최신 상태:

- 월간 달력 셀은 한눈에 보이도록 높이를 줄임
- 일정은 `색 점 + 시간 + 한 줄 제목`만 압축 표시
- 글자 넘어가면 생략
- 클릭하면 우측 상세 패널에서 일정 상세 확인
- 필수 출석 일정이면 상세 패널에서 출석 탭으로 이동 가능
- 일정 구분 범례는 작은 원형 점과 텍스트로 제공

학생 화면에서는 관리자용 안내를 제거했다.
즉, `권한 부여`, `스케줄 생성` 같은 문구는 더 이상 학생 탭에 보이지 않는다.

### 출석 데이터 흐름 요약

현재 목데이터 기준 흐름은 아래와 같다.

1. `studentAttendanceProfile`이 학생의 소속 반, 허용 scope, 일정 목록을 가진다.
2. `getVisibleSchedules(profile)`가 허용 scope에 맞는 일정만 필터링한다.
3. `getAttendanceOverview(profile, selectedScheduleId)`가 필수 출석 일정 중 현재 선택된 항목을 출석 카드 형식으로 변환한다.
4. 학생 탭과 학습 탭의 출석 카드는 같은 출석 개요 데이터를 사용할 수 있다.

즉, 출석은 `강의`가 아니라 `학생 소속 + 허용된 일정 + 필수 출석 플래그` 조합으로 계산된다.

---

## 2. 앞으로 어떤 식으로 어디를 개발해야 할지 다음 개발자를 위한 상세 설명

이제부터는 “UI 골격 확장”보다 “실제 데이터와 역할 분리”가 더 중요하다.
특히 홈, 학습, 출석/캘린더를 각각 서버 연동 가능한 단위로 분리해야 한다.

### 1. 홈을 서버 필터 구조로 분리

수정 대상:

- `src/features/home/marketing-home.tsx`
- 필요 시 `src/services/course.ts`

현재 홈은 검색, 필터, 카테고리, 페이지네이션, 배너 상태가 한 파일에 몰려 있다.
다음 단계에서는 아래처럼 분리하는 편이 좋다.

- `features/home/home-search.tsx`
- `features/home/home-filter-bar.tsx`
- `features/home/home-course-grid.tsx`
- `features/home/home-pagination.tsx`
- `features/home/home-hero-carousel.tsx`

또한 현재는 확장 목데이터를 쓰므로, 실제 서비스 전환 시 아래 결정을 해야 한다.

1. 전체 강의를 받아 클라이언트 필터 유지
2. 서버 검색/필터/정렬/페이지네이션 API로 전환

강의 수가 늘어날 가능성이 높으므로 2번 기준으로 가는 편이 낫다.

### 2. 학습 탭을 실제 플레이어 모듈로 분리

수정 대상:

- `src/app/(platform)/learn/page.tsx`
- `src/features/course/learn-player-view.tsx`
- `src/services/course.ts`
- `src/types/course.ts`

현재 `learn-player-view.tsx`는 아래 역할을 동시에 하고 있다.

- 내 강의 목록
- 플레이어 메인 카드
- 메트릭
- 커리큘럼
- 운영 CTA

다음 단계에서는 아래 단위로 쪼개는 것이 좋다.

- `features/learn/my-course-list.tsx`
- `features/learn/player-stage.tsx`
- `features/learn/learning-metrics.tsx`
- `features/learn/curriculum-grid.tsx`
- `features/learn/workspace-actions.tsx`

추가로 지금은 대기중 강의도 같은 레이아웃 안에서 보이지만, 실제 서비스에서는 상태 분기가 필요하다.

- `ACTIVE`:
  플레이어/진도/커리큘럼
- `PENDING`:
  승인 대기 안내, 개강일, 문의 유도
- `REJECTED` 또는 `EXPIRED`가 생기면:
  별도 안내 패널

### 3. 강의 상세 커리큘럼을 실제 섹션 구조로 교체

수정 대상:

- `src/types/course.ts`
- `src/features/course/mock-course-data.ts`
- `src/features/course/course-curriculum-accordion.tsx`

현재는 `curriculumPreview` 단일 배열을 쓰지만, 실서비스는 거의 확실하게 아래 구조가 필요하다.

- 섹션
  - 레슨
  - 레슨

권장 타입 방향:

- `CourseSection`
- `CourseLesson`
- `isLocked`
- `isPreview`
- `videoDurationSec`
- `order`

상세 페이지와 학습 탭이 같은 커리큘럼 원천 데이터를 공유하도록 맞추는 것이 중요하다.

### 4. 학생 캘린더와 출석을 완전한 업무 플로우로 확장

수정 대상:

- `src/types/attendance.ts`
- `src/features/attendance/student-attendance-workspace.tsx`
- `src/features/attendance/attendance-check-card.tsx`
- `src/features/attendance/mock-attendance-data.ts`
- `src/app/(platform)/student/page.tsx`

현재는 학생용 화면만 있다.
다음 프론트 개발자는 아래를 추가해야 한다.

1. 관리자 스케줄 생성 화면
2. 관리자 학생 권한 부여 화면
3. 학생 출석 코드 입력 실제 폼
4. 출석 결과 토스트/에러 처리
5. 출석 이력 조회

특히 관리자 화면에서 필요한 UX는 명확하다.

- 학생에게 어떤 scope를 부여할지 설정
- 스케줄 생성 시 scope 지정
- 반복 방식 지정:
  `커스텀`, `매일`, `매주`
- 색상 선택
- 필수 출석 여부 지정

현재 학생 탭에서는 관리자용 설명을 제거한 상태이므로, 위 내용은 반드시 관리자 탭에서 별도 UI로 제공해야 한다.

### 5. 학생/관리자 역할 분리 유지

이번 작업에서 중요한 정책은 “학생 화면에 관리자 운영 문구를 넣지 않는다”는 점이다.

유지해야 할 원칙:

- 학생 탭:
  본인이 볼 수 있는 일정, 출석 상태, 일정 상세만 보여줌
- 관리자 탭:
  scope 부여, 일정 생성, 반복 규칙, 색상, 출석 정책 설정

즉 같은 도메인이라도 학생용 컴포넌트와 관리자용 컴포넌트를 분리해야 한다.
학생 화면에 정책 설명을 계속 얹으면 UI가 쉽게 지저분해진다.

### 6. 문서화/목데이터 관리

현재 출석 쪽 목데이터가 더 복잡해졌으므로, 다음 개발자는 아래를 같이 정리하는 것이 좋다.

- `mock-attendance-data.ts`를 학생용/관리자용 예시 데이터로 분리
- 색상, category, visibility label을 상수로 분리
- 캘린더 날짜 생성 로직을 util로 분리

현재 `student-attendance-workspace.tsx`는 기능 추가를 위해 한 파일에 모여 있는데, 이후에는 아래로 나누는 것이 좋다.

- `attendance-calendar.tsx`
- `attendance-agenda-list.tsx`
- `attendance-event-detail.tsx`
- `attendance-legend.tsx`

---

## 3. 백엔드 개발자와 협업할 수 있게 어떤 데이터를 주고 받을 건지 등 백엔드 개발자를 위한 상세 설명

현재 프론트는 목데이터 기반이지만, 필요한 API 구조는 꽤 선명해졌다.
중요한 점은 “출석은 강의별이 아니라 학생 소속 과정/반의 일정 기반”이라는 점이다.

### 1. 홈 / 강의 탐색 API

권장 API:

- `GET /courses`

권장 query:

- `page`
- `size`
- `sort`
- `keyword`
- `category`
- `durationRange`
- `priceRange`
- `freeOnly`
- `discountOnly`
- `roadmapOnly`

권장 응답 예시:

```json
{
  "items": [
    {
      "id": "course_1",
      "slug": "llm-study-assistant-ui",
      "title": "LLM 학습 도우미 UI 설계",
      "subtitle": "AI를 수강 흐름 안에 자연스럽게 붙이는 방법",
      "category": "AI 활용",
      "level": "입문",
      "durationLabel": "7시간 25분",
      "lessonCount": 18,
      "priceLabel": "₩59,000",
      "rating": 4.9,
      "reviewCount": 121,
      "enrollmentCount": 1130,
      "thumbnailTone": "from-[#3f6212] via-[#84cc16] to-[#ecfccb]",
      "instructor": {
        "name": "박서윤",
        "title": "AI Product Designer"
      },
      "enrollmentStatus": "ACTIVE"
    }
  ],
  "page": 1,
  "size": 20,
  "totalPages": 5,
  "totalElements": 87
}
```

중요:

- 홈과 `/courses`가 같은 목록 응답을 재사용할 수 있으면 가장 좋다.
- 목록 카드에도 `enrollmentStatus`를 내려주는 편이 UX에 유리하다.

### 2. 강의 상세 API

권장 API:

- `GET /courses/{slug}`

권장 응답 구조:

```json
{
  "id": "course_1",
  "slug": "llm-study-assistant-ui",
  "title": "LLM 학습 도우미 UI 설계",
  "subtitle": "...",
  "description": "...",
  "category": "AI 활용",
  "durationLabel": "7시간 25분",
  "lessonCount": 18,
  "priceLabel": "₩59,000",
  "enrollmentStatus": "ACTIVE",
  "learningPoints": ["...", "..."],
  "sections": [
    {
      "id": "section_1",
      "title": "보조 패널형 AI UX",
      "lessons": [
        {
          "id": "lesson_1",
          "title": "보조 패널형 AI UX의 기본 원칙",
          "durationLabel": "15분",
          "isPreview": true,
          "summary": "...",
          "headers": ["Panel UX", "Context", "Prompt Entry"]
        }
      ]
    }
  ]
}
```

중요:

- 프론트는 현재 `curriculumPreview`를 쓰지만, 백엔드는 `sections` 구조로 주는 편이 더 맞다.
- `isPreview`, `isLocked`, `lesson order`가 중요하다.

### 3. 내 학습 목록 API

권장 API:

- `GET /me/courses`

권장 응답 예시:

```json
[
  {
    "id": "course_1",
    "slug": "llm-study-assistant-ui",
    "title": "LLM 학습 도우미 UI 설계",
    "enrollmentStatus": "ACTIVE",
    "lastLessonId": "lesson_3",
    "progressPercent": 42
  },
  {
    "id": "course_2",
    "slug": "spring-lms-api-design",
    "title": "Spring LMS API 설계",
    "enrollmentStatus": "PENDING"
  }
]
```

중요:

- `ACTIVE`, `PENDING`는 반드시 구분돼야 한다.
- `lastLessonId`, `progressPercent`가 있으면 학습 탭 UX가 훨씬 좋아진다.

### 4. 학습 플레이어 API

권장 API:

- `GET /learn/courses/{courseId}`

권장 응답 예시:

```json
{
  "courseId": "course_1",
  "courseTitle": "LLM 학습 도우미 UI 설계",
  "enrollmentStatus": "ACTIVE",
  "progressPercent": 42,
  "currentLessonId": "lesson_3",
  "sections": [
    {
      "id": "section_1",
      "title": "AI UX 기초",
      "lessons": [
        {
          "id": "lesson_1",
          "title": "...",
          "isLocked": false,
          "videoUrl": "...",
          "durationSec": 900
        }
      ]
    }
  ]
}
```

중요:

- 플레이어 API는 권한 기반으로 분리하는 편이 맞다.
- 권한 없으면 403을 주고, 프론트가 안내 화면으로 분기하는 구조가 좋다.

### 5. 진도 저장 API

권장 API:

- `POST /learn/lessons/{lessonId}/progress`

예시 payload:

```json
{
  "watchedSeconds": 318,
  "completed": false
}
```

### 6. 학생 출석 / 캘린더 조회 API

이 부분이 예전 문서와 가장 달라진다.
이제 출석은 `courseId` 기준이 아니라 `학생에게 허용된 scope의 일정` 기준으로 내려와야 한다.

권장 API:

- `GET /me/attendance/workspace`

권장 응답 예시:

```json
{
  "programName": "AI 서비스 개발자 국비지원 과정",
  "className": "AI Product Engineering 3기",
  "classScope": "ai-product-engineering-3",
  "allowedScheduleScopes": ["global", "ai-product-engineering-3"],
  "expectedCodeLength": 6,
  "schedules": [
    {
      "id": "schedule_1",
      "title": "오전 출석 체크",
      "categoryLabel": "필수 출석",
      "dateKey": "2026-04-08",
      "dateLabel": "4월 8일 수요일",
      "timeLabel": "09:00 - 09:20",
      "locationLabel": "8층 AI 강의실",
      "visibilityType": "class",
      "visibilityScope": "ai-product-engineering-3",
      "visibilityLabel": "AI Product Engineering 3기 수업",
      "requiresAttendanceCheck": true,
      "attendanceWindowLabel": "09:20까지 인증 가능",
      "attendanceStatus": "NOT_CHECKED_IN",
      "supportsCodeCheckIn": true,
      "color": "#22c55e"
    },
    {
      "id": "schedule_2",
      "title": "커리어 코칭 데이",
      "categoryLabel": "특강",
      "dateKey": "2026-04-10",
      "dateLabel": "4월 10일 금요일",
      "timeLabel": "14:00 - 16:00",
      "locationLabel": "온라인 라이브 · Meet",
      "visibilityType": "global",
      "visibilityScope": "global",
      "visibilityLabel": "학원 전체 행사",
      "requiresAttendanceCheck": false,
      "color": "#f59e0b"
    }
  ]
}
```

중요:

- `global`은 학원 전체 행사
- `class`는 반 수업
- 학생은 `allowedScheduleScopes`에 포함된 일정만 볼 수 있어야 한다
- 프론트는 이 응답으로 학생 캘린더와 출석 탭을 동시에 그린다
- `requiresAttendanceCheck`가 `true`인 일정만 출석 카드로 연결된다
- 색상은 프론트에서 고정 맵핑할 수도 있지만, 관리자 선택값을 그대로 내려줘도 된다

### 7. 출석 체크 API

권장 API:

- `POST /attendance/check-in`

권장 payload:

```json
{
  "scheduleId": "schedule_1",
  "code": "381924"
}
```

권장 응답 예시:

```json
{
  "scheduleId": "schedule_1",
  "attendanceStatus": "CHECKED_IN",
  "checkedAt": "2026-04-08T09:03:00+09:00",
  "isLate": false
}
```

중요:

- `scheduleId` 기준으로 처리해야 한다
- 이미 출석했는지, 지각인지, 코드가 틀렸는지 상태를 명확히 내려줘야 한다
- `expectedCodeLength`는 workspace 조회 응답이나 별도 설정 응답에 포함해도 된다

### 8. 관리자 스케줄/권한 관리 API

이건 아직 프론트 UI는 없지만, 다음 단계에서 거의 확실히 필요하다.

권장 API:

- `GET /admin/students/{studentId}/schedule-scopes`
- `PUT /admin/students/{studentId}/schedule-scopes`
- `POST /admin/schedules`
- `PATCH /admin/schedules/{scheduleId}`

권장 스케줄 생성 payload 예시:

```json
{
  "title": "오전 출석 체크",
  "visibilityType": "class",
  "visibilityScope": "ai-product-engineering-3",
  "repeatRule": "WEEKLY",
  "repeatCustom": null,
  "color": "#22c55e",
  "requiresAttendanceCheck": true,
  "supportsCodeCheckIn": true,
  "attendanceWindowStart": "09:00",
  "attendanceWindowEnd": "09:20",
  "locationLabel": "8층 AI 강의실"
}
```

반복 정책은 최소 아래 정도면 프론트에서 UX 만들기 쉽다.

- `NONE`
- `DAILY`
- `WEEKLY`
- `CUSTOM`

### 9. 인증 / 사용자 정보 API

권장 로그인 응답:

```json
{
  "accessToken": "jwt",
  "user": {
    "id": "user_1",
    "name": "홍길동",
    "email": "user@example.com",
    "role": "student"
  }
}
```

중요:

- role은 `student`, `instructor`, `admin` 중 하나로 맞추는 편이 좋다
- 프론트는 role로 네비게이션과 CTA를 제어한다

---

## 최종 메모

현재 프론트는 다음 세 가지가 핵심 상태다.

1. 홈은 공개 탐색 UX가 상당히 정리되어 있음
2. 학습 탭은 `내 강의 + 플레이어 + 커리큘럼 + 출석 진입` 허브로 정리됨
3. 출석은 강의별이 아니라 `학생 소속 + 일정 scope + 필수 출석 일정` 모델로 재설계됨

다음 단계의 핵심은 아래 두 가지다.

1. 목데이터 제거 후 실제 서버 응답 연결
2. 학생 화면과 관리자 화면을 완전히 분리한 상태에서 출석/스케줄 도메인 확장

특히 출석/캘린더 쪽은 이제 프론트 뼈대가 마련됐기 때문에, 백엔드가 `scope 기반 일정 응답`과 `scheduleId 기반 출석 처리`만 맞춰주면 실제 기능으로 옮기기 쉬운 상태다.
