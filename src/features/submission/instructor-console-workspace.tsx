"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { resolveRuntimeActor } from "@/config/runtime-defaults";
import { SubmissionIdeEditor } from "@/features/submission/submission-ide-editor";
import {
  submissionLanguageLabelMap,
  submissionLanguageOptions,
  submissionReviewStatusLabelMap,
  submissionReviewStatusToneMap,
} from "@/features/submission/submission-status";
import {
  instructorSubmissionStatusFilterOptions,
  instructorTemplateTargetModeOptions,
  type InstructorTemplateTargetMode,
  submissionEditorTypeOptions,
} from "@/features/submission/submission-ui-config";
import {
  createInstructorAssignment,
  fetchSubmissionDetail,
  fetchInstructorSubmissionWorkspace,
  upsertInstructorAssignmentTemplate,
  uploadInstructorVideo,
} from "@/services/submission";
import { useAuthStore } from "@/store/auth-store";
import type {
  AssignmentTemplate,
  InstructorSubmissionWorkspaceData,
  SubmissionCodeLanguage,
  SubmissionEditorType,
  SubmissionError,
  SubmissionReviewStatus,
  SubmissionTimelineEvent,
} from "@/types/submission";

const submissionPageSize = 8;
type SubmissionSortKey = "LATEST" | "OLDEST" | "STUDENT_ASC" | "STATUS";

