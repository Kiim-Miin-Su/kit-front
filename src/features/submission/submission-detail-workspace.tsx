"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { resolveRuntimeActor } from "@/config/runtime-defaults";
import {
  SelectedFilesPreview,
  SubmissionAttachmentMetaList,
} from "@/features/submission/submission-attachment-preview";
import { SubmissionIdeEditor } from "@/features/submission/submission-ide-editor";
import {
  submissionLanguageLabelMap,
  submissionLanguageOptions,
  submissionReviewStatusLabelMap,
  submissionReviewStatusToneMap,
} from "@/features/submission/submission-status";
import {
  reviewStatusDecisionLabelMap,
  reviewStatusDecisionOptions,
  submissionFeedbackEntryTypeLabelMap,
  submissionMessageFormatLabelMap,
  submissionMessageFormatOptions,
  submissionRevisionCompareUiText,
} from "@/features/submission/submission-ui-config";
import {
  addSubmissionFeedback,
  fetchAssignmentTimelineByAssignmentId,
  fetchSubmissionDetail,
  updateInstructorAssignmentMeta,
} from "@/services/submission";
import { useAuthStore } from "@/store/auth-store";
import type {
  AssignmentSubmission,
  SubmissionCodeLanguage,
  SubmissionDetailData,
  SubmissionError,
  SubmissionFeedbackEntry,
  SubmissionMessageFormat,
  SubmissionReviewStatus,
  SubmissionTimelineEvent,
} from "@/types/submission";

type SubmissionDetailPanel = "review" | "assignment" | "rounds";
type SubmissionTimelineScope = "STUDENT" | "ASSIGNMENT";
type SubmissionRevisionDiffRowType = "UNCHANGED" | "ADDED" | "REMOVED";

interface SubmissionRevisionDiffRow {
  id: string;
  type: SubmissionRevisionDiffRowType;
  baseLineNumber?: number;
  targetLineNumber?: number;
  baseText: string;
  targetText: string;
}

interface SubmissionRevisionDiffSummary {
  unchangedLineCount: number;
  addedLineCount: number;
  removedLineCount: number;
}

interface SubmissionRevisionCodeDiffResult {
  isComparable: boolean;
  isTooLarge: boolean;
  summary: SubmissionRevisionDiffSummary;
  rows: SubmissionRevisionDiffRow[];
}

interface SubmissionRevisionComparisonResult {
  isReady: boolean;
  isSameRevision: boolean;
  messageChanged: boolean;
  baseMessage: string;
  targetMessage: string;
  addedAttachmentNames: string[];
  removedAttachmentNames: string[];
  codeDiff: SubmissionRevisionCodeDiffResult;
}

const MAX_REVISION_DIFF_LINE_COUNT = 700;

