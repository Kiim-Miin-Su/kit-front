"use client";

import Link from "next/link";
import { useState } from "react";

import type { CourseDetail } from "@/types/course";

export function CourseCurriculumAccordion({ course }: { course: CourseDetail }) {
  const [openLessonId, setOpenLessonId] = useState(course.curriculumPreview[0]?.id ?? "");

  return (
    <div className="mt-6 space-y-3">
      {course.curriculumPreview.map((lesson, index) => {
        const open = lesson.id === openLessonId;

        return (
          <div
            key={lesson.id}
            className={`rounded-2xl border transition ${
              open ? "border-brand bg-brand/5" : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => setOpenLessonId((prev) => (prev === lesson.id ? "" : lesson.id))}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Lesson {index + 1}
                </p>
                <p className="mt-2 truncate text-sm font-semibold text-ink">{lesson.title}</p>
              </div>
              <div className="flex items-center gap-3">
                {lesson.isPreview ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    미리보기
                  </span>
                ) : null}
                <span className="text-sm text-slate-500">{lesson.durationLabel}</span>
                <span className="text-slate-400">{open ? "−" : "+"}</span>
              </div>
            </button>
            {open ? (
              <div className="border-t border-slate-200/80 px-4 py-4">
                <p className="text-sm leading-6 text-slate-600">
                  {lesson.summary ?? "이 레슨에서 다룰 핵심 흐름과 구현 포인트를 미리 확인할 수 있습니다."}
                </p>
                {lesson.headers?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {lesson.headers.map((header) => (
                      <span
                        key={header}
                        className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600"
                      >
                        {header}
                      </span>
                    ))}
                  </div>
                ) : null}
                {lesson.isPreview ? (
                  <Link
                    href={`/learn?courseSlug=${course.slug}&previewLessonId=${lesson.id}`}
                    className="mt-4 inline-flex rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-800"
                  >
                    이 레슨 미리보기
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
