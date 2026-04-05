import Link from "next/link";

import { AttendanceCheckCard } from "@/features/attendance/attendance-check-card";
import { getAttendanceOverview, studentAttendanceProfile } from "@/features/attendance/mock-attendance-data";
import { EnrollmentStatusBadge } from "@/features/course/enrollment-status-badge";
import type { CourseDetail, CourseLessonPreview } from "@/types/course";

export function LearnPlayerView({
  course,
  selectedLesson,
  isPreviewMode,
  learningCourses,
}: {
  course: CourseDetail;
  selectedLesson: CourseLessonPreview;
  isPreviewMode: boolean;
  learningCourses: CourseDetail[];
}) {
  const pendingCourses = learningCourses.filter((item) => item.enrollmentStatus === "PENDING");
  const activeCourses = learningCourses.filter((item) => item.enrollmentStatus === "ACTIVE");
  const attendanceOverview = getAttendanceOverview(studentAttendanceProfile);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
            Learn
          </p>
          <EnrollmentStatusBadge status={course.enrollmentStatus} />
          {isPreviewMode ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              미리보기 재생
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
          내 강의와 플레이어를 한 화면에서 관리하세요
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          내 강의 목록, 플레이어, 커리큘럼, 출석 진입점을 한 워크스페이스로 묶었습니다.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  My Courses
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  신청 대기 강의와 수강 중 강의를 먼저 고르고, 바로 아래에서 학습을 이어갑니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {learningCourses.length}개
              </span>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <CourseGroup
                title="수강 중"
                emptyLabel="수강 중인 강의가 없습니다."
                courses={activeCourses}
                selectedCourseId={course.id}
              />
              <CourseGroup
                title="신청 대기"
                emptyLabel="대기 중인 강의가 없습니다."
                courses={pendingCourses}
                selectedCourseId={course.id}
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
            <div className={`bg-gradient-to-br ${course.thumbnailTone} p-6 text-white`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    {course.category}
                  </p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight">{course.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-white/80">{selectedLesson.title}</p>
                </div>
                <div className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
                  {selectedLesson.durationLabel}
                </div>
              </div>
              <div className="mt-6 aspect-[16/8] rounded-[28px] border border-white/10 bg-slate-950/25 p-6 backdrop-blur">
                <div className="flex h-full flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-rose-300" />
                    <span className="h-3 w-3 rounded-full bg-amber-300" />
                    <span className="h-3 w-3 rounded-full bg-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/60">
                      Mock Lesson
                    </p>
                    <p className="mt-3 max-w-2xl text-2xl font-semibold leading-tight">
                      강의 선택, 플레이어 재생, 커리큘럼 이동이 학습 탭 안에서 바로 이어집니다.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-white/75">
                    <span>{course.instructor.name}</span>
                    <span>{isPreviewMode ? "Preview Access" : "Active Enrollment"}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="현재 강의"
              value={course.lessonCount.toString()}
              description="선택한 강의의 레슨 수"
            />
            <MetricCard
              label="현재 레슨"
              value={selectedLesson.durationLabel}
              description="지금 재생 중인 레슨 길이"
            />
            <MetricCard
              label="수강 상태"
              value={course.enrollmentStatus === "PENDING" ? "신청 대기" : "수강 중"}
              description="신청 대기 강의는 미리보기만, 수강 중 강의는 학습 재개"
            />
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Curriculum
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  선택한 강의의 커리큘럼을 메인 영역에서 크게 보고 바로 다음 레슨으로 이동합니다.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {course.lessonCount}개 강의
              </span>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {course.curriculumPreview.map((lesson, index) => {
                const active = lesson.id === selectedLesson.id;

                return (
                  <div
                    key={lesson.id}
                    className={`rounded-[24px] border p-5 transition ${
                      active
                        ? "border-brand bg-brand/5 shadow-sm"
                        : "border-slate-200 bg-slate-50 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Lesson {index + 1}
                        </p>
                        <p className="mt-2 text-[15px] font-semibold leading-6 text-ink">
                          {lesson.title}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                        {lesson.durationLabel}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {lesson.summary ??
                        "선택한 강의 안에서 현재 레슨의 핵심 주제와 구현 포인트를 확인할 수 있습니다."}
                    </p>
                    {lesson.headers?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {lesson.headers.map((header) => (
                          <span
                            key={header}
                            className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm"
                          >
                            {header}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/learn?courseSlug=${course.slug}&previewLessonId=${lesson.id}`}
                        className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
                          active
                            ? "bg-brand text-white"
                            : lesson.isPreview
                              ? "bg-emerald-100 text-emerald-800"
                              : "border border-slate-200 bg-white text-ink"
                        }`}
                      >
                        {active ? "현재 재생 중" : lesson.isPreview ? "미리보기 열기" : "이 레슨 보기"}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:h-fit">
          <AttendanceCheckCard attendance={attendanceOverview} />

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Workspace
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              학습 여정과 운영 흐름을 한 번에 보도록 묶었습니다. 출석 체크, 강의 상세 확인,
              다른 강의 이동까지 여기서 정리합니다.
            </p>
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  학습 여정
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  내 강의 선택, 플레이어 확인, 커리큘럼 이동을 한 화면에서 이어갑니다.
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  운영
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  학생 대시보드의 출석 흐름과 강의 상세 이동까지 운영 시나리오를 같이 봅니다.
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              <Link
                href="/student?tab=attendance"
                className="block rounded-full bg-brand px-5 py-3 text-center text-sm font-semibold text-white"
              >
                출석 체크로 이동
              </Link>
              <Link
                href={`/courses/${course.slug}`}
                className="block rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-semibold text-ink"
              >
                강의 상세 보기
              </Link>
              <Link
                href="/courses"
                className="block rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-semibold text-ink"
              >
                다른 강의 둘러보기
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function CourseGroup({
  title,
  emptyLabel,
  courses,
  selectedCourseId,
}: {
  title: string;
  emptyLabel: string;
  courses: CourseDetail[];
  selectedCourseId: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      {courses.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">{emptyLabel}</div>
      ) : (
        courses.map((item) => {
          const active = item.id === selectedCourseId;

          return (
            <Link
              key={item.id}
              href={`/learn?courseSlug=${item.slug}`}
              className={`block rounded-2xl border px-4 py-4 transition ${
                active ? "border-brand bg-brand/5" : "border-slate-200 bg-slate-50 hover:bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.lessonCount}개 강의 · {item.durationLabel}
                  </p>
                </div>
                <EnrollmentStatusBadge status={item.enrollmentStatus} />
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
