"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { resolveRuntimeActor } from "@/config/runtime-defaults";
import {
  readSubmissionDraft,
  removeSubmissionDraft,
  writeSubmissionDraft,
} from "@/features/submission/submission-draft-storage";
import {
  SelectedFilesPreview,
} from "@/features/submission/submission-attachment-preview";
import { SubmissionIdeEditor } from "@/features/submission/submission-ide-editor";
import {
  submissionLanguageLabelMap,
  submissionLanguageOptions,
  submissionReviewStatusLabelMap,
  submissionReviewStatusToneMap,
} from "@/features/submission/submission-status";
import {
  buildSubmissionTemplate,
  findInstructorTemplate,
  resolveRecommendedSubmissionLanguage,
} from "@/features/submission/submission-templates";
import { submissionEditorTypeOptions } from "@/features/submission/submission-ui-config";
import { fetchMyLearningCourses } from "@/services/course";
import { createStudentAssignmentSubmission, fetchStudentSubmissionWorkspace } from "@/services/submission";
import { useAuthStore } from "@/store/auth-store";
import type { CourseDetail } from "@/types/course";
import type {
  AssignmentDefinition,
  AssignmentSubmission,
  AssignmentTemplate,
  SubmissionCourseRef,
  SubmissionCodeLanguage,
  SubmissionEditorType,
  SubmissionError,
} from "@/types/submission";

