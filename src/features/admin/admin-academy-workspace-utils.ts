import type {
  AdminCourseMemberBinding,
  AdminCourseMemberRole,
  AdminCourseWorkspaceUser,
} from "@/types/admin";

export interface AdminCourseDateWindowInput {
  startDate: string;
  endDate: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
}

export interface AdminAssignableUserOption {
  user: AdminCourseWorkspaceUser;
  assignedRole?: AdminCourseMemberRole;
}

export function isCourseStudentCapacityExceeded({
  capacity,
  currentStudentCount,
  currentUserRole,
  nextRole,
}: {
  capacity: number;
  currentStudentCount: number;
  currentUserRole?: AdminCourseMemberRole;
  nextRole: AdminCourseMemberRole;
}) {
  if (nextRole !== "STUDENT") {
    return false;
  }

  const nextStudentCount =
    currentUserRole === "STUDENT" ? currentStudentCount : currentStudentCount + 1;

  return nextStudentCount > capacity;
}

export function validateAdminCourseDateWindow(input: AdminCourseDateWindowInput): string | null {
  const courseStart = parseDateOrNull(input.startDate);
  const courseEnd = parseDateOrNull(input.endDate);
  const enrollmentStart = parseDateOrNull(input.enrollmentStartDate);
  const enrollmentEnd = parseDateOrNull(input.enrollmentEndDate);

  if (!courseStart || !courseEnd || !enrollmentStart || !enrollmentEnd) {
    return "수업 기간과 모집 기간을 모두 입력하세요.";
  }

  if (courseStart.getTime() > courseEnd.getTime()) {
    return "수업 시작일은 종료일보다 늦을 수 없습니다.";
  }

  if (enrollmentStart.getTime() > enrollmentEnd.getTime()) {
    return "모집 시작일은 모집 종료일보다 늦을 수 없습니다.";
  }

  if (enrollmentStart.getTime() > courseEnd.getTime()) {
    return "모집 시작일은 수업 종료일을 넘을 수 없습니다.";
  }

  if (enrollmentEnd.getTime() > courseEnd.getTime()) {
    return "모집 종료일은 수업 종료일을 넘을 수 없습니다.";
  }

  return null;
}

export function buildAssignableUsersForCourse({
  courseId,
  users,
  memberBindings,
}: {
  courseId?: string;
  users: AdminCourseWorkspaceUser[];
  memberBindings: AdminCourseMemberBinding[];
}): AdminAssignableUserOption[] {
  if (!courseId) {
    return users
      .map((user) => ({ user }))
      .sort((a, b) => a.user.userName.localeCompare(b.user.userName, "ko"));
  }

  const bindingByUserId = new Map<string, AdminCourseMemberRole>();

  for (const binding of memberBindings) {
    if (binding.courseId === courseId) {
      bindingByUserId.set(binding.userId, binding.role);
    }
  }

  return users
    .map((user) => ({
      user,
      assignedRole: bindingByUserId.get(user.userId),
    }))
    .sort((a, b) => a.user.userName.localeCompare(b.user.userName, "ko"));
}

function parseDateOrNull(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }

  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const date = new Date(`${dateKey}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}
