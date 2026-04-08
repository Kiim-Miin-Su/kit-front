"use client";

import { useEffect, useMemo, useState } from "react";

import {
  fetchAdminInstructorCourseWorkspace,
  updateInstructorCourseAssignment,
} from "@/services/admin";
import type { AdminInstructorCourseWorkspace } from "@/types/admin";

export function AdminInstructorCourseManager() {
  const [workspace, setWorkspace] = useState<AdminInstructorCourseWorkspace>();
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dirtyCourseIdsByInstructor, setDirtyCourseIdsByInstructor] = useState<Record<string, string[]>>({});
  const [savingInstructorId, setSavingInstructorId] = useState<string>();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    // 초기 로드 시 API 응답을 기준으로 강사-과정 매핑 상태를 만들고,
    // 로컬 편집용 state(dirtyCourseIdsByInstructor)를 분리해 즉시 UI 반영한다.
    fetchAdminInstructorCourseWorkspace()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setWorkspace(data);
        const initial = data.instructors.reduce<Record<string, string[]>>((acc, instructor) => {
          acc[instructor.instructorId] = instructor.assignedCourseIds;
          return acc;
        }, {});
        setDirtyCourseIdsByInstructor(initial);
      })
      .catch(() => {
        if (!cancelled) {
          setMessage({
            type: "error", // ts로 저장?
            text: "강사-과정 매핑 정보를 불러오지 못했습니다.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredInstructors = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const keyword = searchKeyword.trim().toLowerCase();

    if (keyword.length === 0) {
      return workspace.instructors;
    }

    return workspace.instructors.filter((instructor) =>
      [instructor.instructorName, instructor.instructorTitle].join(" ").toLowerCase().includes(keyword),
    );
  }, [searchKeyword, workspace]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Instructor Course Mapping
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
            강사 담당 과정 매핑
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            강사별 담당 과정을 지정합니다. 지정된 과정은 강사 콘솔 권한 범위의 기준으로 사용됩니다.
          </p>
        </div>
        <label className="block min-w-[220px]">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            강사 검색
          </span>
          <input
            value={searchKeyword}
            onChange={(event) => setSearchKeyword(event.target.value)}
            placeholder="강사명/직책 검색"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
          />
        </label>
      </div>

      {message ? (
        <p
          className={`mt-3 text-sm font-semibold ${
            message.type === "success" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">강사 매핑 데이터를 불러오는 중입니다...</p>
      ) : !workspace ? (
        <p className="mt-4 text-sm text-slate-500">표시할 강사 데이터가 없습니다.</p>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {filteredInstructors.map((instructor) => {
            const selectedCourseIds = dirtyCourseIdsByInstructor[instructor.instructorId] ?? [];

            return (
              <article
                key={instructor.instructorId}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{instructor.instructorName}</p>
                    <p className="text-xs text-slate-500">{instructor.instructorTitle}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {selectedCourseIds.length}개 과정
                  </span>
                </div>

                <div className="mt-3 max-h-[220px] space-y-2 overflow-auto pr-1">
                  {workspace.courses.map((course) => {
                    const checked = selectedCourseIds.includes(course.courseId);

                    return (
                      <label
                        key={course.courseId}
                        className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            // 체크박스 토글은 로컬 상태만 변경한다.
                            // 실제 권한 반영은 저장 버튼 클릭 시 API에 반영된다.
                            setDirtyCourseIdsByInstructor((prev) => {
                              const current = prev[instructor.instructorId] ?? [];
                              const next = event.target.checked
                                ? Array.from(new Set([...current, course.courseId]))
                                : current.filter((courseId) => courseId !== course.courseId);

                              return {
                                ...prev,
                                [instructor.instructorId]: next,
                              };
                            });
                          }}
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-700">
                            {course.courseTitle}
                          </span>
                          <span className="text-xs text-slate-500">{course.category}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-slate-500">
                    변경 후 저장해야 권한 범위에 반영됩니다.
                  </p>
                  <button
                    type="button"
                    disabled={savingInstructorId === instructor.instructorId}
                    onClick={async () => {
                      setSavingInstructorId(instructor.instructorId);
                      setMessage(undefined);

                      try {
                        const updated = await updateInstructorCourseAssignment({
                          instructorId: instructor.instructorId,
                          assignedCourseIds: selectedCourseIds,
                        });

                        setWorkspace((prev) => {
                          if (!prev) {
                            return prev;
                          }

                          return {
                            ...prev,
                            instructors: prev.instructors.map((item) =>
                              item.instructorId === updated.instructorId ? updated : item,
                            ),
                          };
                        });
                        setMessage({
                          type: "success",
                          text: `${updated.instructorName} 강사 담당 과정을 저장했습니다.`,
                        });
                      } catch {
                        setMessage({
                          type: "error",
                          text: "저장 중 오류가 발생했습니다.",
                        });
                      } finally {
                        setSavingInstructorId(undefined);
                      }
                    }}
                    className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold text-white ${
                      savingInstructorId === instructor.instructorId
                        ? "cursor-not-allowed bg-slate-300"
                        : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {savingInstructorId === instructor.instructorId ? "저장 중..." : "저장"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
