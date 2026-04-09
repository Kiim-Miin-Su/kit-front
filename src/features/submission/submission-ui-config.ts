import type {
  SubmissionEditorType,
  SubmissionFeedbackEntryType,
  SubmissionMessageFormat,
  SubmissionReviewStatus,
} from "@/types/submission";

export type InstructorTemplateTargetMode = "NEW_ASSIGNMENT" | "TEMPLATE_AUTHORING";

export const instructorTemplateTargetModeOptions: Array<{
  id: InstructorTemplateTargetMode;
  label: string;
}> = [
  { id: "NEW_ASSIGNMENT", label: "신규 과제" },
  { id: "TEMPLATE_AUTHORING", label: "템플릿 작성" },
];

export const submissionEditorTypeOptions: Array<{
  value: SubmissionEditorType;
  label: string;
}> = [
  { value: "IDE", label: "IDE 스타일" },
  { value: "NOTE", label: "노트 스타일" },
];

export const instructorSubmissionStatusFilterOptions: Array<{
  value: SubmissionReviewStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "전체" },
  { value: "SUBMITTED", label: "재검토" },
  { value: "NEEDS_REVISION", label: "수정 필요" },
  { value: "REVIEWED", label: "리뷰 완료" },
];

export const reviewStatusDecisionOptions: Array<{
  value: SubmissionReviewStatus;
  label: string;
}> = [
  { value: "REVIEWED", label: "완료" },
  { value: "NEEDS_REVISION", label: "보완 필요" },
  { value: "SUBMITTED", label: "재검토" },
];

export const reviewStatusDecisionLabelMap: Record<SubmissionReviewStatus, string> = {
  REVIEWED: "완료",
  NEEDS_REVISION: "보완 필요",
  SUBMITTED: "재검토",
};

export const submissionMessageFormatOptions: Array<{
  value: SubmissionMessageFormat;
  label: string;
}> = [
  { value: "TEXT", label: "Text" },
  { value: "MARKDOWN", label: "Markdown" },
];

export const submissionMessageFormatLabelMap: Record<SubmissionMessageFormat, string> = {
  TEXT: "Text",
  MARKDOWN: "Markdown",
};

export const submissionFeedbackEntryTypeLabelMap: Record<SubmissionFeedbackEntryType, string> = {
  GENERAL: "일반 피드백",
  CODE_SUGGESTION: "코드 수정안",
};

export const submissionRevisionCompareUiText = {
  title: "리비전 비교",
  description: "두 제출 라운드를 선택해 메시지/코드/첨부 변경점을 확인합니다.",
  baseRevisionLabel: "기준 라운드",
  targetRevisionLabel: "비교 라운드",
  lineSummaryLabel: "코드 변경 요약",
  unchangedLabel: "유지",
  addedLabel: "추가",
  removedLabel: "삭제",
  sameRevisionWarning: "기준/비교 라운드가 같습니다. 서로 다른 라운드를 선택하세요.",
  codeUnavailableText: "두 라운드 모두 코드가 없어 비교할 내용이 없습니다.",
  codeTooLargeText: "코드 줄 수가 많아 상세 diff 대신 통계만 표시합니다.",
  messageLabel: "메시지 비교",
  attachmentLabel: "첨부 비교",
  messageUnchanged: "메시지가 동일합니다.",
  messageChanged: "메시지가 변경되었습니다.",
  attachmentUnchanged: "첨부 변경 없음",
  addedAttachmentLabel: "추가 첨부",
  removedAttachmentLabel: "삭제 첨부",
  codeCompareLabel: "코드 diff",
} as const;