export function StudentSubmissionWorkspace({
  initialCourses = [],
}: {
  initialCourses?: CourseDetail[];
}) {
  const user = useAuthStore((state) => state.user);
  const studentActor = resolveRuntimeActor(user, "student");
  const studentId = studentActor.id;
  const studentName = studentActor.name;
  const [courses, setCourses] = useState<CourseDetail[]>(initialCourses);
  const enrolledCourses = useMemo<SubmissionCourseRef[]>(
    () =>
      courses
        .filter((course) => course.enrollmentStatus === "ACTIVE")
        .map((course) => ({
          courseId: course.id,
          courseTitle: course.title,
        })),
    [courses],
  );
  const [assignments, setAssignments] = useState<AssignmentDefinition[]>([]);
  const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");
  const [editorType, setEditorType] = useState<SubmissionEditorType>("IDE");
  const [codeLanguage, setCodeLanguage] = useState<SubmissionCodeLanguage>("typescript");
  const [message, setMessage] = useState("");
  const [code, setCode] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string>();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();
  const draftApplyingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetchMyLearningCourses().then((resolvedCourses) => {
      if (!cancelled) {
        setCourses(resolvedCourses);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchStudentSubmissionWorkspace({
      studentId,
      studentName,
      enrolledCourses,
    }).then((workspace) => {
      if (cancelled) {
        return;
      }

      setAssignments(workspace.assignments);
      setTemplates(workspace.templates);
      setSubmissions(workspace.submissions);
      setSelectedAssignmentId((current) => current || workspace.assignments[0]?.id || "");
    });

    return () => {
      cancelled = true;
    };
  }, [enrolledCourses, studentId, studentName]);

  const selectedAssignment = assignments.find((assignment) => assignment.id === selectedAssignmentId);
  const submissionCount = submissions.length;
  const reviewedCount = submissions.filter((submission) => submission.reviewStatus === "REVIEWED").length;
  const recommendedLanguage = resolveRecommendedSubmissionLanguage(selectedAssignment);

  useEffect(() => {
    if (!selectedAssignmentId) {
      return;
    }

    draftApplyingRef.current = true;
    const draft = readSubmissionDraft({
      studentId,
      assignmentId: selectedAssignmentId,
    });

    if (draft) {
      setEditorType(draft.editorType);
      setCodeLanguage(draft.codeLanguage);
      setMessage(draft.message);
      setCode(draft.code);
      setDraftSavedAt(draft.updatedAt);
    } else {
      setEditorType("IDE");
      setCodeLanguage(recommendedLanguage);
      setMessage("");
      setCode("");
      setDraftSavedAt(undefined);
    }

    const timer = window.setTimeout(() => {
      draftApplyingRef.current = false;
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [recommendedLanguage, selectedAssignmentId, studentId]);

  useEffect(() => {
    if (!selectedAssignmentId || draftApplyingRef.current) {
      return;
    }

    // 입력값을 즉시 저장하지 않고 debounce하여 draft 저장 부담을 줄인다.
    // 백엔드 draft API로 전환될 때도 같은 타이밍 정책을 유지하기 쉽도록 분리했다.
    const timer = window.setTimeout(() => {
      const updatedAt = new Date().toISOString();
      writeSubmissionDraft({
        studentId,
        assignmentId: selectedAssignmentId,
        editorType,
        codeLanguage,
        message,
        code,
        updatedAt,
      });
      setDraftSavedAt(updatedAt);
    }, 500);

    return () => {
      window.clearTimeout(timer);
    };
  }, [code, codeLanguage, editorType, message, selectedAssignmentId, studentId]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Assignment Submission
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            학생 과제 제출 워크스페이스
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            수강 중(`ACTIVE`) 과정 과제만 제출할 수 있습니다. 메시지, 코드(IDE/노트), 파일 첨부를
            함께 기록할 수 있습니다.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <StatBadge label="내 제출 건수" value={`${submissionCount}건`} />
          <StatBadge label="리뷰 완료" value={`${reviewedCount}건`} />
        </div>
      </div>

      {enrolledCourses.length === 0 ? (
        <section className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-700">수강 중인 과정이 없습니다.</p>
          <p className="mt-1 text-sm text-slate-600">
            과정이 `ACTIVE` 상태가 되면 해당 과정 과제만 제출할 수 있습니다.
          </p>
        </section>
      ) : (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">과제 선택</span>
              <select
                value={selectedAssignmentId}
                onChange={(event) => setSelectedAssignmentId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                {assignments.length === 0 ? (
                  <option value="">제출 가능한 과제가 없습니다.</option>
                ) : (
                  assignments.map((assignment) => (
                    <option key={assignment.id} value={assignment.id}>
                      {assignment.courseTitle} · {assignment.title}
                    </option>
                  ))
                )}
              </select>
            </label>

            {selectedAssignment ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-ink">{selectedAssignment.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedAssignment.courseTitle} · 마감 {formatDateTime(selectedAssignment.dueAt)}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{selectedAssignment.prompt}</p>
              </section>
            ) : null}

            <div className="inline-flex rounded-full bg-white p-1">
              {submissionEditorTypeOptions.map((editorOption) => {
                const active = editorType === editorOption.value;

                return (
                  <button
                    key={editorOption.value}
                    type="button"
                    onClick={() => setEditorType(editorOption.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-slate-900 text-white" : "text-slate-500"
                    }`}
                  >
                    {editorOption.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  const instructorTemplate = findInstructorTemplate({
                    templates,
                    assignmentId: selectedAssignment?.id,
                    editorType,
                    language: codeLanguage,
                  });
                  const template = instructorTemplate?.content ?? buildSubmissionTemplate({
                    assignment: selectedAssignment,
                    editorType,
                    language: codeLanguage,
                  });
                  setCode(template);
                  setFeedback({
                    type: "success",
                    message: instructorTemplate
                      ? `강사 템플릿 적용: ${instructorTemplate.title}`
                      : "기본 템플릿을 적용했습니다.",
                  });
                }}
                className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                템플릿 불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedAssignmentId) {
                    return;
                  }

                  const draft = readSubmissionDraft({
                    studentId,
                    assignmentId: selectedAssignmentId,
                  });

                  if (!draft) {
                    setFeedback({
                      type: "error",
                      message: "불러올 임시저장 내용이 없습니다.",
                    });
                    return;
                  }

                  setEditorType(draft.editorType);
                  setCodeLanguage(draft.codeLanguage);
                  setMessage(draft.message);
                  setCode(draft.code);
                  setDraftSavedAt(draft.updatedAt);
                  setFeedback({
                    type: "success",
                    message: "임시저장 내용을 불러왔습니다.",
                  });
                }}
                className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                임시저장 불러오기
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!selectedAssignmentId) {
                    return;
                  }

                  removeSubmissionDraft({
                    studentId,
                    assignmentId: selectedAssignmentId,
                  });
                  setMessage("");
                  setCode("");
                  setEditorType("IDE");
                  setCodeLanguage(recommendedLanguage);
                  setDraftSavedAt(undefined);
                  setFeedback({
                    type: "success",
                    message: "임시저장 내용을 비웠습니다.",
                  });
                }}
                className="inline-flex h-8 items-center rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
              >
                임시저장 비우기
              </button>
              <p className="ml-auto text-[11px] text-slate-500">
                추천 언어: {submissionLanguageLabelMap[recommendedLanguage]}
                {draftSavedAt ? ` · 임시저장 ${formatDateTime(draftSavedAt)}` : ""}
              </p>
            </div>
            {(() => {
              const instructorTemplate = findInstructorTemplate({
                templates,
                assignmentId: selectedAssignment?.id,
                editorType,
                language: codeLanguage,
              });

              if (!instructorTemplate) {
                return null;
              }

              return (
                <p className="text-xs font-semibold text-emerald-700">
                  강사 제공 템플릿 사용 가능: {instructorTemplate.title}
                </p>
              );
            })()}

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">설명 메시지</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                placeholder="구현 의도, 확인 요청 포인트를 적어주세요."
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
              />
            </label>

            <div>
              <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                <p className="text-sm font-semibold text-slate-700">
                  {editorType === "IDE" ? "코드 제출" : "노트 본문"}
                </p>
                {editorType === "IDE" ? (
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      언어
                    </span>
                    <select
                      value={codeLanguage}
                      onChange={(event) => setCodeLanguage(event.target.value as SubmissionCodeLanguage)}
                      className="h-8 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none"
                    >
                      {submissionLanguageOptions.map((language) => (
                        <option key={language} value={language}>
                          {submissionLanguageLabelMap[language]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>
              {editorType === "IDE" ? (
                <SubmissionIdeEditor
                  value={code}
                  onChange={setCode}
                  language={codeLanguage}
                  height={360}
                />
              ) : (
                <textarea
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  rows={10}
                  placeholder="노트 스타일 제출 내용을 작성하세요."
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 font-mono text-sm text-slate-700 outline-none"
                />
              )}
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">파일 첨부</span>
              <input
                type="file"
                multiple
                onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
                className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
              />
            </label>
            <SelectedFilesPreview
              files={files}
              onRemoveFile={(index) =>
                setFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
              }
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting || !selectedAssignmentId}
                onClick={async () => {
                  if (!selectedAssignmentId) {
                    return;
                  }

                  setIsSubmitting(true);
                  setFeedback(undefined);

                  try {
                    const created = await createStudentAssignmentSubmission({
                      studentId,
                      studentName,
                      assignmentId: selectedAssignmentId,
                      editorType,
                      message,
                      code,
                      codeLanguage: editorType === "IDE" ? codeLanguage : "plaintext",
                      attachments: files.map((file) => ({
                        id: `${file.name}-${file.lastModified}`,
                        fileName: file.name,
                        mimeType: file.type || "application/octet-stream",
                        sizeBytes: file.size,
                      })),
                      enrolledCourseIds: enrolledCourses.map((course) => course.courseId),
                    });

                    setSubmissions((prev) => [created, ...prev]);
                    setMessage("");
                    setCode("");
                    setFiles([]);
                    removeSubmissionDraft({
                      studentId,
                      assignmentId: selectedAssignmentId,
                    });
                    setDraftSavedAt(undefined);
                    setFeedback({
                      type: "success",
                      message: `과제가 ${created.revision}차로 제출되었습니다.`,
                    });
                  } catch (error) {
                    setFeedback({
                      type: "error",
                      message: resolveSubmissionErrorMessage(error),
                    });
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-white transition ${
                  isSubmitting || !selectedAssignmentId
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-brand hover:bg-teal-700"
                }`}
              >
                {isSubmitting ? "제출 중..." : "과제 제출"}
              </button>
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 xl:max-h-[760px] xl:overflow-auto">
            <p className="text-sm font-semibold text-ink">내 제출 이력</p>
            <p className="mt-1 text-sm text-slate-500">
              최신 제출순으로 표시됩니다. 같은 과제 재제출 시 revision이 증가합니다.
            </p>
            <div className="mt-4 space-y-3">
              {submissions.length === 0 ? (
                <p className="text-sm text-slate-500">아직 제출 이력이 없습니다.</p>
              ) : (
                submissions.map((submission) => (
                  <article key={submission.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{submission.assignmentTitle}</p>
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${submissionReviewStatusToneMap[submission.reviewStatus]}`}
                      >
                        {submissionReviewStatusLabelMap[submission.reviewStatus]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {submission.courseTitle} · {submission.revision}차 제출
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      제출 시각: {formatDateTime(submission.submittedAt)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      언어: {submissionLanguageLabelMap[submission.codeLanguage ?? "plaintext"]}
                    </p>
                    {submission.attachments.length > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        첨부: {submission.attachments.map((attachment) => attachment.fileName).join(", ")}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      피드백: {submission.feedbackHistory.length}건
                    </p>
                    {submission.feedbackHistory[0]?.message ? (
                      <p className="mt-2 text-xs text-slate-600">
                        최신 피드백:{" "}
                        {submission.feedbackHistory[0].message.length > 90
                          ? `${submission.feedbackHistory[0].message.slice(0, 90)}...`
                          : submission.feedbackHistory[0].message}
                      </p>
                    ) : null}
                    <div className="mt-3">
                      <Link
                        href={`/submissions/${submission.id}`}
                        className="inline-flex h-8 items-center rounded-full border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        상세 피드백 보기
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
    </div>
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

function resolveSubmissionErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as SubmissionError).message);
  }

  return "과제 제출 처리 중 오류가 발생했습니다.";
}
