"use client";

import { useEffect, useState } from "react";

import { getAttendanceOverview, studentAttendanceProfile } from "@/features/attendance/mock-attendance-data";
import { EnrollmentStatusBadge } from "@/features/course/enrollment-status-badge";
import { CurriculumGrid } from "@/features/learn/curriculum-grid";
import { LearningMetrics } from "@/features/learn/learning-metrics";
import { MyCourseList } from "@/features/learn/my-course-list";
import { PlayerStage } from "@/features/learn/player-stage";
import { WorkspaceActions } from "@/features/learn/workspace-actions";
import { fetchMyLearningCourses } from "@/services/course";
import type { CourseDetail, CourseLessonPreview } from "@/types/course";

export function LearnPlayerView({
  course,
  selectedLesson,
  isPreviewMode,
}: {
  course: CourseDetail;
  selectedLesson: CourseLessonPreview;
  isPreviewMode: boolean;
}) {
  const attendanceOverview = getAttendanceOverview(studentAttendanceProfile);
  const [learningCourses, setLearningCourses] = useState<CourseDetail[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetchMyLearningCourses().then((courses) => {
      if (!cancelled) {
        setLearningCourses(courses);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">Learn</p>
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
          <MyCourseList learningCourses={learningCourses} selectedCourseId={course.id} />
          <PlayerStage course={course} selectedLesson={selectedLesson} isPreviewMode={isPreviewMode} />
          <LearningMetrics course={course} selectedLesson={selectedLesson} />
          <CurriculumGrid course={course} selectedLesson={selectedLesson} />
        </div>
        <WorkspaceActions course={course} attendanceOverview={attendanceOverview} />
      </section>
    </div>
  );
}