export function SubmissionDetailWorkspace({ submissionId }: { submissionId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useAuthStore((state) => state.getRole());
  const user = useAuthStore((state) => state.user);
  const instructorActor = resolveRuntimeActor(user, "instructor");
  const canManageReview =
    role === "instructor" || role === "assistant" || process.env.NODE_ENV !== "production";

  const [detail, setDetail] = useState<SubmissionDetailData>();
  const [feedback, setFeedback] = useState<{ type: "error"; message: string }>();
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error"; message: string }>();

  const [reviewDecision, setReviewDecision] = useState<SubmissionReviewStatus>("REVIEWED");
  const [reviewMessageFormat, setReviewMessageFormat] = useState<SubmissionMessageFormat>("TEXT");
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);

  const [codeSuggestionLanguage, setCodeSuggestionLanguage] =
    useState<SubmissionCodeLanguage>("typescript");
  const [codeSuggestionSummary, setCodeSuggestionSummary] = useState("");
  const [codeSuggestionCode, setCodeSuggestionCode] = useState("");
  const [codeSuggestionFiles, setCodeSuggestionFiles] = useState<File[]>([]);

  const [assignmentTitleInput, setAssignmentTitleInput] = useState("");
  const [assignmentPromptInput, setAssignmentPromptInput] = useState("");
  const [assignmentDueAtInput, setAssignmentDueAtInput] = useState("");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [focusedRevisionSubmissionId, setFocusedRevisionSubmissionId] = useState<string>();
  const [compareBaseRevisionSubmissionId, setCompareBaseRevisionSubmissionId] = useState<string>();
  const [compareTargetRevisionSubmissionId, setCompareTargetRevisionSubmissionId] = useState<string>();
  const [focusedTimelineEventId, setFocusedTimelineEventId] = useState<string>();
  const [timelineScope, setTimelineScope] = useState<SubmissionTimelineScope>("STUDENT");
  const [assignmentWideTimeline, setAssignmentWideTimeline] = useState<SubmissionTimelineEvent[]>([]);
  const [assignmentWideSubmissionLabelById, setAssignmentWideSubmissionLabelById] = useState<
    Record<string, string>
  >({});

  const actorId = instructorActor.id;
  const actorName = instructorActor.name;

  const loadDetail = useCallback(async () => {
    try {
      const data = await fetchSubmissionDetail(submissionId);
      setDetail(data);
      setFeedback(undefined);

      setReviewDecision(data.submission.reviewStatus);
      setReviewMessageFormat("TEXT");

      setCodeSuggestionLanguage(data.submission.codeLanguage ?? "typescript");
      setCodeSuggestionCode(data.submission.code ?? "");
      setFocusedRevisionSubmissionId(data.submission.id);
      const sortedRevisions = [...data.revisionHistory].sort(
        (a, b) =>
          b.revision - a.revision ||
          Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)),
      );
      const targetRevisionIndex = sortedRevisions.findIndex(
        (revision) => revision.id === data.submission.id,
      );
      const fallbackBaseRevisionId =
        sortedRevisions[targetRevisionIndex + 1]?.id ??
        sortedRevisions[targetRevisionIndex - 1]?.id ??
        data.submission.id;
      setCompareTargetRevisionSubmissionId(data.submission.id);
      setCompareBaseRevisionSubmissionId(fallbackBaseRevisionId);
      setTimelineScope("STUDENT");
      const initialTimelineEvent = data.timeline.find(
        (event) => event.submissionId === data.submission.id,
      );
      setFocusedTimelineEventId(initialTimelineEvent?.id ?? data.timeline[0]?.id);

      setAssignmentTitleInput(data.assignment?.title ?? data.submission.assignmentTitle);
      setAssignmentPromptInput(data.assignment?.prompt ?? "");
      setAssignmentDueAtInput(toDateTimeLocalInput(data.assignment?.dueAt));
    } catch (error) {
      setFeedback({ type: "error", message: resolveSubmissionErrorMessage(error) });
    }
  }, [submissionId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);
  useEffect(() => {
    if (!detail || !canManageReview) {
      setAssignmentWideTimeline([]);
      setAssignmentWideSubmissionLabelById({});
      return;
    }

    let cancelled = false;
    void fetchAssignmentTimelineByAssignmentId(detail.submission.assignmentId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setAssignmentWideTimeline(result.timeline);
        setAssignmentWideSubmissionLabelById(result.submissionLabelById);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setAssignmentWideTimeline([]);
        setAssignmentWideSubmissionLabelById({});
      });

    return () => {
      cancelled = true;
    };
  }, [canManageReview, detail]);

  const backHref =
    role === "instructor" || role === "assistant"
      ? "/instructor"
      : role === "admin"
        ? "/admin"
        : "/student";
  const requestedPanel = parseSubmissionDetailPanel(searchParams.get("panel"));
  const activePanel: SubmissionDetailPanel = canManageReview
    ? requestedPanel
    : "rounds";

  const reviewRounds = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [...detail.revisionHistory]
      .sort(
        (a, b) =>
          b.revision - a.revision ||
          Number(new Date(b.submittedAt)) - Number(new Date(a.submittedAt)),
      )
      .map((revision) => ({
        revision,
        feedbackEntries: [...(revision.feedbackHistory ?? [])].sort(
          (a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)),
        ),
      }));
  }, [detail]);
  const activeRevisionSubmissionId = focusedRevisionSubmissionId ?? detail?.submission.id;
  const revisionById = useMemo(() => {
    if (!detail) {
      return {} as Record<string, AssignmentSubmission>;
    }

    return detail.revisionHistory.reduce<Record<string, AssignmentSubmission>>((acc, revision) => {
      acc[revision.id] = revision;
      return acc;
    }, {});
  }, [detail]);
  const visibleReviewRounds = useMemo(() => {
    if (!activeRevisionSubmissionId) {
      return reviewRounds;
    }

    return reviewRounds.filter((round) => round.revision.id === activeRevisionSubmissionId);
  }, [activeRevisionSubmissionId, reviewRounds]);
  const revisionSelectionOptions = useMemo(
    () =>
      reviewRounds.map((round) => ({
        id: round.revision.id,
        label: `${round.revision.revision}차 · ${formatDateTime(round.revision.submittedAt)}`,
      })),
    [reviewRounds],
  );
  const compareBaseRevision = compareBaseRevisionSubmissionId
    ? revisionById[compareBaseRevisionSubmissionId]
    : undefined;
  const compareTargetRevision = compareTargetRevisionSubmissionId
    ? revisionById[compareTargetRevisionSubmissionId]
    : undefined;
  const revisionComparison = useMemo(
    () =>
      buildSubmissionRevisionComparison({
        baseRevision: compareBaseRevision,
        targetRevision: compareTargetRevision,
      }),
    [compareBaseRevision, compareTargetRevision],
  );
  const visibleTimeline = useMemo(() => {
    if (!detail) {
      return [] as SubmissionTimelineEvent[];
    }
    if (timelineScope === "ASSIGNMENT") {
      return assignmentWideTimeline.length > 0 ? assignmentWideTimeline : detail.timeline;
    }

    return detail.timeline;
  }, [assignmentWideTimeline, detail, timelineScope]);
  const peerLockedCodeSuggestion = useMemo(() => {
    if (!activeRevisionSubmissionId) {
      return undefined;
    }

    const round = revisionById[activeRevisionSubmissionId];

    if (!round) {
      return undefined;
    }

    return [...(round.feedbackHistory ?? [])]
      .sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)))
      .find(
        (entry) =>
          (entry.entryType ?? "GENERAL") === "CODE_SUGGESTION" &&
          entry.code.trim().length > 0 &&
          entry.reviewerId !== actorId,
      );
  }, [activeRevisionSubmissionId, actorId, revisionById]);
  const isCodeSuggestionLocked = Boolean(peerLockedCodeSuggestion);
  const submissionLabelById = useMemo(() => {
    if (!detail) {
      return {} as Record<string, string>;
    }

    return detail.revisionHistory.reduce<Record<string, string>>((acc, item) => {
      acc[item.id] = `${item.studentName} · ${item.assignmentTitle}`;
      return acc;
    }, {});
  }, [detail]);
  const visibleSubmissionLabelById = useMemo(() => {
    if (timelineScope === "ASSIGNMENT") {
      return Object.keys(assignmentWideSubmissionLabelById).length > 0
        ? assignmentWideSubmissionLabelById
        : submissionLabelById;
    }

    return submissionLabelById;
  }, [assignmentWideSubmissionLabelById, submissionLabelById, timelineScope]);
  useEffect(() => {
    if (!detail) {
      return;
    }

    if (!focusedRevisionSubmissionId) {
      return;
    }

    if (!revisionById[focusedRevisionSubmissionId]) {
      setFocusedRevisionSubmissionId(detail.submission.id);
    }
  }, [detail, focusedRevisionSubmissionId, revisionById]);
  useEffect(() => {
    if (revisionSelectionOptions.length === 0) {
      setCompareBaseRevisionSubmissionId(undefined);
      setCompareTargetRevisionSubmissionId(undefined);
      return;
    }

    setCompareTargetRevisionSubmissionId((current) => {
      if (current && revisionById[current]) {
        return current;
      }

      return revisionSelectionOptions[0].id;
    });
    setCompareBaseRevisionSubmissionId((current) => {
      if (current && revisionById[current]) {
        return current;
      }

      return revisionSelectionOptions[1]?.id ?? revisionSelectionOptions[0].id;
    });
  }, [revisionById, revisionSelectionOptions]);
  useEffect(() => {
    if (visibleTimeline.length === 0) {
      setFocusedTimelineEventId(undefined);
      return;
    }

    setFocusedTimelineEventId((current) => {
      if (current && visibleTimeline.some((event) => event.id === current)) {
        return current;
      }

      return visibleTimeline[0].id;
    });
  }, [visibleTimeline]);

  if (!detail) {
    return (
      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">상세 데이터를 불러오는 중입니다.</p>
        {feedback ? <p className="mt-2 text-sm font-semibold text-rose-600">{feedback.message}</p> : null}
      </section>
    );
  }

  const { submission, assignment } = detail;

  const handleSubmitReview = async () => {
    const normalizedCodeSummary = isCodeSuggestionLocked ? "" : codeSuggestionSummary.trim();
    const normalizedCodeSuggestion = isCodeSuggestionLocked ? "" : codeSuggestionCode;
    const mergedMessage = [
      reviewTitle.trim(),
      reviewMessage.trim(),
      normalizedCodeSummary ? `[코드 수정안 요약]\n${normalizedCodeSummary}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    const mergedAttachments = isCodeSuggestionLocked
      ? [...reviewFiles]
      : [...reviewFiles, ...codeSuggestionFiles];
    const hasCodeSuggestion = normalizedCodeSuggestion.trim().length > 0;

    if (mergedMessage.length === 0 && !hasCodeSuggestion && mergedAttachments.length === 0) {
      setActionFeedback({
        type: "error",
        message: "리뷰 내용, 코드 수정안, 첨부 파일 중 하나 이상 입력하세요.",
      });
      return;
    }

    try {
      await addSubmissionFeedback({
        submissionId: submission.id,
        reviewerId: actorId,
        reviewerName: actorName,
        entryType: hasCodeSuggestion ? "CODE_SUGGESTION" : "GENERAL",
        messageFormat: reviewMessageFormat,
        message: mergedMessage,
        code: normalizedCodeSuggestion,
        codeLanguage: hasCodeSuggestion ? codeSuggestionLanguage : submission.codeLanguage,
        attachments: mergedAttachments.map((file) => ({
          id: `${file.name}-${file.lastModified}`,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        })),
        reviewStatus: reviewDecision,
      });
      setActionFeedback({
        type: "success",
        message: hasCodeSuggestion
          ? `리뷰를 저장했습니다. 상태: ${reviewStatusDecisionLabelMap[reviewDecision]} (코드 수정안 포함)`
          : `리뷰를 저장했습니다. 상태: ${reviewStatusDecisionLabelMap[reviewDecision]}`,
      });
      setReviewTitle("");
      setReviewMessage("");
      setReviewFiles([]);
      setCodeSuggestionSummary("");
      setCodeSuggestionCode("");
      setCodeSuggestionFiles([]);
      await loadDetail();
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: resolveSubmissionErrorMessage(error),
      });
    }
  };

  const handleSaveAssignmentMeta = async () => {
    const dueAtIso = parseDateTimeLocalInputToIso(assignmentDueAtInput);

    if (!assignment) {
      setActionFeedback({
        type: "error",
        message: "과제 메타데이터를 찾을 수 없습니다.",
      });
      return;
    }

    if (assignmentTitleInput.trim().length === 0 || !dueAtIso) {
      setActionFeedback({
        type: "error",
        message: "과제 제목과 마감 기한을 입력하세요.",
      });
      return;
    }

    setIsSavingAssignment(true);

    try {
      await updateInstructorAssignmentMeta({
        assignmentId: assignment.id,
        title: assignmentTitleInput,
        prompt: assignmentPromptInput,
        dueAt: dueAtIso,
        actorId,
        actorName,
      });
      setActionFeedback({
        type: "success",
        message: "과제 정보를 저장했습니다.",
      });
      await loadDetail();
    } catch (error) {
      setActionFeedback({
        type: "error",
        message: resolveSubmissionErrorMessage(error),
      });
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleMovePanel = (panel: SubmissionDetailPanel) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("panel", panel);
    router.replace(`/submissions/${submissionId}?${params.toString()}`, { scroll: false });
  };

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Submission Detail
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {submission.assignmentTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {submission.courseTitle} · {submission.studentName}
          </p>
          {assignment?.dueAt ? (
            <p className="mt-1 text-xs text-slate-500">마감: {formatDateTime(assignment.dueAt)}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${submissionReviewStatusToneMap[submission.reviewStatus]}`}
          >
            {submissionReviewStatusLabelMap[submission.reviewStatus]}
          </span>
          <Link
            href={backHref}
            className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700"
          >
            목록으로
          </Link>
        </div>
      </div>

      {actionFeedback ? (
        <p
          className={`mt-3 text-sm font-semibold ${
            actionFeedback.type === "success" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {actionFeedback.message}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              상세 메뉴
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {canManageReview ? (
                <button
                  type="button"
                  onClick={() => handleMovePanel("review")}
                  className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
                    activePanel === "review"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  리뷰 작성
                </button>
              ) : null}
              {canManageReview ? (
                <button
                  type="button"
                  onClick={() => handleMovePanel("assignment")}
                  className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
                    activePanel === "assignment"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  과제 수정
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => handleMovePanel("rounds")}
                className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
                  activePanel === "rounds"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-200 bg-white text-slate-700"
                }`}
              >
                리뷰 라운드 히스토리
              </button>
            </div>
          </article>

          {canManageReview && activePanel === "review" ? (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">리뷰 작성</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">상태</span>
                  <select
                    value={reviewDecision}
                    onChange={(event) =>
                      setReviewDecision(event.target.value as SubmissionReviewStatus)
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    {reviewStatusDecisionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">메시지 형식</span>
                  <select
                    value={reviewMessageFormat}
                    onChange={(event) =>
                      setReviewMessageFormat(event.target.value as SubmissionMessageFormat)
                    }
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  >
                    {submissionMessageFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">리뷰 제목</span>
                <input
                  value={reviewTitle}
                  onChange={(event) => setReviewTitle(event.target.value)}
                  placeholder="예: API 응답 처리 분기를 보완해 주세요."
                  className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">리뷰 메시지</span>
                <textarea
                  value={reviewMessage}
                  onChange={(event) => setReviewMessage(event.target.value)}
                  rows={4}
                  placeholder="학생에게 전달할 피드백 메시지를 입력하세요."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                />
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">피드백 첨부 파일</span>
                <input
                  type="file"
                  multiple
                  onChange={(event) => setReviewFiles(Array.from(event.target.files ?? []))}
                  className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white"
                />
              </label>
              <SelectedFilesPreview
                files={reviewFiles}
                title="리뷰 첨부 미리보기"
                onRemoveFile={(index) =>
                  setReviewFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                }
              />

              <div className="mt-5 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-ink">강사 코드 수정안 (원본 보존)</p>
                <p className="mt-1 text-xs text-slate-500">
                  학생 제출 원본은 변경하지 않고, 강사 수정안을 별도 피드백으로 저장합니다.
                </p>

                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                    학생 제출 원본 코드
                  </p>
                  <div className="mt-2">
                    <SubmissionIdeEditor
                      value={submission.code}
                      onChange={() => {}}
                      language={submission.codeLanguage}
                      readOnly
                      height={180}
                    />
                  </div>
                </div>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">수정안 언어</span>
                  <select
                    value={codeSuggestionLanguage}
                    onChange={(event) =>
                      setCodeSuggestionLanguage(event.target.value as SubmissionCodeLanguage)
                    }
                    disabled={isCodeSuggestionLocked}
                    className={`h-9 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none ${
                      isCodeSuggestionLocked ? "cursor-not-allowed bg-slate-100" : "bg-white"
                    }`}
                  >
                    {submissionLanguageOptions.map((language) => (
                      <option key={language} value={language}>
                        {submissionLanguageLabelMap[language]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">수정안 요약</span>
                  <textarea
                    value={codeSuggestionSummary}
                    onChange={(event) => setCodeSuggestionSummary(event.target.value)}
                    disabled={isCodeSuggestionLocked}
                    rows={2}
                    placeholder={
                      isCodeSuggestionLocked
                        ? "다른 리뷰어의 코드 수정안이 있는 라운드입니다."
                        : "예: 예외 처리 분기와 API 에러 메시지 파싱을 보완했습니다."
                    }
                    className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none ${
                      isCodeSuggestionLocked ? "cursor-not-allowed bg-slate-100" : "bg-white"
                    }`}
                  />
                </label>
                {isCodeSuggestionLocked ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    {peerLockedCodeSuggestion?.reviewerName} 리뷰어가 남긴 코드 수정안이 있어 이 라운드에서는 코드 수정이 잠겨 있습니다.
                  </p>
                ) : null}

                <div className="mt-3">
                  <SubmissionIdeEditor
                    value={codeSuggestionCode}
                    onChange={isCodeSuggestionLocked ? () => {} : setCodeSuggestionCode}
                    language={codeSuggestionLanguage}
                    readOnly={isCodeSuggestionLocked}
                    height={220}
                  />
                </div>

                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">수정안 첨부 파일</span>
                  <input
                    type="file"
                    multiple
                    disabled={isCodeSuggestionLocked}
                    onChange={(event) => setCodeSuggestionFiles(Array.from(event.target.files ?? []))}
                    className={`block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white ${
                      isCodeSuggestionLocked
                        ? "cursor-not-allowed bg-slate-100 file:bg-slate-400"
                        : "bg-white file:bg-slate-900"
                    }`}
                  />
                </label>
                <SelectedFilesPreview
                  files={codeSuggestionFiles}
                  title="수정안 첨부 미리보기"
                  onRemoveFile={(index) =>
                    setCodeSuggestionFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index))
                  }
                />

                <button
                  type="button"
                  onClick={handleSubmitReview}
                  className="mt-3 inline-flex h-9 items-center rounded-full bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  리뷰 저장
                </button>
              </div>
            </article>
          ) : null}

          {canManageReview && activePanel === "assignment" ? (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">과제 수정</p>
              <p className="mt-1 text-xs text-slate-500">
                제목/설명/마감 기한을 수정합니다. 저장 시 해당 과제 제출 목록 표시값도 동기화됩니다.
              </p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">과제 제목</span>
                  <input
                    value={assignmentTitleInput}
                    onChange={(event) => setAssignmentTitleInput(event.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-600">마감 기한</span>
                  <input
                    type="datetime-local"
                    value={assignmentDueAtInput}
                    onChange={(event) => setAssignmentDueAtInput(event.target.value)}
                    className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-600">과제 설명</span>
                <textarea
                  value={assignmentPromptInput}
                  onChange={(event) => setAssignmentPromptInput(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none"
                />
              </label>
              <button
                type="button"
                disabled={isSavingAssignment}
                onClick={handleSaveAssignmentMeta}
                className={`mt-3 inline-flex h-9 items-center rounded-full px-3.5 text-sm font-semibold text-white ${
                  isSavingAssignment ? "cursor-not-allowed bg-slate-300" : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {isSavingAssignment ? "저장 중..." : "과제 정보 저장"}
              </button>
            </article>
          ) : null}

          {activePanel === "rounds" ? (
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-ink">리뷰 라운드 히스토리</p>
              <p className="mt-1 text-xs text-slate-500">
                학생 제출과 강사 피드백(코드 수정안 포함)을 라운드 단위로 묶어 확인합니다.
              </p>
              {focusedRevisionSubmissionId && revisionById[focusedRevisionSubmissionId] ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-xs font-semibold text-slate-700">
                    선택 라운드: {revisionById[focusedRevisionSubmissionId].revision}차 ·{" "}
                    {formatDateTime(revisionById[focusedRevisionSubmissionId].submittedAt)}
                  </p>
                </div>
              ) : null}
              <RevisionComparisonPanel
                revisionOptions={revisionSelectionOptions}
                baseRevisionId={compareBaseRevisionSubmissionId}
                targetRevisionId={compareTargetRevisionSubmissionId}
                baseRevision={compareBaseRevision}
                targetRevision={compareTargetRevision}
                comparison={revisionComparison}
                onChangeBaseRevision={(nextId) => setCompareBaseRevisionSubmissionId(nextId)}
                onChangeTargetRevision={(nextId) => setCompareTargetRevisionSubmissionId(nextId)}
              />
              <div className="mt-3 space-y-4">
                {visibleReviewRounds.map((round) => (
                  <article key={round.revision.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">
                        제출 {round.revision.revision}차 · {formatDateTime(round.revision.submittedAt)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          downloadCodeFile({
                            fileBaseName: `${round.revision.assignmentTitle}-r${round.revision.revision}-submission`,
                            language: round.revision.codeLanguage,
                            code: round.revision.code,
                          })
                        }
                        className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700"
                      >
                        제출 코드 다운로드
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      제출자: {round.revision.studentName} · 과제: {round.revision.assignmentTitle}
                    </p>
                    {round.revision.message ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {round.revision.message}
                      </p>
                    ) : null}
                    {round.revision.code ? (
                      <div className="mt-2">
                        <SubmissionIdeEditor
                          value={round.revision.code}
                          onChange={() => {}}
                          language={round.revision.codeLanguage}
                          readOnly
                          height={180}
                        />
                      </div>
                    ) : null}
                    <div className="mt-2">
                      <SubmissionAttachmentMetaList
                        attachments={round.revision.attachments}
                        title="제출 첨부"
                      />
                    </div>

                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        강사 피드백
                      </p>
                      {round.feedbackEntries.length === 0 ? (
                        <p className="mt-2 text-xs text-slate-500">아직 등록된 피드백이 없습니다.</p>
                      ) : (
                        <div className="mt-2 space-y-3">
                          {round.feedbackEntries.map((entry) => (
                            <FeedbackEntryCard
                              key={entry.id}
                              feedback={entry}
                              revision={round.revision.revision}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </article>
          ) : null}
        </section>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:max-h-[1100px] xl:overflow-auto">
          <p className="text-sm font-semibold text-ink">타임라인</p>
          <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setTimelineScope("STUDENT")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                timelineScope === "STUDENT"
                  ? "bg-brand text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              해당 학생
            </button>
            {canManageReview ? (
              <button
                type="button"
                onClick={() => setTimelineScope("ASSIGNMENT")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  timelineScope === "ASSIGNMENT"
                    ? "bg-brand text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                과제 전체
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {timelineScope === "STUDENT"
              ? "강사 콘솔 제출 목록에서 보던 해당 학생 타임라인과 동일한 데이터입니다."
              : "같은 과제 주제에서 발생한 전체 제출/리뷰 이벤트를 확인합니다."}
          </p>
          <div className="mt-3 space-y-2">
            {visibleTimeline.length === 0 ? (
              <p className="text-sm text-slate-500">표시할 타임라인이 없습니다.</p>
            ) : (
              visibleTimeline.map((event) => (
                <TimelineEntryCard
                  key={event.id}
                  event={event}
                  submissionLabel={
                    event.submissionId ? visibleSubmissionLabelById[event.submissionId] : undefined
                  }
                  isActive={event.id === focusedTimelineEventId}
                  onClick={() => {
                    setFocusedTimelineEventId(event.id);
                    if (event.submissionId && revisionById[event.submissionId]) {
                      setFocusedRevisionSubmissionId(event.submissionId);
                      setCompareTargetRevisionSubmissionId(event.submissionId);
                      setCompareBaseRevisionSubmissionId((current) => {
                        if (current && current !== event.submissionId && revisionById[current]) {
                          return current;
                        }

                        const targetIndex = revisionSelectionOptions.findIndex(
                          (option) => option.id === event.submissionId,
                        );
                        return (
                          revisionSelectionOptions[targetIndex + 1]?.id ??
                          revisionSelectionOptions[targetIndex - 1]?.id ??
                          event.submissionId
                        );
                      });
                      handleMovePanel("rounds");
                    }
                  }}
                />
              ))
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

function FeedbackEntryCard({
  feedback,
  revision,
}: {
  feedback: SubmissionFeedbackEntry;
  revision: number;
}) {
  const entryType = feedback.entryType ?? "GENERAL";
  const messageFormat = feedback.messageFormat ?? "TEXT";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {feedback.reviewerName} · {revision}차 피드백
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {submissionFeedbackEntryTypeLabelMap[entryType]}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500 border border-slate-200">
            {submissionMessageFormatLabelMap[messageFormat]}
          </span>
          {feedback.code ? (
            <button
              type="button"
              onClick={() =>
                downloadCodeFile({
                  fileBaseName: `feedback-r${revision}-${feedback.reviewerName}`,
                  language: feedback.codeLanguage,
                  code: feedback.code,
                })
              }
              className="inline-flex h-7 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700"
            >
              코드 다운로드
            </button>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500">{formatDateTime(feedback.createdAt)}</p>
      {feedback.message ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {feedback.message}
        </p>
      ) : null}
      {feedback.code ? (
        <div className="mt-2">
          <SubmissionIdeEditor
            value={feedback.code}
            onChange={() => {}}
            language={feedback.codeLanguage}
            readOnly
            height={180}
          />
        </div>
      ) : null}
      <div className="mt-2">
        <SubmissionAttachmentMetaList attachments={feedback.attachments} title="피드백 첨부" />
      </div>
    </div>
  );
}

function TimelineEntryCard({
  event,
  submissionLabel,
  isActive,
  onClick,
}: {
  event: SubmissionTimelineEvent;
  submissionLabel?: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick && event.submissionId);
  const textTone = isActive ? "text-slate-800" : "text-slate-700";
  const subTone = isActive ? "text-slate-600" : "text-slate-500";
  const noteTone = isActive ? "text-slate-700" : "text-slate-600";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
        isActive
          ? "border-emerald-300 bg-emerald-50"
          : "border-slate-200 bg-white"
      } ${
        clickable
          ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50"
          : "cursor-default"
      }`}
    >
      <p className={`text-xs font-semibold ${textTone}`}>
        {event.actorName} · {event.type}
      </p>
      {submissionLabel ? (
        <p className={`text-[11px] font-semibold ${subTone}`}>{submissionLabel}</p>
      ) : null}
      <p className={`text-xs ${subTone}`}>{formatDateTime(event.createdAt)}</p>
      {event.note ? <p className={`mt-1 text-xs ${noteTone}`}>{event.note}</p> : null}
    </button>
  );
}

function RevisionComparisonPanel({
  revisionOptions,
  baseRevisionId,
  targetRevisionId,
  baseRevision,
  targetRevision,
  comparison,
  onChangeBaseRevision,
  onChangeTargetRevision,
}: {
  revisionOptions: Array<{ id: string; label: string }>;
  baseRevisionId?: string;
  targetRevisionId?: string;
  baseRevision?: AssignmentSubmission;
  targetRevision?: AssignmentSubmission;
  comparison: SubmissionRevisionComparisonResult;
  onChangeBaseRevision: (nextId: string | undefined) => void;
  onChangeTargetRevision: (nextId: string | undefined) => void;
}) {
  if (revisionOptions.length === 0) {
    return null;
  }

  const hasAttachmentDelta =
    comparison.addedAttachmentNames.length > 0 || comparison.removedAttachmentNames.length > 0;

  return (
    <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-semibold text-ink">{submissionRevisionCompareUiText.title}</p>
      <p className="mt-1 text-xs text-slate-500">{submissionRevisionCompareUiText.description}</p>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">
            {submissionRevisionCompareUiText.baseRevisionLabel}
          </span>
          <select
            value={baseRevisionId ?? ""}
            onChange={(event) => onChangeBaseRevision(event.target.value || undefined)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
          >
            {revisionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-slate-600">
            {submissionRevisionCompareUiText.targetRevisionLabel}
          </span>
          <select
            value={targetRevisionId ?? ""}
            onChange={(event) => onChangeTargetRevision(event.target.value || undefined)}
            className="h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
          >
            {revisionOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {comparison.isSameRevision ? (
        <p className="mt-2 text-xs font-semibold text-amber-700">
          {submissionRevisionCompareUiText.sameRevisionWarning}
        </p>
      ) : null}

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {submissionRevisionCompareUiText.lineSummaryLabel}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
            {submissionRevisionCompareUiText.unchangedLabel}: {comparison.codeDiff.summary.unchangedLineCount}
          </span>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-700">
            {submissionRevisionCompareUiText.addedLabel}: {comparison.codeDiff.summary.addedLineCount}
          </span>
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700">
            {submissionRevisionCompareUiText.removedLabel}: {comparison.codeDiff.summary.removedLineCount}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {submissionRevisionCompareUiText.messageLabel}
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-600">
          {comparison.messageChanged
            ? submissionRevisionCompareUiText.messageChanged
            : submissionRevisionCompareUiText.messageUnchanged}
        </p>
        {baseRevision && targetRevision ? (
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-[11px] font-semibold text-slate-500">
                기준 {baseRevision.revision}차
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                {comparison.baseMessage || "-"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-[11px] font-semibold text-slate-500">
                비교 {targetRevision.revision}차
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                {comparison.targetMessage || "-"}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {submissionRevisionCompareUiText.attachmentLabel}
        </p>
        {!hasAttachmentDelta ? (
          <p className="mt-2 text-xs text-slate-600">{submissionRevisionCompareUiText.attachmentUnchanged}</p>
        ) : (
          <div className="mt-2 grid gap-2 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-[11px] font-semibold text-emerald-700">
                {submissionRevisionCompareUiText.addedAttachmentLabel}
              </p>
              {comparison.addedAttachmentNames.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs text-slate-700">
                  {comparison.addedAttachmentNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">-</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-2">
              <p className="text-[11px] font-semibold text-rose-700">
                {submissionRevisionCompareUiText.removedAttachmentLabel}
              </p>
              {comparison.removedAttachmentNames.length > 0 ? (
                <ul className="mt-1 space-y-1 text-xs text-slate-700">
                  {comparison.removedAttachmentNames.map((name) => (
                    <li key={name}>{name}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-slate-500">-</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {submissionRevisionCompareUiText.codeCompareLabel}
        </p>
        {!comparison.isReady ? (
          <p className="mt-2 text-xs text-slate-500">리비전을 선택하면 비교를 표시합니다.</p>
        ) : !comparison.codeDiff.isComparable ? (
          <p className="mt-2 text-xs text-slate-500">
            {submissionRevisionCompareUiText.codeUnavailableText}
          </p>
        ) : comparison.codeDiff.isTooLarge ? (
          <p className="mt-2 text-xs text-slate-500">
            {submissionRevisionCompareUiText.codeTooLargeText}
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-2 py-1 text-right font-semibold">기준</th>
                  <th className="border-b border-slate-200 px-2 py-1 text-left font-semibold">코드</th>
                  <th className="border-b border-slate-200 px-2 py-1 text-right font-semibold">비교</th>
                  <th className="border-b border-slate-200 px-2 py-1 text-left font-semibold">코드</th>
                </tr>
              </thead>
              <tbody>
                {comparison.codeDiff.rows.map((row) => (
                  <tr
                    key={row.id}
                    className={
                      row.type === "ADDED"
                        ? "bg-emerald-50"
                        : row.type === "REMOVED"
                          ? "bg-rose-50"
                          : "bg-white"
                    }
                  >
                    <td className="w-14 border-b border-slate-100 px-2 py-1 text-right font-mono text-[11px] text-slate-500">
                      {row.baseLineNumber ?? ""}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                      <span className="mr-1 inline-block w-3 text-slate-400">
                        {row.type === "REMOVED" ? "-" : row.type === "ADDED" ? "" : " "}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{row.baseText}</span>
                    </td>
                    <td className="w-14 border-b border-slate-100 px-2 py-1 text-right font-mono text-[11px] text-slate-500">
                      {row.targetLineNumber ?? ""}
                    </td>
                    <td className="border-b border-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700">
                      <span className="mr-1 inline-block w-3 text-slate-400">
                        {row.type === "ADDED" ? "+" : row.type === "REMOVED" ? "" : " "}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{row.targetText}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function downloadCodeFile({
  fileBaseName,
  language,
  code,
}: {
  fileBaseName: string;
  language: SubmissionCodeLanguage;
  code: string;
}) {
  if (!code) {
    return;
  }

  const extensionMap: Record<SubmissionCodeLanguage, string> = {
    typescript: "ts",
    javascript: "js",
    python: "py",
    java: "java",
    sql: "sql",
    markdown: "md",
    plaintext: "txt",
  };
  const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFileName(fileBaseName)}.${extensionMap[language] ?? "txt"}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFileName(value: string) {
  return value.replace(/[^\w\-가-힣]+/g, "-");
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

function toDateTimeLocalInput(isoValue?: string) {
  if (!isoValue) {
    return "";
  }

  const date = new Date(isoValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function parseDateTimeLocalInputToIso(input: string) {
  if (!input) {
    return null;
  }

  const parsed = new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function parseSubmissionDetailPanel(value: string | null): SubmissionDetailPanel {
  if (value === "assignment" || value === "rounds") {
    return value;
  }

  return "review";
}

function resolveSubmissionErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as SubmissionError).message);
  }

  return "제출 상세 정보를 불러오는 중 오류가 발생했습니다.";
}

function buildSubmissionRevisionComparison({
  baseRevision,
  targetRevision,
}: {
  baseRevision?: AssignmentSubmission;
  targetRevision?: AssignmentSubmission;
}): SubmissionRevisionComparisonResult {
  if (!baseRevision || !targetRevision) {
    return {
      isReady: false,
      isSameRevision: false,
      messageChanged: false,
      baseMessage: "",
      targetMessage: "",
      addedAttachmentNames: [],
      removedAttachmentNames: [],
      codeDiff: {
        isComparable: false,
        isTooLarge: false,
        summary: { unchangedLineCount: 0, addedLineCount: 0, removedLineCount: 0 },
        rows: [],
      },
    };
  }

  const baseMessage = baseRevision.message.trim();
  const targetMessage = targetRevision.message.trim();
  const baseAttachmentBySignature = new Map(
    baseRevision.attachments.map((attachment) => [
      toAttachmentSignature(attachment.fileName, attachment.sizeBytes),
      attachment.fileName,
    ]),
  );
  const targetAttachmentBySignature = new Map(
    targetRevision.attachments.map((attachment) => [
      toAttachmentSignature(attachment.fileName, attachment.sizeBytes),
      attachment.fileName,
    ]),
  );

  const addedAttachmentNames = Array.from(targetAttachmentBySignature.entries())
    .filter(([signature]) => !baseAttachmentBySignature.has(signature))
    .map(([, fileName]) => fileName);
  const removedAttachmentNames = Array.from(baseAttachmentBySignature.entries())
    .filter(([signature]) => !targetAttachmentBySignature.has(signature))
    .map(([, fileName]) => fileName);

  return {
    isReady: true,
    isSameRevision: baseRevision.id === targetRevision.id,
    messageChanged: baseMessage !== targetMessage,
    baseMessage,
    targetMessage,
    addedAttachmentNames,
    removedAttachmentNames,
    codeDiff: buildSubmissionRevisionCodeDiff(baseRevision.code, targetRevision.code),
  };
}

function buildSubmissionRevisionCodeDiff(
  baseCode: string,
  targetCode: string,
): SubmissionRevisionCodeDiffResult {
  const baseLines = toCodeLines(baseCode);
  const targetLines = toCodeLines(targetCode);

  if (baseLines.length === 0 && targetLines.length === 0) {
    return {
      isComparable: false,
      isTooLarge: false,
      summary: { unchangedLineCount: 0, addedLineCount: 0, removedLineCount: 0 },
      rows: [],
    };
  }

  if (
    baseLines.length > MAX_REVISION_DIFF_LINE_COUNT ||
    targetLines.length > MAX_REVISION_DIFF_LINE_COUNT
  ) {
    return {
      isComparable: true,
      isTooLarge: true,
      summary: {
        unchangedLineCount: 0,
        addedLineCount: targetLines.length,
        removedLineCount: baseLines.length,
      },
      rows: [],
    };
  }

  const lcsTable = buildLineLcsLengthTable(baseLines, targetLines);
  const rows: SubmissionRevisionDiffRow[] = [];
  let unchangedLineCount = 0;
  let addedLineCount = 0;
  let removedLineCount = 0;
  let baseIndex = 0;
  let targetIndex = 0;
  let baseLineNumber = 1;
  let targetLineNumber = 1;

  while (baseIndex < baseLines.length && targetIndex < targetLines.length) {
    if (baseLines[baseIndex] === targetLines[targetIndex]) {
      unchangedLineCount += 1;
      rows.push({
        id: `same-${baseIndex}-${targetIndex}`,
        type: "UNCHANGED",
        baseLineNumber,
        targetLineNumber,
        baseText: baseLines[baseIndex],
        targetText: targetLines[targetIndex],
      });
      baseIndex += 1;
      targetIndex += 1;
      baseLineNumber += 1;
      targetLineNumber += 1;
      continue;
    }

    if (lcsTable[baseIndex + 1][targetIndex] >= lcsTable[baseIndex][targetIndex + 1]) {
      removedLineCount += 1;
      rows.push({
        id: `removed-${baseIndex}`,
        type: "REMOVED",
        baseLineNumber,
        targetText: "",
        baseText: baseLines[baseIndex],
      });
      baseIndex += 1;
      baseLineNumber += 1;
      continue;
    }

    addedLineCount += 1;
    rows.push({
      id: `added-${targetIndex}`,
      type: "ADDED",
      targetLineNumber,
      baseText: "",
      targetText: targetLines[targetIndex],
    });
    targetIndex += 1;
    targetLineNumber += 1;
  }

  while (baseIndex < baseLines.length) {
    removedLineCount += 1;
    rows.push({
      id: `removed-tail-${baseIndex}`,
      type: "REMOVED",
      baseLineNumber,
      targetText: "",
      baseText: baseLines[baseIndex],
    });
    baseIndex += 1;
    baseLineNumber += 1;
  }

  while (targetIndex < targetLines.length) {
    addedLineCount += 1;
    rows.push({
      id: `added-tail-${targetIndex}`,
      type: "ADDED",
      targetLineNumber,
      baseText: "",
      targetText: targetLines[targetIndex],
    });
    targetIndex += 1;
    targetLineNumber += 1;
  }

  return {
    isComparable: true,
    isTooLarge: false,
    summary: {
      unchangedLineCount,
      addedLineCount,
      removedLineCount,
    },
    rows,
  };
}

function buildLineLcsLengthTable(baseLines: string[], targetLines: string[]) {
  const lcsTable = Array.from({ length: baseLines.length + 1 }, () =>
    Array<number>(targetLines.length + 1).fill(0),
  );

  for (let baseIndex = baseLines.length - 1; baseIndex >= 0; baseIndex -= 1) {
    for (let targetIndex = targetLines.length - 1; targetIndex >= 0; targetIndex -= 1) {
      if (baseLines[baseIndex] === targetLines[targetIndex]) {
        lcsTable[baseIndex][targetIndex] = lcsTable[baseIndex + 1][targetIndex + 1] + 1;
        continue;
      }

      lcsTable[baseIndex][targetIndex] = Math.max(
        lcsTable[baseIndex + 1][targetIndex],
        lcsTable[baseIndex][targetIndex + 1],
      );
    }
  }

  return lcsTable;
}

function toCodeLines(code: string) {
  if (!code) {
    return [] as string[];
  }

  const normalized = code.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines;
}

function toAttachmentSignature(fileName: string, sizeBytes: number) {
  return `${fileName}:${sizeBytes}`;
}
