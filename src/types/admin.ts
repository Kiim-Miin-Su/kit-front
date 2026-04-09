import type { ScheduleVisibilityType, StudentScheduleEvent } from "@/types/attendance";

export type AdminCourseMemberRole = "INSTRUCTOR" | "ASSISTANT" | "STUDENT";
export type AdminCourseStatus = "ACTIVE" | "PENDING";
export type AdminScheduleSourceType = "SYSTEM" | "CUSTOM";
export type AdminCoursePacingType = "INSTRUCTOR_PACED" | "SELF_PACED";

export interface AdminCourseWorkspaceCourse {
  courseId: string;
  courseTitle: string;
  category: string;
  classScope: string;
  status: AdminCourseStatus;
  sectionLabel: string;
  roomLabel: string;
  capacity: number;
  startDate: string;
  endDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  pacingType: AdminCoursePacingType;
}

export interface AdminCourseWorkspaceUser {
  userId: string;
  userName: string;
  birthDate?: string;
  title: string;
  defaultRole: AdminCourseMemberRole;
}

export interface AdminCourseMemberBinding {
  courseId: string;
  userId: string;
  role: AdminCourseMemberRole;
}

export interface AdminCourseWorkspaceData {
  courses: AdminCourseWorkspaceCourse[];
  users: AdminCourseWorkspaceUser[];
  memberBindings: AdminCourseMemberBinding[];
}

export interface CreateAdminCourseInput {
  courseTitle: string;
  category: string;
  sectionLabel?: string;
  roomLabel?: string;
  capacity?: number;
  startDate: string;
  endDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  pacingType: AdminCoursePacingType;
}

export interface UpsertAdminCourseMemberBindingInput {
  courseId: string;
  userId: string;
  role: AdminCourseMemberRole;
}

export interface DeleteAdminCourseMemberBindingInput {
  courseId: string;
  userId: string;
}

export interface AdminScheduleScopeRef {
  visibilityType: ScheduleVisibilityType;
  visibilityScope: string;
  visibilityLabel: string;
}

export interface AdminScheduleEvent extends StudentScheduleEvent {
  sourceType: AdminScheduleSourceType;
}

export interface AdminScheduleWorkspaceData {
  schedules: AdminScheduleEvent[];
  scopes: AdminScheduleScopeRef[];
}

export interface CreateAdminScheduleInput {
  title: string;
  categoryLabel: string;
  dateKey: string;
  timeLabel: string;
  locationLabel: string;
  visibilityType: ScheduleVisibilityType;
  visibilityScope: string;
  visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowStartAt?: string;
  attendanceWindowEndAt?: string;
}

export interface UpdateAdminScheduleInput extends CreateAdminScheduleInput {
  scheduleId: string;
}

export type AdminCourseAuditActionType =
  | "SUBMITTED"
  | "RESUBMITTED"
  | "REVIEW_STATUS_CHANGED"
  | "FEEDBACK_ADDED"
  | "ASSIGNMENT_UPDATED"
  | "TEMPLATE_UPDATED";

export interface AdminCourseAssignmentAuditEvent {
  id: string;
  courseId: string;
  assignmentId: string;
  assignmentTitle: string;
  submissionId?: string;
  actorId: string;
  actorName: string;
  actorRole: "ADMIN" | "INSTRUCTOR" | "ASSISTANT" | "STUDENT";
  action: AdminCourseAuditActionType;
  occurredAt: string;
  note?: string;
}

export interface AdminAttendanceScopeWorkspaceData {
  courseId: string;
  courseTitle: string;
  classScope: string;
  availableScopes: AdminScheduleScopeRef[];
  allowedScheduleScopes: string[];
}

export interface UpdateAdminAttendanceScopeInput {
  courseId: string;
  allowedScheduleScopes: string[];
}
