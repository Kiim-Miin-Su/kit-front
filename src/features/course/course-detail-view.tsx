import Link from "next/link";

import { CourseCurriculumAccordion } from "@/features/course/course-curriculum-accordion";
import { EnrollmentStatusBadge } from "@/features/course/enrollment-status-badge";
import { enrollmentStatusMap } from "@/features/course/enrollment-status";
import type { CourseDetail } from "@/types/course";

export function CourseDetailView({ course }: { course: CourseDetail }) {
  const statusMeta = enrollmentStatusMap[course.enrollmentStatus];
  const previewLesson = course.curriculumPreview.find((lesson) => lesson.isPreview);

  return (
    <div className="space-y-6">
      <section
        className={`overflow-hidden rounded-[32px] bg-gradient-to-br ${course.thumbnailTone} p-8 text-white shadow-sm`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {course.category}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            {course.level}
          </span>
          <EnrollmentStatusBadge status={course.enrollmentStatus} />
        </div>
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight">
          {course.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">
          {course.description}
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Course Overview
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-600">{course.subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {course.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <InfoCard label="강사" value={course.instructor.name} subValue={course.instructor.title} />
              <InfoCard label="강의 구성" value={`${course.lessonCount}개 강의`} subValue={course.durationLabel} />
              <InfoCard label="평점" value={course.rating.toFixed(1)} subValue={`후기 ${course.reviewCount}개`} />
              <InfoCard label="수강생" value={`${course.enrollmentCount.toLocaleString()}명`} subValue={course.priceLabel} />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              What You Will Learn
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {course.learningPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700"
                >
                  {point}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
                  Curriculum Preview
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  플레이어 진입 전에도 강의 흐름을 미리 확인할 수 있도록 일부 커리큘럼을 노출합니다.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                {course.lessonCount} lessons
              </div>
            </div>
            <CourseCurriculumAccordion course={course} />
          </section>
        </div>

        <aside className="h-fit rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Enrollment
          </p>
          <div className="mt-4">
            <EnrollmentStatusBadge status={course.enrollmentStatus} />
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{statusMeta.description}</p>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              접근 정책
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              플레이어 진입은 `ACTIVE` 상태에서만 허용합니다. 나머지 상태는 상세 화면에서 안내만 제공하고 버튼은 비활성화합니다.
            </p>
          </div>
          <div className="mt-8 space-y-3">
            {statusMeta.actionDisabled ? (
              <span className="block cursor-not-allowed rounded-full bg-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-500">
                {statusMeta.actionLabel}
              </span>
            ) : (
              <Link
                href={`/learn?courseSlug=${course.slug}`}
                className="block rounded-full bg-ink px-5 py-3 text-center text-sm font-semibold text-white"
              >
                {statusMeta.actionLabel}
              </Link>
            )}
            {previewLesson ? (
              <Link
                href={`/learn?courseSlug=${course.slug}&previewLessonId=${previewLesson.id}`}
                className="block rounded-full border border-emerald-200 bg-emerald-50 px-5 py-3 text-center text-sm font-semibold text-emerald-800"
              >
                미리보기 보기
              </Link>
            ) : null}
            <Link
              href="/courses"
              className="block rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-center text-sm font-semibold text-ink"
            >
              목록으로 돌아가기
            </Link>
          </div>
        </aside>
      </section>
    </div>
  );
}

function InfoCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{subValue}</p>
    </div>
  );
}
