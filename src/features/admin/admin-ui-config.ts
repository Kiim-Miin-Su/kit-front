import type {
  AdminCourseAuditActionType,
  AdminCourseMemberRole,
  AdminCoursePacingType,
  AdminCourseStatus,
} from "@/types/admin";
import type { ScheduleVisibilityType } from "@/types/attendance";

export const adminCourseMemberRoleLabelMap: Record<AdminCourseMemberRole, string> = {
  INSTRUCTOR: "강사",
  ASSISTANT: "조교",
  STUDENT: "학원생",
};

export const adminCourseMemberRoleToneMap: Record<AdminCourseMemberRole, string> = {
  INSTRUCTOR: "bg-indigo-100 text-indigo-700",
  ASSISTANT: "bg-sky-100 text-sky-700",
  STUDENT: "bg-emerald-100 text-emerald-700",
};

export const adminCourseStatusLabelMap: Record<AdminCourseStatus, string> = {
  ACTIVE: "진행중",
  PENDING: "준비중",
};

export const adminCourseStatusToneMap: Record<AdminCourseStatus, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PENDING: "bg-amber-100 text-amber-700",
};

export const adminCoursePacingTypeLabelMap: Record<AdminCoursePacingType, string> = {
  INSTRUCTOR_PACED: "강사 주도형",
  SELF_PACED: "자율 진도형",
};

export const adminCourseCategoryOptions = [
  "프론트엔드",
  "백엔드",
  "AI 활용",
  "데이터",
  "디자인 시스템",
  "기타",
] as const;

export const adminScheduleCategoryOptions = [
  "운영",
  "수업",
  "필수 출석",
  "특강",
  "시험",
] as const;

export const adminScheduleVisibilityTypeLabelMap: Record<ScheduleVisibilityType, string> = {
  global: "학원 전체",
  class: "수업/반",
};

export const adminCourseWorkspaceUpdatedEvent = "admin-course-workspace-updated";

export const adminCourseAuditActionLabelMap: Record<AdminCourseAuditActionType, string> = {
  SUBMITTED: "제출",
  RESUBMITTED: "재제출",
  REVIEW_STATUS_CHANGED: "리뷰 상태 변경",
  FEEDBACK_ADDED: "피드백 등록",
  ASSIGNMENT_UPDATED: "과제 수정",
  TEMPLATE_UPDATED: "템플릿 갱신",
};

export const adminCourseAuditActionToneMap: Record<AdminCourseAuditActionType, string> = {
  SUBMITTED: "bg-indigo-100 text-indigo-700",
  RESUBMITTED: "bg-blue-100 text-blue-700",
  REVIEW_STATUS_CHANGED: "bg-amber-100 text-amber-700",
  FEEDBACK_ADDED: "bg-emerald-100 text-emerald-700",
  ASSIGNMENT_UPDATED: "bg-slate-200 text-slate-700",
  TEMPLATE_UPDATED: "bg-cyan-100 text-cyan-700",
};
