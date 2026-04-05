import Link from "next/link";

import { EnrollmentStatusBadge } from "@/features/course/enrollment-status-badge";
import { enrollmentStatusMap } from "@/features/course/enrollment-status";
import type { CourseSummary } from "@/types/course";

export function CourseCard({ course }: { course: CourseSummary }) {
  const statusMeta = enrollmentStatusMap[course.enrollmentStatus];

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div
        className={`bg-gradient-to-br ${course.thumbnailTone} p-6 text-white`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
              {course.category}
            </p>
            <h3 className="mt-3 text-2xl font-semibold leading-tight">
              {course.title}
            </h3>
          </div>
          <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            {course.level}
          </div>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-6 text-white/85">
          {course.subtitle}
        </p>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <EnrollmentStatusBadge status={course.enrollmentStatus} />
          {course.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {tag}
            </span>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {course.description}
        </p>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            수강 상태
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">{statusMeta.description}</p>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              강사
            </p>
            <p className="mt-2 font-semibold text-ink">{course.instructor.name}</p>
            <p className="text-xs">{course.instructor.title}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
              구성
            </p>
            <p className="mt-2 font-semibold text-ink">{course.lessonCount}개 강의</p>
            <p className="text-xs">{course.durationLabel}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-semibold tracking-tight text-ink">
              {course.priceLabel}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              평점 {course.rating} · 후기 {course.reviewCount}개
            </p>
          </div>
          <Link
            href={`/courses/${course.slug}`}
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            상세 보기
          </Link>
        </div>
      </div>
    </article>
  );
}