export function InstructorConsoleWorkspace() {
  const user = useAuthStore((state) => state.user);
  const instructorActor = resolveRuntimeActor(user, "instructor");
  const actorId = instructorActor.id;
  const actorName = instructorActor.name;
  const [workspace, setWorkspace] = useState<InstructorSubmissionWorkspaceData>();
  const [courseFilter, setCourseFilter] = useState<string>("ALL");
  const [studentFilter, setStudentFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<SubmissionReviewStatus | "ALL">("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [sortKey, setSortKey] = useState<SubmissionSortKey>("LATEST");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>();
  const [selectedSubmissionTimeline, setSelectedSubmissionTimeline] = useState<
    SubmissionTimelineEvent[]
  >([]);
  const [createCourseId, setCreateCourseId] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createPrompt, setCreatePrompt] = useState("");
  const [createDueAtInput, setCreateDueAtInput] = useState(() => buildDefaultDueAtInput());
  const [createAllowFileUpload, setCreateAllowFileUpload] = useState(true);
  const [createAllowCodeEditor, setCreateAllowCodeEditor] = useState(true);
  const [templateTargetMode, setTemplateTargetMode] = useState<InstructorTemplateTargetMode>("NEW_ASSIGNMENT");
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [showDashboardDetail, setShowDashboardDetail] = useState(false);
  const [showAllRecentHistory, setShowAllRecentHistory] = useState(false);
  const [templateAssignmentId, setTemplateAssignmentId] = useState("");
  const [templateEditorType, setTemplateEditorType] = useState<SubmissionEditorType>("IDE");
  const [templateCodeLanguage, setTemplateCodeLanguage] =
    useState<SubmissionCodeLanguage>("typescript");
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [videoCourseId, setVideoCourseId] = useState<string>("ALL");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();

  const loadWorkspace = async () => {
    const data = await fetchInstructorSubmissionWorkspace();
    setWorkspace(data);
    setSelectedSubmissionId((current) => current || data.submissions[0]?.id);
    setVideoCourseId((current) => current === "ALL" ? data.assignments[0]?.courseId ?? "ALL" : current);
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  const uniqueCourses = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const map = new Map<string, string>();
    workspace.assignments.forEach((assignment) => {
      map.set(assignment.courseId, assignment.courseTitle);
    });

    return Array.from(map.entries()).map(([courseId, courseTitle]) => ({
      courseId,
      courseTitle,
    }));
  }, [workspace]);

  const filteredSubmissions = useMemo(() => {
    if (!workspace) {
      return [];
    }

    const normalizedKeyword = searchKeyword.trim().toLowerCase();
    const filtered = workspace.submissions.filter((submission) => {
      const matchesCourse = courseFilter === "ALL" || submission.courseId === courseFilter;
      const matchesStudent = studentFilter === "ALL" || submission.studentId === studentFilter;
      const matchesStatus = statusFilter === "ALL" || submission.reviewStatus === statusFilter;
      const matchesKeyword =
        normalizedKeyword.length === 0 ||
        [
          submission.assignmentTitle,
          submission.courseTitle,
          submission.studentName,
          submission.message,
          submission.code,
          submission.feedbackHistory?.[0]?.message ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedKeyword);

      return matchesCourse && matchesStudent && matchesStatus && matchesKeyword;
    });
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === "OLDEST") {
        return Number(new Date(a.submittedAt)) - Number(new Date(b.submittedAt));
      }

      if (sortKey === "STUDENT_ASC") {
        return a.studentName.localeCompare(b.studentName, "ko");
      }

      if (sortKey === "STATUS") {
        const rank: Record<SubmissionReviewStatus, number> = {
          NEEDS_REVISION: 0,
          SUBMITTED: 1,
          REVIEWED: 2,
        };

        return rank[a.reviewStatus] - rank[b.reviewStatus];
      }

      return Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt));
    });

    return sorted;
  }, [courseFilter, searchKeyword, sortKey, statusFilter, studentFilter, workspace]);
  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / submissionPageSize));
  const pagedSubmissions = filteredSubmissions.slice(
    (currentPage - 1) * submissionPageSize,
    currentPage * submissionPageSize,
  );

  const selectedSubmission =
    filteredSubmissions.find((submission) => submission.id === selectedSubmissionId) ??
    filteredSubmissions[0];
  const latestTemplateByAssignment = useMemo(() => {
    if (!workspace) {
      return new Map<string, AssignmentTemplate>();
    }

    const map = new Map<string, AssignmentTemplate>();

    workspace.templates.forEach((template) => {
      const current = map.get(template.assignmentId);

      if (!current || Number(new Date(template.updatedAt)) > Number(new Date(current.updatedAt))) {
        map.set(template.assignmentId, template);
      }
    });

    return map;
  }, [workspace]);
  const latestIdeTemplateByAssignment = useMemo(() => {
    if (!workspace) {
      return new Map<string, AssignmentTemplate>();
    }

    const map = new Map<string, AssignmentTemplate>();

    workspace.templates
      .filter((template) => template.editorType === "IDE")
      .forEach((template) => {
        const current = map.get(template.assignmentId);

        if (!current || Number(new Date(template.updatedAt)) > Number(new Date(current.updatedAt))) {
          map.set(template.assignmentId, template);
        }
      });

    return map;
  }, [workspace]);
  const recentAssignmentHistory = useMemo(() => {
    if (!workspace) {
      return [];
    }

    return [...workspace.assignments]
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .slice(0, 10);
  }, [workspace]);
  const selectedAssignmentTemplate = useMemo(() => {
    if (!workspace || !templateAssignmentId) {
      return undefined;
    }

    return workspace.templates
      .filter(
        (template) =>
          template.assignmentId === templateAssignmentId &&
          template.editorType === templateEditorType &&
          template.codeLanguage === templateCodeLanguage,
      )
      .sort((a, b) => Number(new Date(b.updatedAt)) - Number(new Date(a.updatedAt)))[0];
  }, [templateAssignmentId, templateCodeLanguage, templateEditorType, workspace]);

  useEffect(() => {
    if (!workspace) {
      return;
    }

    setTemplateAssignmentId((current) => {
      if (current && workspace.assignments.some((assignment) => assignment.id === current)) {
        return current;
      }

      const latestCreatedAssignment = [...workspace.assignments].sort(
        (a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)),
      )[0];

      return latestCreatedAssignment?.id ?? workspace.assignments[0]?.id ?? "";
    });
    setCreateCourseId((current) => {
      if (current && workspace.assignments.some((assignment) => assignment.courseId === current)) {
        return current;
      }

      return workspace.assignments[0]?.courseId ?? "";
    });
  }, [workspace]);

  useEffect(() => {
    if (templateTargetMode !== "TEMPLATE_AUTHORING") {
      return;
    }

    // 템플릿 작성 모드에서는 선택한 기존 과제 템플릿을 편집기에 즉시 로드한다.
    // 신규 과제 모드에서 작성 중인 초안과 충돌하지 않도록 모드 단위로 분리한다.
    if (!selectedAssignmentTemplate) {
      setTemplateTitle("");
      setTemplateContent("");
      return;
    }

    setTemplateTitle(selectedAssignmentTemplate.title);
    setTemplateContent(selectedAssignmentTemplate.content);
  }, [selectedAssignmentTemplate, templateTargetMode]);

  useEffect(() => {
    if (!workspace || !selectedSubmission) {
      setSelectedSubmissionTimeline([]);
      return;
    }

    let cancelled = false;
    void fetchSubmissionDetail(selectedSubmission.id)
      .then((detail) => {
        if (cancelled) {
          return;
        }

        setSelectedSubmissionTimeline(detail.timeline);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        // 상세 페이지와 동일하게 "해당 학생 + 해당 과제의 revision" 타임라인만 노출한다.
        const revisionIdSet = new Set(
          workspace.submissions
            .filter(
              (item) =>
                item.assignmentId === selectedSubmission.assignmentId &&
                item.studentId === selectedSubmission.studentId,
            )
            .map((item) => item.id),
        );
        const fallback = workspace.timeline
          .filter((event) => event.submissionId && revisionIdSet.has(event.submissionId))
          .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));

        setSelectedSubmissionTimeline(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSubmission, workspace]);

  useEffect(() => {
    setCurrentPage(1);
  }, [courseFilter, searchKeyword, sortKey, statusFilter, studentFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!selectedSubmission) {
      return;
    }

    if (!filteredSubmissions.some((item) => item.id === selectedSubmission.id)) {
      setSelectedSubmissionId(filteredSubmissions[0]?.id);
    }
  }, [filteredSubmissions, selectedSubmission]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Instructor Console
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            과제 이력/제출율/영상 업로드 관리
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            학생 제출을 과정/학생 기준으로 추적하고, 리뷰 상태 및 영상 업로드 이력을 함께
            관리합니다.
          </p>
        </div>
      </div>

      {!workspace ? (
        <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm text-slate-500">강사 콘솔 데이터를 불러오는 중입니다.</p>
        </section>
      ) : (
        <div className="mt-5 space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink">과제 제출 현황</p>
              <button
                type="button"
                onClick={() => setShowDashboardDetail((prev) => !prev)}
                className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                {showDashboardDetail ? "접기" : "더보기"}
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              <MetricCard
                label="예상 제출 수"
                value={`${workspace.dashboard.expectedSubmissionCount}건`}
              />
              <MetricCard label="실제 제출 수" value={`${workspace.dashboard.submittedCount}건`} />
              <MetricCard label="전체 제출율" value={`${workspace.dashboard.submissionRate}%`} />
              <MetricCard label="재검토 필요" value={`${workspace.dashboard.pendingReviewCount}건`} />
              <MetricCard label="수정 필요" value={`${workspace.dashboard.needsRevisionCount}건`} />
              <MetricCard label="리뷰 완료" value={`${workspace.dashboard.reviewedCount}건`} />
            </div>
            {showDashboardDetail ? (
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ink">시각화</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <article className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      상태 분포
                    </p>
                    <div className="mt-2 space-y-2">
                      {(
                        [
                          { label: "리뷰 완료", value: workspace.dashboard.reviewedCount, tone: "bg-emerald-500" },
                          {
                            label: "수정 필요",
                            value: workspace.dashboard.needsRevisionCount,
                            tone: "bg-amber-500",
                          },
                          {
                            label: "재검토 필요",
                            value: workspace.dashboard.pendingReviewCount,
                            tone: "bg-slate-500",
                          },
                        ] as const
                      ).map((item) => {
                        const denominator = Math.max(1, workspace.dashboard.submittedCount);
                        const width = Math.min(100, Math.round((item.value / denominator) * 100));

                        return (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>{item.label}</span>
                              <span>{item.value}건</span>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-slate-100">
                              <div
                                className={`h-2 rounded-full ${item.tone}`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                  <article className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      학생별 제출율
                    </p>
                    <div className="mt-2 max-h-44 space-y-2 overflow-auto pr-1">
                      {workspace.dashboardByStudent.map((student) => (
                        <div key={student.studentId}>
                          <div className="flex items-center justify-between text-xs text-slate-600">
                            <span>{student.studentName}</span>
                            <span>{student.submissionRate}%</span>
                          </div>
                          <div className="mt-1 h-2 rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-brand"
                              style={{ width: `${Math.min(100, student.submissionRate)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </section>
            ) : null}
          </div>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-ink">학생별 제출율</p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  <tr>
                    <th className="px-3 py-2">학생</th>
                    <th className="px-3 py-2">제출율</th>
                    <th className="px-3 py-2">제출/예상</th>
                    <th className="px-3 py-2">최근 제출</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.dashboardByStudent.map((student) => (
                    <tr key={student.studentId} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-ink">{student.studentName}</td>
                      <td className="px-3 py-2 text-slate-700">{student.submissionRate}%</td>
                      <td className="px-3 py-2 text-slate-700">
                        {student.submittedCount}/{student.expectedSubmissionCount}
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {student.latestSubmittedAt
                          ? formatDateTime(student.latestSubmittedAt)
                          : "미제출"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <article className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">과제 업로드</p>
                <p className="mt-1 text-xs text-slate-500">
                  신규 과제 업로드와 템플릿 작성을 분리해 의도치 않은 저장을 방지합니다.
                </p>
              </div>
              <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
                {instructorTemplateTargetModeOptions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTemplateTargetMode(item.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      templateTargetMode === item.id
                        ? "bg-brand text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {templateTargetMode === "NEW_ASSIGNMENT" ? (
                <>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      과정
                    </span>
                    <select
                      value={createCourseId}
                      onChange={(event) => setCreateCourseId(event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                    >
                      {uniqueCourses.length === 0 ? (
                        <option value="">선택 가능한 과정이 없습니다.</option>
                      ) : (
                        uniqueCourses.map((course) => (
                          <option key={course.courseId} value={course.courseId}>
                            {course.courseTitle}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        과제 제목
                      </span>
                      <input
                        value={createTitle}
                        onChange={(event) => setCreateTitle(event.target.value)}
                        placeholder="예: 캘린더 일정 이벤트 API 연동"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        마감 시각
                      </span>
                      <input
                        type="datetime-local"
                        value={createDueAtInput}
                        onChange={(event) => setCreateDueAtInput(event.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      과제 설명
                    </span>
                    <textarea
                      value={createPrompt}
                      onChange={(event) => setCreatePrompt(event.target.value)}
                      rows={4}
                      placeholder="학생이 구현해야 할 범위와 검토 기준을 적어주세요."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                    />
                  </label>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createAllowCodeEditor}
                        onChange={(event) => {
                          setCreateAllowCodeEditor(event.target.checked);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-brand"
                      />
                      코드 에디터 제출 허용
                    </label>
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={createAllowFileUpload}
                        onChange={(event) => setCreateAllowFileUpload(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-brand"
                      />
                      파일 첨부 허용
                    </label>
                  </div>
                </>
              ) : null}

              <section className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  템플릿 편집기
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
                    {submissionEditorTypeOptions.map((editorOption) => (
                      <button
                        key={editorOption.value}
                        type="button"
                        onClick={() => setTemplateEditorType(editorOption.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          templateEditorType === editorOption.value
                            ? "bg-brand text-white"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {editorOption.value}
                      </button>
                    ))}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      언어
                    </span>
                    <select
                      value={templateCodeLanguage}
                      onChange={(event) =>
                        setTemplateCodeLanguage(event.target.value as SubmissionCodeLanguage)
                      }
                      className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none"
                    >
                      {submissionLanguageOptions.map((language) => (
                        <option key={language} value={language}>
                          {submissionLanguageLabelMap[language]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-2 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">템플릿 제목</span>
                  <input
                    value={templateTitle}
                    onChange={(event) => setTemplateTitle(event.target.value)}
                    placeholder={
                      templateTargetMode === "NEW_ASSIGNMENT"
                        ? "신규 과제용 템플릿 초안 (업로드 시 저장되지 않음)"
                        : "저장할 템플릿 제목"
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  />
                </label>
                {templateEditorType === "IDE" ? (
                  <div className="mt-2">
                    <SubmissionIdeEditor
                      value={templateContent}
                      onChange={setTemplateContent}
                      language={templateCodeLanguage}
                      height={220}
                    />
                  </div>
                ) : (
                  <textarea
                    value={templateContent}
                    onChange={(event) => setTemplateContent(event.target.value)}
                    rows={7}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700 outline-none"
                    placeholder={
                      templateTargetMode === "NEW_ASSIGNMENT"
                        ? "신규 과제 업로드 전에 템플릿 초안을 작성할 수 있습니다."
                        : "저장할 템플릿 본문을 작성하세요."
                    }
                  />
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {templateTargetMode === "NEW_ASSIGNMENT"
                    ? "신규 과제 모드의 템플릿 초안은 과제 업로드와 별개입니다."
                    : "저장 버튼을 눌렀을 때만 템플릿이 반영됩니다."}
                </p>
              </section>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isCreatingAssignment || templateTargetMode !== "NEW_ASSIGNMENT"}
                  onClick={handleCreateAssignment}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition ${
                    isCreatingAssignment || templateTargetMode !== "NEW_ASSIGNMENT"
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-brand hover:bg-teal-700"
                  }`}
                >
                  {isCreatingAssignment ? "업로드 중..." : "과제 업로드"}
                </button>
                <button
                  type="button"
                  disabled={!templateAssignmentId}
                  onClick={handleSaveAssignmentTemplate}
                  className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition ${
                    !templateAssignmentId
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-brand hover:bg-teal-700"
                  }`}
                >
                  템플릿 저장하기
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">최근 사용 내역</p>
                {recentAssignmentHistory.length > 5 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllRecentHistory((prev) => !prev)}
                    className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {showAllRecentHistory ? "접기" : "더보기"}
                  </button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                최근 등록한 과제 설정을 한 번에 불러와 반복 작업 시간을 줄입니다.
              </p>
              <div className="mt-3 space-y-2.5">
                {recentAssignmentHistory.length === 0 ? (
                  <p className="text-xs text-slate-500">최근 등록 이력이 없습니다.</p>
                ) : (
                  (showAllRecentHistory ? recentAssignmentHistory : recentAssignmentHistory.slice(0, 5)).map((assignment) => {
                    const selected = templateAssignmentId === assignment.id;
                    const template =
                      (assignment.allowCodeEditor
                        ? latestIdeTemplateByAssignment.get(assignment.id)
                        : undefined) ?? latestTemplateByAssignment.get(assignment.id);

                    return (
                      <div
                        key={assignment.id}
                        className={`rounded-xl border p-3 ${
                          selected
                            ? "border-emerald-300 bg-emerald-50 text-ink"
                            : "border-slate-200 bg-slate-50"
                        }`}
                      >
                        <p
                          className={`text-sm font-semibold ${
                            selected ? "text-emerald-900" : "text-ink"
                          }`}
                        >
                          {assignment.title}
                        </p>
                        <p className={`mt-1 text-xs ${selected ? "text-emerald-700" : "text-slate-500"}`}>
                          {assignment.courseTitle} · 생성 {formatDateTime(assignment.createdAt)}
                        </p>
                        <p className={`text-xs ${selected ? "text-emerald-700" : "text-slate-500"}`}>
                          마감 {formatDateTime(assignment.dueAt)}
                        </p>
                        <p className={`mt-1 text-xs ${selected ? "text-emerald-800" : "text-slate-600"}`}>
                          템플릿:{" "}
                          {template
                            ? `${template.title} (${template.editorType}/${submissionLanguageLabelMap[template.codeLanguage]})`
                            : "없음"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => applyTemplateAssignmentSelection(assignment.id)}
                            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition ${
                              selected
                                ? "border-emerald-700 bg-brand text-white hover:bg-teal-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            {selected ? "템플릿 대상 선택됨" : "템플릿 대상으로 선택"}
                          </button>
                          <button
                            type="button"
                            onClick={() => applyRecentAssignmentPreset(assignment.id)}
                            className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold transition ${
                              selected
                                ? "border-emerald-700 bg-brand text-white hover:bg-teal-700"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                            }`}
                          >
                            이 설정으로 반복
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </article>
          </div>

          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-ink">강의 영상 업로드</p>
            <p className="mt-1 text-xs text-slate-500">
              제출 리뷰와 별도로, 강의 영상 업로드 이력을 메인 영역에서 관리합니다.
            </p>
            <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="space-y-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    과정
                  </span>
                  <select
                    value={videoCourseId}
                    onChange={(event) => setVideoCourseId(event.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="ALL">과정을 선택하세요</option>
                    {uniqueCourses.map((course) => (
                      <option key={course.courseId} value={course.courseId}>
                        {course.courseTitle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    영상 제목
                  </span>
                  <input
                    value={videoTitle}
                    onChange={(event) => setVideoTitle(event.target.value)}
                    placeholder="예: 주차별 라이브 코드리뷰"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    영상 파일
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(event) => setVideoFile(event.target.files?.[0] ?? null)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleUploadVideo}
                  className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  영상 업로드 등록
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  최근 업로드
                </p>
                <div className="mt-2 max-h-[220px] space-y-2 overflow-auto">
                  {workspace.videos.slice(0, 8).map((video) => (
                    <div key={video.id} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs font-semibold text-slate-700">{video.title}</p>
                      <p className="text-xs text-slate-500">
                        {video.courseTitle} · {video.fileName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(video.uploadedAt)} · {formatFileSize(video.sizeBytes)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-end gap-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    과정 필터
                  </span>
                  <select
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="ALL">전체 과정</option>
                    {uniqueCourses.map((course) => (
                      <option key={course.courseId} value={course.courseId}>
                        {course.courseTitle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    학생 필터
                  </span>
                  <select
                    value={studentFilter}
                    onChange={(event) => setStudentFilter(event.target.value)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="ALL">전체 학생</option>
                    {workspace.dashboardByStudent.map((student) => (
                      <option key={student.studentId} value={student.studentId}>
                        {student.studentName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    상태 필터
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {instructorSubmissionStatusFilterOptions.map((statusOption) => (
                      <button
                        key={statusOption.value}
                        type="button"
                        onClick={() => setStatusFilter(statusOption.value)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          statusFilter === statusOption.value
                            ? "bg-slate-900 text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {statusOption.label}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="block min-w-[200px] flex-1">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    검색
                  </span>
                  <input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder="학생명, 과제명, 코드/메시지 검색"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    정렬
                  </span>
                  <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SubmissionSortKey)}
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    <option value="LATEST">최신 제출순</option>
                    <option value="OLDEST">오래된 제출순</option>
                    <option value="STUDENT_ASC">학생명순</option>
                    <option value="STATUS">상태 우선순</option>
                  </select>
                </label>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                검색 결과 {filteredSubmissions.length}건 · 페이지 {currentPage}/{totalPages}
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                    <tr>
                      <th className="px-3 py-2">과제</th>
                      <th className="px-3 py-2">학생</th>
                      <th className="px-3 py-2">제출 시각</th>
                      <th className="px-3 py-2">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedSubmissions.length === 0 ? (
                      <tr>
                        <td className="px-3 py-4 text-slate-500" colSpan={4}>
                          필터에 맞는 제출 이력이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      pagedSubmissions.map((submission) => (
                        <tr
                          key={submission.id}
                          className={`border-t border-slate-200 ${
                            selectedSubmission?.id === submission.id ? "bg-slate-50" : ""
                          }`}
                        >
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => setSelectedSubmissionId(submission.id)}
                              className="text-left"
                            >
                              <p className="font-semibold text-ink">{submission.assignmentTitle}</p>
                              <p className="text-xs text-slate-500">
                                {submission.courseTitle} · {submission.revision}차
                              </p>
                            </button>
                          </td>
                          <td className="px-3 py-2 text-slate-700">{submission.studentName}</td>
                          <td className="px-3 py-2 text-slate-500">
                            {formatDateTime(submission.submittedAt)}
                          </td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${submissionReviewStatusToneMap[submission.reviewStatus]}`}
                            >
                              {submissionReviewStatusLabelMap[submission.reviewStatus]}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
                    currentPage <= 1
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
                    currentPage >= totalPages
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-900 text-white"
                  }`}
                >
                  다음
                </button>
              </div>
            </section>

            <section className="space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-ink">선택 제출 상세/이력</p>
                {selectedSubmission ? (
                  <div className="mt-3 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-sm font-semibold text-ink">{selectedSubmission.assignmentTitle}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {selectedSubmission.studentName} · {formatDateTime(selectedSubmission.submittedAt)} ·{" "}
                        {selectedSubmission.revision}차
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <p>언어: {submissionLanguageLabelMap[selectedSubmission.codeLanguage ?? "plaintext"]}</p>
                        <p>첨부: {selectedSubmission.attachments.length}개</p>
                        <p>피드백: {selectedSubmission.feedbackHistory.length}건</p>
                        <p>상태: {submissionReviewStatusLabelMap[selectedSubmission.reviewStatus]}</p>
                      </div>
                      {selectedSubmission.message ? (
                        <p className="mt-2 text-sm leading-6 text-slate-700">
                          {selectedSubmission.message.length > 180
                            ? `${selectedSubmission.message.slice(0, 180)}...`
                            : selectedSubmission.message}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/submissions/${selectedSubmission.id}`}
                          className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                        >
                          상세 리뷰 페이지에서 작업
                        </Link>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        타임라인
                      </p>
                      <div className="mt-2 space-y-2">
                        {selectedSubmissionTimeline.length === 0 ? (
                          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            표시할 타임라인이 없습니다.
                          </p>
                        ) : (
                          selectedSubmissionTimeline.slice(0, 8).map((event) => (
                            <div key={event.id} className="rounded-lg bg-slate-50 px-3 py-2">
                              <p className="text-xs font-semibold text-slate-700">
                                {event.actorName} · {event.type}
                              </p>
                              <p className="text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                              {event.note ? (
                                <p className="mt-1 text-xs text-slate-600">{event.note}</p>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">제출 항목을 선택하세요.</p>
                )}
              </article>

            </section>
          </div>

          {feedback ? (
            <p
              className={`text-sm font-semibold ${
                feedback.type === "success" ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );

  async function handleUploadVideo() {
    const targetCourse = uniqueCourses.find((course) => course.courseId === videoCourseId);

    if (!targetCourse || !videoFile || videoTitle.trim().length === 0) {
      setFeedback({
        type: "error",
        message: "과정, 제목, 영상 파일을 모두 입력하세요.",
      });
      return;
    }

    try {
      await uploadInstructorVideo({
        courseId: targetCourse.courseId,
        courseTitle: targetCourse.courseTitle,
        title: videoTitle.trim(),
        fileName: videoFile.name,
        mimeType: videoFile.type || "video/mp4",
        sizeBytes: videoFile.size,
        uploadedById: actorId,
        uploadedByName: actorName,
      });
      setFeedback({
        type: "success",
        message: "영상 업로드 이력이 등록되었습니다.",
      });
      setVideoTitle("");
      setVideoFile(null);
      await loadWorkspace();
    } catch (error) {
      setFeedback({
        type: "error",
        message: resolveSubmissionErrorMessage(error),
      });
    }
  }

  function resolvePreferredTemplate(assignmentId: string, allowCodeEditor: boolean) {
    if (allowCodeEditor) {
      return (
        latestIdeTemplateByAssignment.get(assignmentId) ??
        latestTemplateByAssignment.get(assignmentId)
      );
    }

    return latestTemplateByAssignment.get(assignmentId);
  }

  function applyTemplateAssignmentSelection(assignmentId: string) {
    if (!workspace) {
      return;
    }

    const assignment = workspace.assignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      return;
    }

    const template = resolvePreferredTemplate(assignment.id, assignment.allowCodeEditor);
    setTemplateAssignmentId(assignment.id);

    if (template) {
      setTemplateEditorType(template.editorType);
      setTemplateCodeLanguage(template.codeLanguage);
      setTemplateTitle(template.title);
      setTemplateContent(template.content);
      return;
    }

    setTemplateEditorType(assignment.allowCodeEditor ? "IDE" : "NOTE");
    setTemplateCodeLanguage("typescript");
    setTemplateTitle(`${assignment.title} 템플릿`);
    setTemplateContent("");
  }

  function applyRecentAssignmentPreset(assignmentId: string) {
    if (!workspace) {
      return;
    }

    const assignment = workspace.assignments.find((item) => item.id === assignmentId);

    if (!assignment) {
      return;
    }

    setCreateCourseId(assignment.courseId);
    setCreateTitle(assignment.title);
    setCreatePrompt(assignment.prompt);
    setCreateDueAtInput(toDateTimeLocalInput(assignment.dueAt) || buildDefaultDueAtInput());
    setCreateAllowFileUpload(assignment.allowFileUpload);
    setCreateAllowCodeEditor(assignment.allowCodeEditor);
    setTemplateTargetMode("NEW_ASSIGNMENT");
    applyTemplateAssignmentSelection(assignment.id);

    setFeedback({
      type: "success",
      message: `최근 과제 설정을 불러왔습니다: ${assignment.title}`,
    });
  }

  async function handleCreateAssignment() {
    if (templateTargetMode !== "NEW_ASSIGNMENT") {
      setFeedback({
        type: "error",
        message: "신규 과제 모드에서만 업로드할 수 있습니다.",
      });
      return;
    }

    if (!workspace) {
      return;
    }

    if (!createCourseId) {
      setFeedback({
        type: "error",
        message: "과정을 선택하세요.",
      });
      return;
    }

    if (createTitle.trim().length === 0 || createPrompt.trim().length === 0) {
      setFeedback({
        type: "error",
        message: "과제 제목과 설명을 모두 입력하세요.",
      });
      return;
    }

    const dueAtIso = parseDateTimeLocalInputToIso(createDueAtInput);

    if (!dueAtIso) {
      setFeedback({
        type: "error",
        message: "올바른 마감 시각을 입력하세요.",
      });
      return;
    }

    const targetCourse = uniqueCourses.find((course) => course.courseId === createCourseId);

    if (!targetCourse) {
      setFeedback({
        type: "error",
        message: "선택한 과정을 찾을 수 없습니다.",
      });
      return;
    }

    setIsCreatingAssignment(true);

    try {
      // 신규 과제 생성은 과제 메타만 저장한다.
      // 템플릿 저장은 별도 버튼 액션으로만 반영해 의도치 않은 덮어쓰기를 방지한다.
      const result = await createInstructorAssignment({
        courseId: targetCourse.courseId,
        courseTitle: targetCourse.courseTitle,
        title: createTitle,
        prompt: createPrompt,
        dueAt: dueAtIso,
        allowFileUpload: createAllowFileUpload,
        allowCodeEditor: createAllowCodeEditor,
        actorId,
        actorName,
      });

      setFeedback({
        type: "success",
        message: `과제가 등록되었습니다: ${result.assignment.title} (템플릿은 별도 저장)`,
      });
      setCreateTitle("");
      setCreatePrompt("");
      setCreateDueAtInput(buildDefaultDueAtInput());
      setCreateAllowFileUpload(true);
      setCreateAllowCodeEditor(true);
      await loadWorkspace();
      setTemplateAssignmentId(result.assignment.id);
    } catch (error) {
      setFeedback({
        type: "error",
        message: resolveSubmissionErrorMessage(error),
      });
    } finally {
      setIsCreatingAssignment(false);
    }
  }

  async function handleSaveAssignmentTemplate() {
    if (!templateAssignmentId) {
      setFeedback({
        type: "error",
        message: "템플릿을 저장할 과제를 선택하세요.",
      });
      return;
    }

    if (templateContent.trim().length === 0) {
      setFeedback({
        type: "error",
        message: "템플릿 본문을 입력하세요.",
      });
      return;
    }

    try {
      // 템플릿 저장은 기존 과제 + 에디터 유형 + 언어 조합으로 upsert 된다.
      // 백엔드에서는 해당 키를 unique 제약으로 유지해야 프론트 UX와 일치한다.
      await upsertInstructorAssignmentTemplate({
        assignmentId: templateAssignmentId,
        editorType: templateEditorType,
        codeLanguage: templateCodeLanguage,
        title: templateTitle,
        content: templateContent,
        actorId,
        actorName,
      });
      setFeedback({
        type: "success",
        message: "템플릿이 저장되었습니다.",
      });
      await loadWorkspace();
    } catch (error) {
      setFeedback({
        type: "error",
        message: resolveSubmissionErrorMessage(error),
      });
    }
  }
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </article>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (size >= 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${size} B`;
}

function resolveSubmissionErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as SubmissionError).message);
  }

  return "강사 콘솔 처리 중 오류가 발생했습니다.";
}

function buildDefaultDueAtInput() {
  const due = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  return toDateTimeLocalInput(due.toISOString());
}

function toDateTimeLocalInput(isoValue: string) {
  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseDateTimeLocalInputToIso(input: string) {
  const date = new Date(input);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}
