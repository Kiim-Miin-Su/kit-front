import axios from "axios";
import { validateAdminCourseDateWindow } from "@/features/admin/admin-academy-workspace-utils";
import { validateAdminScheduleInput } from "@/features/admin/admin-schedule-utils";
import { studentAttendanceProfile } from "@/features/attendance/mock-attendance-data";
import { createInitialSubmissionDatabase } from "@/features/submission/mock-submission-data";
import { api } from "@/services/api";
import {
  readStoredCustomAcademySchedules,
  removeStoredCustomAcademySchedule,
  upsertStoredCustomAcademySchedule,
} from "@/services/attendance-schedule-storage";
import {
  readAttendanceScopePolicyByCourseId,
  removeAttendanceScopePolicyRecord,
  upsertAttendanceScopePolicyRecord,
} from "@/services/attendance-scope-policy-storage";
import { fetchCourseCatalog } from "@/services/course";
import type {
  AdminAttendanceScopeWorkspaceData,
  AdminCourseAssignmentAuditEvent,
  AdminCourseMemberBinding,
  AdminCourseMemberRole,
  AdminCoursePacingType,
  AdminCourseStatus,
  AdminCourseWorkspaceCourse,
  AdminCourseWorkspaceData,
  AdminCourseWorkspaceUser,
  AdminScheduleEvent,
  AdminScheduleScopeRef,
  AdminScheduleWorkspaceData,
  CreateAdminCourseInput,
  CreateAdminScheduleInput,
  DeleteAdminCourseMemberBindingInput,
  UpdateAdminAttendanceScopeInput,
  UpdateAdminScheduleInput,
  UpsertAdminCourseMemberBindingInput,
} from "@/types/admin";
import type { ScheduleVisibilityType, StudentScheduleEvent } from "@/types/attendance";

const ADMIN_CUSTOM_COURSE_STORAGE_KEY = "ai-edu-admin-custom-courses-v1";
const ADMIN_COURSE_MEMBER_BINDING_STORAGE_KEY = "ai-edu-admin-course-member-bindings-v1";
const ADMIN_DELETED_COURSE_IDS_STORAGE_KEY = "ai-edu-admin-deleted-course-ids-v1";

export async function fetchAdminCourseWorkspace(): Promise<AdminCourseWorkspaceData> {
  const fallbackWorkspace = await buildFallbackAdminCourseWorkspace();
  const deletedCourseIds = readDeletedCourseIdsFromStorage();

  try {
    const { data } = await api.get<unknown>("/admin/users/workspace");
    const normalized = normalizeAdminCourseWorkspace(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_USERS_WORKSPACE");
    }

    const merged = applyDeletedCourses(
      mergeAdminCourseWorkspace(normalized, fallbackWorkspace),
      deletedCourseIds,
    );
    return merged;
  } catch {
    return applyDeletedCourses(fallbackWorkspace, deletedCourseIds);
  }
}

export async function createAdminCourse(input: CreateAdminCourseInput): Promise<AdminCourseWorkspaceCourse> {
  const dateWindowError = validateAdminCourseDateWindow({
    startDate: input.startDate,
    endDate: input.endDate,
    enrollmentStartDate: input.enrollmentStartDate,
    enrollmentEndDate: input.enrollmentEndDate,
  });

  if (dateWindowError) {
    throw new Error(dateWindowError);
  }

  if (typeof input.capacity === "number" && (!Number.isFinite(input.capacity) || input.capacity <= 0)) {
    throw new Error("정원은 1명 이상의 숫자로 입력하세요.");
  }

  try {
    const { data } = await api.post<unknown>("/admin/courses", input);
    const normalized = normalizeAdminCourseWorkspaceCourse(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_CREATED_COURSE");
    }

    removeDeletedCourseId(normalized.courseId);
    upsertCustomCourse(normalized);
    return normalized;
  } catch {
    const courseId = `course-admin-${Date.now()}`;
    const courseTitle = input.courseTitle.trim();
    const lifecycleDefaults = buildCourseLifecycleDefaults({ status: "ACTIVE" });
    const created: AdminCourseWorkspaceCourse = {
      courseId,
      courseTitle,
      category: input.category.trim() || "기타",
      classScope: toClassScope(courseId, courseTitle),
      status: "ACTIVE",
      sectionLabel: input.sectionLabel?.trim() || lifecycleDefaults.sectionLabel,
      roomLabel: input.roomLabel?.trim() || lifecycleDefaults.roomLabel,
      capacity:
        typeof input.capacity === "number" && input.capacity > 0
          ? Math.floor(input.capacity)
          : lifecycleDefaults.capacity,
      startDate: normalizeDateKey(input.startDate, lifecycleDefaults.startDate),
      endDate: normalizeDateKey(input.endDate, lifecycleDefaults.endDate),
      enrollmentStartDate: normalizeDateKey(
        input.enrollmentStartDate,
        lifecycleDefaults.enrollmentStartDate,
      ),
      enrollmentEndDate: normalizeDateKey(
        input.enrollmentEndDate,
        lifecycleDefaults.enrollmentEndDate,
      ),
      pacingType: normalizeCoursePacingType(input.pacingType),
    };

    removeDeletedCourseId(created.courseId);
    upsertCustomCourse(created);
    return created;
  }
}

export async function upsertAdminCourseMemberBinding(
  input: UpsertAdminCourseMemberBindingInput,
): Promise<AdminCourseMemberBinding> {
  await assertStudentCapacityBeforeBinding(input);

  try {
    const { data } = await api.put<unknown>(
      `/admin/courses/${input.courseId}/members/${input.userId}/role`,
      { role: input.role },
    );
    const normalized = normalizeAdminCourseMemberBinding(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_COURSE_MEMBER_ROLE");
    }

    upsertCourseMemberBinding(normalized);
    return normalized;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && error.response.status < 500) {
      throw error;
    }

    const fallback: AdminCourseMemberBinding = {
      courseId: input.courseId,
      userId: input.userId,
      role: input.role,
    };

    upsertCourseMemberBinding(fallback);
    return fallback;
  }
}

export async function deleteAdminCourseMemberBinding(input: DeleteAdminCourseMemberBindingInput) {
  try {
    await api.delete(`/admin/courses/${input.courseId}/members/${input.userId}`);
  } catch {
    // no-op: fallback storage still updated
  }

  removeCourseMemberBinding(input.courseId, input.userId);
}

export async function deleteAdminCourse(courseId: string) {
  const workspace = await fetchAdminCourseWorkspace();
  const course = workspace.courses.find((item) => item.courseId === courseId);

  try {
    await api.delete(`/admin/courses/${courseId}`);
  } catch {
    // no-op: fallback storage still updated
  }

  markCourseAsDeleted(courseId);
  removeCustomCourse(courseId);
  removeCourseMemberBindingsByCourseId(courseId);
  removeAttendanceScopePolicyRecord(courseId);

  if (course) {
    const removableCustomSchedules = readStoredCustomAcademySchedules()
      .filter(
        (schedule) =>
          schedule.visibilityType === "class" && schedule.visibilityScope === course.classScope,
      )
      .map((schedule) => schedule.id);

    for (const scheduleId of removableCustomSchedules) {
      removeStoredCustomAcademySchedule(scheduleId);
    }
  }
}

export async function fetchAdminScheduleWorkspace(): Promise<AdminScheduleWorkspaceData> {
  const fallbackWorkspace = await buildFallbackAdminScheduleWorkspace();

  try {
    const { data } = await api.get<unknown>("/admin/schedules/workspace");
    const normalized = normalizeAdminScheduleWorkspace(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_SCHEDULE_WORKSPACE");
    }

    return mergeAdminScheduleWorkspace(normalized, fallbackWorkspace);
  } catch {
    return fallbackWorkspace;
  }
}

export async function createAdminSchedule(input: CreateAdminScheduleInput): Promise<AdminScheduleEvent> {
  const validationError = validateAdminScheduleInput(input);

  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const { data } = await api.post<unknown>("/admin/schedules", input);
    const normalized = normalizeAdminScheduleEvent(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_CREATED_SCHEDULE");
    }

    if (normalized.sourceType === "CUSTOM") {
      upsertStoredCustomAcademySchedule(toStudentScheduleEvent(normalized));
    }

    return normalized;
  } catch {
    const attendanceWindowLabel =
      input.requiresAttendanceCheck && input.attendanceWindowEndAt
        ? `${formatWindowEndLabel(input.attendanceWindowEndAt)}까지 인증 가능`
        : undefined;
    const created: AdminScheduleEvent = {
      id: `schedule-custom-${Date.now()}`,
      title: input.title.trim(),
      categoryLabel: input.categoryLabel.trim() || "운영",
      dateKey: input.dateKey,
      dateLabel: buildDateLabelFromDateKey(input.dateKey),
      timeLabel: input.timeLabel.trim() || "시간 미정",
      locationLabel: input.locationLabel.trim() || "장소 미정",
      visibilityType: input.visibilityType,
      visibilityScope: input.visibilityScope,
      visibilityLabel: input.visibilityLabel,
      requiresAttendanceCheck: input.requiresAttendanceCheck,
      attendanceWindowLabel,
      attendanceWindowStartAt: input.attendanceWindowStartAt,
      attendanceWindowEndAt: input.attendanceWindowEndAt,
      attendanceStatus: input.requiresAttendanceCheck ? "NOT_CHECKED_IN" : undefined,
      supportsCodeCheckIn: input.requiresAttendanceCheck,
      sourceType: "CUSTOM",
    };

    upsertStoredCustomAcademySchedule(toStudentScheduleEvent(created));
    return created;
  }
}

export async function updateAdminSchedule(input: UpdateAdminScheduleInput): Promise<AdminScheduleEvent> {
  const { scheduleId, ...payload } = input;
  const validationError = validateAdminScheduleInput(payload);

  if (validationError) {
    throw new Error(validationError);
  }

  try {
    const { data } = await api.put<unknown>(`/admin/schedules/${scheduleId}`, payload);
    const normalized = normalizeAdminScheduleEvent(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_UPDATED_SCHEDULE");
    }

    if (normalized.sourceType === "CUSTOM") {
      upsertStoredCustomAcademySchedule(toStudentScheduleEvent(normalized));
    }

    return normalized;
  } catch {
    const existingCustom = readStoredCustomAcademySchedules().find(
      (schedule) => schedule.id === input.scheduleId,
    );
    const attendanceWindowLabel =
      input.requiresAttendanceCheck && input.attendanceWindowEndAt
        ? `${formatWindowEndLabel(input.attendanceWindowEndAt)}까지 인증 가능`
        : undefined;
    const updated: AdminScheduleEvent = {
      id: input.scheduleId,
      title: input.title.trim(),
      categoryLabel: input.categoryLabel.trim() || "운영",
      dateKey: input.dateKey,
      dateLabel: buildDateLabelFromDateKey(input.dateKey),
      timeLabel: input.timeLabel.trim() || "시간 미정",
      locationLabel: input.locationLabel.trim() || "장소 미정",
      visibilityType: input.visibilityType,
      visibilityScope: input.visibilityScope,
      visibilityLabel: input.visibilityLabel,
      requiresAttendanceCheck: input.requiresAttendanceCheck,
      attendanceWindowLabel,
      attendanceWindowStartAt: input.attendanceWindowStartAt,
      attendanceWindowEndAt: input.attendanceWindowEndAt,
      attendanceStatus: input.requiresAttendanceCheck
        ? existingCustom?.attendanceStatus ?? "NOT_CHECKED_IN"
        : undefined,
      supportsCodeCheckIn: input.requiresAttendanceCheck,
      sourceType: "CUSTOM",
    };

    upsertStoredCustomAcademySchedule(toStudentScheduleEvent(updated));
    return updated;
  }
}

export async function deleteAdminSchedule(scheduleId: string) {
  try {
    await api.delete(`/admin/schedules/${scheduleId}`);
  } catch {
    // no-op: fallback storage still updated
  }

  removeStoredCustomAcademySchedule(scheduleId);
}

export async function searchAdminUsers(query: string): Promise<AdminCourseWorkspaceUser[]> {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    const workspace = await fetchAdminCourseWorkspace();
    return workspace.users.slice(0, 40);
  }

  try {
    const { data } = await api.get<unknown>("/admin/users/search", {
      params: {
        query,
      },
    });
    const normalized = normalizeAdminUserSearchResponse(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_USER_SEARCH_RESPONSE");
    }

    return normalized;
  } catch {
    const workspace = await fetchAdminCourseWorkspace();
    return workspace.users.filter((user) =>
      [user.userName, user.userId, user.birthDate, user.title]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }
}

export async function fetchAdminCourseAssignmentAudit(
  courseId: string,
): Promise<AdminCourseAssignmentAuditEvent[]> {
  try {
    const { data } = await api.get<unknown>(`/courses/${courseId}/assignment-audit`);
    const normalized = normalizeAdminCourseAssignmentAuditResponse(data);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_COURSE_AUDIT_RESPONSE");
    }

    return normalized
      .filter((event) => event.courseId === courseId)
      .sort((a, b) => Number(new Date(b.occurredAt)) - Number(new Date(a.occurredAt)));
  } catch {
    const fallback = buildFallbackCourseAuditEvents(courseId);
    return fallback.sort((a, b) => Number(new Date(b.occurredAt)) - Number(new Date(a.occurredAt)));
  }
}

export async function fetchAdminAttendanceScopeWorkspace(
  courseId: string,
): Promise<AdminAttendanceScopeWorkspaceData> {
  const fallbackWorkspace = await buildFallbackAdminAttendanceScopeWorkspace(courseId);

  try {
    const { data } = await api.get<unknown>(`/admin/courses/${courseId}/attendance-scope-workspace`);
    const normalized = normalizeAdminAttendanceScopeWorkspace(data, fallbackWorkspace);

    if (!normalized) {
      throw new Error("INVALID_ADMIN_ATTENDANCE_SCOPE_WORKSPACE");
    }

    upsertAttendanceScopePolicyRecord({
      courseId,
      classScope: normalized.classScope,
      allowedScheduleScopes: normalized.allowedScheduleScopes,
    });
    return normalized;
  } catch {
    return fallbackWorkspace;
  }
}

export async function updateAdminAttendanceScopePolicy(
  input: UpdateAdminAttendanceScopeInput,
): Promise<AdminAttendanceScopeWorkspaceData> {
  const fallbackWorkspace = await buildFallbackAdminAttendanceScopeWorkspace(input.courseId);
  const normalizedScopes = normalizeAllowedScheduleScopes({
    availableScopes: fallbackWorkspace.availableScopes,
    classScope: fallbackWorkspace.classScope,
    allowedScheduleScopes: input.allowedScheduleScopes,
  });

  try {
    const { data } = await api.put<unknown>(
      `/admin/courses/${input.courseId}/attendance-scopes`,
      {
        allowedScheduleScopes: normalizedScopes,
      },
    );
    const normalized = normalizeAdminAttendanceScopeWorkspace(data, {
      ...fallbackWorkspace,
      allowedScheduleScopes: normalizedScopes,
    });

    if (!normalized) {
      throw new Error("INVALID_ADMIN_ATTENDANCE_SCOPE_POLICY");
    }

    upsertAttendanceScopePolicyRecord({
      courseId: input.courseId,
      classScope: normalized.classScope,
      allowedScheduleScopes: normalized.allowedScheduleScopes,
    });
    return normalized;
  } catch {
    upsertAttendanceScopePolicyRecord({
      courseId: input.courseId,
      classScope: fallbackWorkspace.classScope,
      allowedScheduleScopes: normalizedScopes,
    });

    return {
      ...fallbackWorkspace,
      allowedScheduleScopes: normalizedScopes,
    };
  }
}

async function buildFallbackAdminCourseWorkspace(): Promise<AdminCourseWorkspaceData> {
  const catalog = await fetchCourseCatalog();
  const submissionDatabase = createInitialSubmissionDatabase();

  const seedCourses = buildSeedCourses(catalog);
  const seedUsers = buildSeedUsers({
    catalog,
    submissionDatabase,
  });
  const seedBindings = buildSeedMemberBindings({
    courses: seedCourses,
    users: seedUsers,
    catalog,
    submissionDatabase,
  });

  const deletedCourseIds = readDeletedCourseIdsFromStorage();
  const mergedCourses = mergeCourseList(seedCourses, readCustomCoursesFromStorage()).filter(
    (course) => !deletedCourseIds.includes(course.courseId),
  );
  const mergedUsers = seedUsers;
  const mergedBindings = mergeBindingList(
    seedBindings,
    readStoredCourseMemberBindings(),
  ).filter(
    (binding) =>
      mergedCourses.some((course) => course.courseId === binding.courseId) &&
      mergedUsers.some((user) => user.userId === binding.userId),
  );

  writeStoredCourseMemberBindings(mergedBindings);

  return {
    courses: mergedCourses,
    users: mergedUsers,
    memberBindings: mergedBindings,
  };
}

async function buildFallbackAdminScheduleWorkspace(): Promise<AdminScheduleWorkspaceData> {
  const courseWorkspace = await fetchAdminCourseWorkspace();
  const systemSchedules = studentAttendanceProfile.schedules.map((event) =>
    toAdminScheduleEvent(event, "SYSTEM"),
  );
  const customSchedules = readStoredCustomAcademySchedules().map((event) =>
    toAdminScheduleEvent(event, "CUSTOM"),
  );
  const schedulesById = new Map<string, AdminScheduleEvent>();

  for (const schedule of systemSchedules) {
    schedulesById.set(schedule.id, schedule);
  }

  for (const schedule of customSchedules) {
    schedulesById.set(schedule.id, schedule);
  }

  const scopes = mergeScheduleScopes(
    buildScheduleScopes(courseWorkspace.courses),
    Array.from(schedulesById.values()),
  );

  return {
    schedules: Array.from(schedulesById.values()).sort((a, b) => sortScheduleByDateTime(a, b)),
    scopes,
  };
}

function mergeAdminCourseWorkspace(
  primary: AdminCourseWorkspaceData,
  fallback: AdminCourseWorkspaceData,
): AdminCourseWorkspaceData {
  const courses = mergeCourseList(fallback.courses, primary.courses);
  const users = mergeUserList(fallback.users, primary.users);
  const memberBindings = mergeBindingList(fallback.memberBindings, primary.memberBindings).filter(
    (binding) =>
      courses.some((course) => course.courseId === binding.courseId) &&
      users.some((user) => user.userId === binding.userId),
  );

  return {
    courses,
    users,
    memberBindings,
  };
}

function applyDeletedCourses(
  workspace: AdminCourseWorkspaceData,
  deletedCourseIds: string[],
): AdminCourseWorkspaceData {
  if (deletedCourseIds.length === 0) {
    return workspace;
  }

  const deletedSet = new Set(deletedCourseIds);
  const courses = workspace.courses.filter((course) => !deletedSet.has(course.courseId));
  const memberBindings = workspace.memberBindings.filter(
    (binding) => !deletedSet.has(binding.courseId),
  );

  return {
    courses,
    users: workspace.users,
    memberBindings,
  };
}

function mergeAdminScheduleWorkspace(
  primary: AdminScheduleWorkspaceData,
  fallback: AdminScheduleWorkspaceData,
): AdminScheduleWorkspaceData {
  const scopesByKey = new Map<string, AdminScheduleScopeRef>();

  for (const scope of fallback.scopes) {
    scopesByKey.set(`${scope.visibilityType}:${scope.visibilityScope}`, scope);
  }

  for (const scope of primary.scopes) {
    scopesByKey.set(`${scope.visibilityType}:${scope.visibilityScope}`, scope);
  }

  const schedulesById = new Map<string, AdminScheduleEvent>();

  for (const schedule of fallback.schedules) {
    schedulesById.set(schedule.id, schedule);
  }

  for (const schedule of primary.schedules) {
    schedulesById.set(schedule.id, schedule);
  }

  return {
    scopes: Array.from(scopesByKey.values()).sort((a, b) =>
      a.visibilityLabel.localeCompare(b.visibilityLabel, "ko"),
    ),
    schedules: Array.from(schedulesById.values()).sort((a, b) => sortScheduleByDateTime(a, b)),
  };
}

function buildSeedCourses(catalog: Awaited<ReturnType<typeof fetchCourseCatalog>>) {
  const courseSeeds = [catalog.featuredCourse, ...catalog.courses];

  return courseSeeds.map<AdminCourseWorkspaceCourse>((course, index) => {
    const status = course.enrollmentStatus === "PENDING" ? "PENDING" : "ACTIVE";
    const lifecycleDefaults = buildCourseLifecycleDefaults({ index, status });

    return {
      courseId: course.id,
      courseTitle: course.title,
      category: course.category,
      classScope: toClassScope(course.id, course.title),
      status,
      sectionLabel: lifecycleDefaults.sectionLabel,
      roomLabel: lifecycleDefaults.roomLabel,
      capacity: lifecycleDefaults.capacity,
      startDate: lifecycleDefaults.startDate,
      endDate: lifecycleDefaults.endDate,
      enrollmentStartDate: lifecycleDefaults.enrollmentStartDate,
      enrollmentEndDate: lifecycleDefaults.enrollmentEndDate,
      pacingType: lifecycleDefaults.pacingType,
    };
  });
}

function buildSeedUsers({
  catalog,
  submissionDatabase,
}: {
  catalog: Awaited<ReturnType<typeof fetchCourseCatalog>>;
  submissionDatabase: ReturnType<typeof createInitialSubmissionDatabase>;
}) {
  const usersById = new Map<string, AdminCourseWorkspaceUser>();
  const userIdByName = new Map<string, string>();

  const registerUser = (candidate: AdminCourseWorkspaceUser) => {
    const nameKey = normalizeNameKey(candidate.userName);
    const existingByNameId = userIdByName.get(nameKey);

    if (existingByNameId) {
      const existing = usersById.get(existingByNameId);

      if (existing) {
        usersById.set(existingByNameId, {
          ...existing,
          birthDate: existing.birthDate ?? candidate.birthDate,
          title: existing.title || candidate.title,
          defaultRole: existing.defaultRole,
        });
      }

      return existingByNameId;
    }

    usersById.set(candidate.userId, candidate);
    userIdByName.set(nameKey, candidate.userId);
    return candidate.userId;
  };

  const courseSeeds = [catalog.featuredCourse, ...catalog.courses];

  for (const course of courseSeeds) {
    const instructorId = buildInstructorId(course.instructor.name);

    registerUser({
      userId: instructorId,
      userName: course.instructor.name,
      birthDate: resolveFallbackBirthDate(instructorId, "INSTRUCTOR"),
      title: course.instructor.title || "Instructor",
      defaultRole: "INSTRUCTOR",
    });
  }

  for (const student of submissionDatabase.students) {
    registerUser({
      userId: student.id,
      userName: student.name,
      birthDate: resolveFallbackBirthDate(student.id, "STUDENT"),
      title: "수강생",
      defaultRole: "STUDENT",
    });
  }

  for (const submission of submissionDatabase.submissions) {
    for (const feedback of submission.feedbackHistory ?? []) {
      const role: AdminCourseMemberRole =
        feedback.reviewerId.includes("assistant") || feedback.reviewerName.includes("조교")
          ? "ASSISTANT"
          : "INSTRUCTOR";
      const fallbackId = role === "ASSISTANT"
        ? `assistant-${toSlug(feedback.reviewerName)}`
        : buildInstructorId(feedback.reviewerName);

      registerUser({
        userId: feedback.reviewerId || fallbackId,
        userName: feedback.reviewerName,
        birthDate: resolveFallbackBirthDate(feedback.reviewerId || fallbackId, role),
        title: role === "ASSISTANT" ? "Assistant" : "Instructor",
        defaultRole: role,
      });
    }
  }

  registerUser({
    userId: "assistant-dev-01",
    userName: "개발용 조교",
    birthDate: resolveFallbackBirthDate("assistant-dev-01", "ASSISTANT"),
    title: "Assistant",
    defaultRole: "ASSISTANT",
  });

  return Array.from(usersById.values()).sort((a, b) =>
    a.userName.localeCompare(b.userName, "ko"),
  );
}

function buildSeedMemberBindings({
  courses,
  users,
  catalog,
  submissionDatabase,
}: {
  courses: AdminCourseWorkspaceCourse[];
  users: AdminCourseWorkspaceUser[];
  catalog: Awaited<ReturnType<typeof fetchCourseCatalog>>;
  submissionDatabase: ReturnType<typeof createInitialSubmissionDatabase>;
}) {
  const bindings: AdminCourseMemberBinding[] = [];
  const validCourseIdSet = new Set(courses.map((course) => course.courseId));
  const validUserIdSet = new Set(users.map((user) => user.userId));
  const courseSeeds = [catalog.featuredCourse, ...catalog.courses];

  for (const course of courseSeeds) {
    const instructorId = buildInstructorId(course.instructor.name);

    if (validCourseIdSet.has(course.id) && validUserIdSet.has(instructorId)) {
      bindings.push({
        courseId: course.id,
        userId: instructorId,
        role: "INSTRUCTOR",
      });
    }
  }

  for (const student of submissionDatabase.students) {
    for (const courseId of student.enrolledCourseIds) {
      if (!validCourseIdSet.has(courseId) || !validUserIdSet.has(student.id)) {
        continue;
      }

      bindings.push({
        courseId,
        userId: student.id,
        role: "STUDENT",
      });
    }
  }

  return mergeBindingList([], bindings);
}

function buildScheduleScopes(courses: AdminCourseWorkspaceCourse[]): AdminScheduleScopeRef[] {
  const globalScope: AdminScheduleScopeRef = {
    visibilityType: "global",
    visibilityScope: "global",
    visibilityLabel: "학원 전체 행사",
  };

  const courseScopes = courses.map<AdminScheduleScopeRef>((course) => ({
    visibilityType: "class",
    visibilityScope: course.classScope,
    visibilityLabel: `${course.courseTitle} 수업`,
  }));

  return [globalScope, ...courseScopes].sort((a, b) =>
    a.visibilityLabel.localeCompare(b.visibilityLabel, "ko"),
  );
}

function mergeScheduleScopes(
  primaryScopes: AdminScheduleScopeRef[],
  schedules: AdminScheduleEvent[],
) {
  const scopeByKey = new Map<string, AdminScheduleScopeRef>();

  for (const scope of primaryScopes) {
    scopeByKey.set(`${scope.visibilityType}:${scope.visibilityScope}`, scope);
  }

  for (const schedule of schedules) {
    const key = `${schedule.visibilityType}:${schedule.visibilityScope}`;

    if (!scopeByKey.has(key)) {
      scopeByKey.set(key, {
        visibilityType: schedule.visibilityType,
        visibilityScope: schedule.visibilityScope,
        visibilityLabel: schedule.visibilityLabel,
      });
    }
  }

  return Array.from(scopeByKey.values()).sort((a, b) =>
    a.visibilityLabel.localeCompare(b.visibilityLabel, "ko"),
  );
}

function buildFallbackCourseAuditEvents(courseId: string): AdminCourseAssignmentAuditEvent[] {
  const submissionDatabase = createInitialSubmissionDatabase();
  const assignmentById = new Map(
    submissionDatabase.assignments.map((assignment) => [assignment.id, assignment]),
  );
  const submissionById = new Map(
    submissionDatabase.submissions.map((submission) => [submission.id, submission]),
  );

  return submissionDatabase.timeline.flatMap<AdminCourseAssignmentAuditEvent>((event) => {
    if (!event.submissionId) {
      return [];
    }

    const submission = submissionById.get(event.submissionId);

    if (!submission || submission.courseId !== courseId) {
      return [];
    }

    const assignment = assignmentById.get(submission.assignmentId);
    const action = normalizeAdminCourseAuditAction(event.type);

    if (!action) {
      return [];
    }

    return [
      {
        id: `audit-${event.id}`,
        courseId,
        assignmentId: submission.assignmentId,
        assignmentTitle: assignment?.title ?? submission.assignmentTitle,
        submissionId: submission.id,
        actorId: event.actorId,
        actorName: event.actorName,
        actorRole: inferActorRoleById(event.actorId),
        action,
        occurredAt: event.createdAt,
        note: event.note,
      },
    ];
  });
}

async function buildFallbackAdminAttendanceScopeWorkspace(
  courseId: string,
): Promise<AdminAttendanceScopeWorkspaceData> {
  const [courseWorkspace, scheduleWorkspace] = await Promise.all([
    fetchAdminCourseWorkspace(),
    fetchAdminScheduleWorkspace(),
  ]);
  const course = courseWorkspace.courses.find((item) => item.courseId === courseId);

  if (!course) {
    throw new Error("COURSE_NOT_FOUND");
  }

  const availableScopes = mergeScheduleScopes(
    [
      {
        visibilityType: "global",
        visibilityScope: "global",
        visibilityLabel: "학원 전체 행사",
      },
      {
        visibilityType: "class",
        visibilityScope: course.classScope,
        visibilityLabel: `${course.courseTitle} 수업`,
      },
    ],
    scheduleWorkspace.schedules,
  );
  const storedPolicy = readAttendanceScopePolicyByCourseId(courseId);
  const allowedScheduleScopes = normalizeAllowedScheduleScopes({
    availableScopes,
    classScope: course.classScope,
    allowedScheduleScopes: storedPolicy?.allowedScheduleScopes ?? ["global", course.classScope],
  });

  return {
    courseId,
    courseTitle: course.courseTitle,
    classScope: course.classScope,
    availableScopes,
    allowedScheduleScopes,
  };
}

function normalizeAllowedScheduleScopes({
  availableScopes,
  classScope,
  allowedScheduleScopes,
}: {
  availableScopes: AdminScheduleScopeRef[];
  classScope: string;
  allowedScheduleScopes: string[];
}) {
  const availableScopeSet = new Set(availableScopes.map((scope) => scope.visibilityScope));
  const normalized = allowedScheduleScopes.filter((scope) => availableScopeSet.has(scope));

  if (!normalized.includes("global")) {
    normalized.unshift("global");
  }

  if (classScope && !normalized.includes(classScope)) {
    normalized.push(classScope);
  }

  return Array.from(new Set(normalized));
}

function inferActorRoleById(
  actorId: string,
): "ADMIN" | "INSTRUCTOR" | "ASSISTANT" | "STUDENT" {
  const normalized = actorId.toLowerCase();

  if (normalized.startsWith("admin-")) {
    return "ADMIN";
  }

  if (normalized.startsWith("assistant-") || normalized.includes("ta")) {
    return "ASSISTANT";
  }

  if (normalized.startsWith("student-")) {
    return "STUDENT";
  }

  return "INSTRUCTOR";
}

function normalizeAdminCourseWorkspace(data: unknown): AdminCourseWorkspaceData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const rawCourses = Array.isArray(raw.courses) ? raw.courses : null;
  const rawUsers = Array.isArray(raw.users) ? raw.users : null;
  const rawBindings = Array.isArray(raw.memberBindings)
    ? raw.memberBindings
    : Array.isArray(raw.courseMembers)
      ? raw.courseMembers
      : null;

  if (!rawCourses || !rawUsers || !rawBindings) {
    return null;
  }

  const courses = rawCourses
    .map((item) => normalizeAdminCourseWorkspaceCourse(item))
    .filter((item): item is AdminCourseWorkspaceCourse => Boolean(item));
  const users = rawUsers
    .map((item) => normalizeAdminCourseWorkspaceUser(item))
    .filter((item): item is AdminCourseWorkspaceUser => Boolean(item));
  const memberBindings = rawBindings
    .map((item) => normalizeAdminCourseMemberBinding(item))
    .filter((item): item is AdminCourseMemberBinding => Boolean(item));

  return {
    courses,
    users,
    memberBindings,
  };
}

function normalizeAdminCourseWorkspaceCourse(data: unknown): AdminCourseWorkspaceCourse | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const courseId =
    typeof raw.courseId === "string"
      ? raw.courseId
      : typeof raw.id === "string"
        ? raw.id
        : null;
  const courseTitle =
    typeof raw.courseTitle === "string"
      ? raw.courseTitle
      : typeof raw.title === "string"
        ? raw.title
        : null;

  if (!courseId || !courseTitle) {
    return null;
  }

  const status = normalizeCourseStatus(raw.status);
  const lifecycleDefaults = buildCourseLifecycleDefaults({ status });

  return {
    courseId,
    courseTitle,
    category: typeof raw.category === "string" ? raw.category : "기타",
    classScope:
      typeof raw.classScope === "string" && raw.classScope.length > 0
        ? raw.classScope
        : toClassScope(courseId, courseTitle),
    status,
    sectionLabel:
      typeof raw.sectionLabel === "string" && raw.sectionLabel.length > 0
        ? raw.sectionLabel
        : lifecycleDefaults.sectionLabel,
    roomLabel:
      typeof raw.roomLabel === "string" && raw.roomLabel.length > 0
        ? raw.roomLabel
        : lifecycleDefaults.roomLabel,
    capacity: normalizeCourseCapacity(raw.capacity, lifecycleDefaults.capacity),
    startDate: normalizeDateKey(raw.startDate, lifecycleDefaults.startDate),
    endDate: normalizeDateKey(raw.endDate, lifecycleDefaults.endDate),
    enrollmentStartDate: normalizeDateKey(
      raw.enrollmentStartDate,
      lifecycleDefaults.enrollmentStartDate,
    ),
    enrollmentEndDate: normalizeDateKey(raw.enrollmentEndDate, lifecycleDefaults.enrollmentEndDate),
    pacingType: normalizeCoursePacingType(raw.pacingType),
  };
}

function normalizeAdminCourseWorkspaceUser(data: unknown): AdminCourseWorkspaceUser | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const userId =
    typeof raw.userId === "string"
      ? raw.userId
      : typeof raw.id === "string"
        ? raw.id
        : null;
  const userName =
    typeof raw.userName === "string"
      ? raw.userName
      : typeof raw.name === "string"
        ? raw.name
        : null;

  if (!userId || !userName) {
    return null;
  }

  return {
    userId,
    userName,
    birthDate: normalizeBirthDate(raw.birthDate ?? raw.birthDateKey),
    title:
      typeof raw.title === "string" && raw.title.length > 0
        ? raw.title
        : resolveDefaultTitleByRole(normalizeCourseMemberRole(raw.defaultRole ?? raw.role)),
    defaultRole: normalizeCourseMemberRole(raw.defaultRole ?? raw.role),
  };
}

function normalizeAdminCourseMemberBinding(data: unknown): AdminCourseMemberBinding | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const courseId = typeof raw.courseId === "string" ? raw.courseId : null;
  const userId = typeof raw.userId === "string" ? raw.userId : null;

  if (!courseId || !userId) {
    return null;
  }

  return {
    courseId,
    userId,
    role: normalizeCourseMemberRole(raw.role),
  };
}

function normalizeAdminScheduleWorkspace(data: unknown): AdminScheduleWorkspaceData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const rawSchedules = Array.isArray(raw.schedules) ? raw.schedules : null;

  if (!rawSchedules) {
    return null;
  }

  const schedules = rawSchedules
    .map((item) => normalizeAdminScheduleEvent(item))
    .filter((item): item is AdminScheduleEvent => Boolean(item));
  const rawScopes = Array.isArray(raw.scopes) ? raw.scopes : [];
  const scopes = rawScopes
    .map((item) => normalizeAdminScheduleScopeRef(item))
    .filter((item): item is AdminScheduleScopeRef => Boolean(item));

  return {
    schedules,
    scopes,
  };
}

function normalizeAdminScheduleEvent(data: unknown): AdminScheduleEvent | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;

  if (
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.dateKey !== "string"
  ) {
    return null;
  }

  const visibilityType: ScheduleVisibilityType =
    raw.visibilityType === "global" || raw.visibilityType === "class"
      ? raw.visibilityType
      : "class";
  const visibilityScope =
    typeof raw.visibilityScope === "string" ? raw.visibilityScope : "global";

  const attendanceWindowEndAt =
    typeof raw.attendanceWindowEndAt === "string" ? raw.attendanceWindowEndAt : undefined;
  const attendanceWindowLabel =
    typeof raw.attendanceWindowLabel === "string"
      ? raw.attendanceWindowLabel
      : raw.requiresAttendanceCheck
        ? attendanceWindowEndAt
          ? `${formatWindowEndLabel(attendanceWindowEndAt)}까지 인증 가능`
          : "출석 인증 가능 시간 설정 필요"
        : undefined;

  return {
    id: raw.id,
    title: raw.title,
    categoryLabel: typeof raw.categoryLabel === "string" ? raw.categoryLabel : "운영",
    dateKey: raw.dateKey,
    dateLabel:
      typeof raw.dateLabel === "string" ? raw.dateLabel : buildDateLabelFromDateKey(raw.dateKey),
    timeLabel: typeof raw.timeLabel === "string" ? raw.timeLabel : "시간 미정",
    locationLabel: typeof raw.locationLabel === "string" ? raw.locationLabel : "장소 미정",
    visibilityType,
    visibilityScope,
    visibilityLabel:
      typeof raw.visibilityLabel === "string"
        ? raw.visibilityLabel
        : visibilityType === "global"
          ? "학원 전체 행사"
          : visibilityScope,
    requiresAttendanceCheck: Boolean(raw.requiresAttendanceCheck),
    attendanceWindowLabel,
    attendanceWindowStartAt:
      typeof raw.attendanceWindowStartAt === "string" ? raw.attendanceWindowStartAt : undefined,
    attendanceWindowEndAt,
    attendanceStatus:
      raw.attendanceStatus === "NOT_CHECKED_IN" ||
      raw.attendanceStatus === "CHECKED_IN" ||
      raw.attendanceStatus === "LATE" ||
      raw.attendanceStatus === "ABSENT"
        ? raw.attendanceStatus
        : undefined,
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : undefined,
    supportsCodeCheckIn: Boolean(raw.supportsCodeCheckIn),
    sourceType: raw.sourceType === "CUSTOM" ? "CUSTOM" : "SYSTEM",
  };
}

function normalizeAdminScheduleScopeRef(data: unknown): AdminScheduleScopeRef | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;

  if (
    (raw.visibilityType !== "global" && raw.visibilityType !== "class") ||
    typeof raw.visibilityScope !== "string"
  ) {
    return null;
  }

  return {
    visibilityType: raw.visibilityType,
    visibilityScope: raw.visibilityScope,
    visibilityLabel:
      typeof raw.visibilityLabel === "string"
        ? raw.visibilityLabel
        : raw.visibilityType === "global"
          ? "학원 전체 행사"
          : raw.visibilityScope,
  };
}

function normalizeAdminUserSearchResponse(data: unknown): AdminCourseWorkspaceUser[] | null {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => normalizeAdminCourseWorkspaceUser(item))
      .filter((item): item is AdminCourseWorkspaceUser => Boolean(item))
      .sort((a, b) => a.userName.localeCompare(b.userName, "ko"));
  }

  if (typeof data === "object") {
    const raw = data as Record<string, unknown>;
    const users = Array.isArray(raw.users) ? raw.users : null;

    if (!users) {
      return null;
    }

    return users
      .map((item) => normalizeAdminCourseWorkspaceUser(item))
      .filter((item): item is AdminCourseWorkspaceUser => Boolean(item))
      .sort((a, b) => a.userName.localeCompare(b.userName, "ko"));
  }

  return null;
}

function normalizeAdminCourseAssignmentAuditResponse(
  data: unknown,
): AdminCourseAssignmentAuditEvent[] | null {
  if (!data) {
    return null;
  }

  const rawItems = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : null;

  if (!rawItems) {
    return null;
  }

  return rawItems
    .map((item) => normalizeAdminCourseAssignmentAuditEvent(item))
    .filter((item): item is AdminCourseAssignmentAuditEvent => Boolean(item));
}

function normalizeAdminCourseAssignmentAuditEvent(
  data: unknown,
): AdminCourseAssignmentAuditEvent | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;

  if (
    typeof raw.id !== "string" ||
    typeof raw.courseId !== "string" ||
    typeof raw.assignmentId !== "string" ||
    typeof raw.assignmentTitle !== "string" ||
    typeof raw.actorId !== "string" ||
    typeof raw.actorName !== "string" ||
    typeof raw.occurredAt !== "string"
  ) {
    return null;
  }

  const action = normalizeAdminCourseAuditAction(raw.action);

  if (!action) {
    return null;
  }

  const actorRole =
    raw.actorRole === "ADMIN" ||
    raw.actorRole === "INSTRUCTOR" ||
    raw.actorRole === "ASSISTANT" ||
    raw.actorRole === "STUDENT"
      ? raw.actorRole
      : "INSTRUCTOR";

  return {
    id: raw.id,
    courseId: raw.courseId,
    assignmentId: raw.assignmentId,
    assignmentTitle: raw.assignmentTitle,
    submissionId: typeof raw.submissionId === "string" ? raw.submissionId : undefined,
    actorId: raw.actorId,
    actorName: raw.actorName,
    actorRole,
    action,
    occurredAt: raw.occurredAt,
    note: typeof raw.note === "string" ? raw.note : undefined,
  };
}

function normalizeAdminCourseAuditAction(value: unknown) {
  if (
    value === "SUBMITTED" ||
    value === "RESUBMITTED" ||
    value === "REVIEW_STATUS_CHANGED" ||
    value === "FEEDBACK_ADDED" ||
    value === "ASSIGNMENT_UPDATED" ||
    value === "TEMPLATE_UPDATED"
  ) {
    return value;
  }

  if (value === "COMMENTED") {
    return "FEEDBACK_ADDED";
  }

  if (value === "VIDEO_UPLOADED") {
    return "ASSIGNMENT_UPDATED";
  }

  return null;
}

function normalizeAdminAttendanceScopeWorkspace(
  data: unknown,
  fallback: AdminAttendanceScopeWorkspaceData,
): AdminAttendanceScopeWorkspaceData | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const allowedScheduleScopes = Array.isArray(raw.allowedScheduleScopes)
    ? raw.allowedScheduleScopes.filter((scope): scope is string => typeof scope === "string")
    : fallback.allowedScheduleScopes;
  const availableScopes = Array.isArray(raw.availableScopes)
    ? raw.availableScopes
      .map((scope) => normalizeAdminScheduleScopeRef(scope))
      .filter((scope): scope is AdminScheduleScopeRef => Boolean(scope))
    : fallback.availableScopes;

  const classScope =
    typeof raw.classScope === "string" && raw.classScope.length > 0
      ? raw.classScope
      : fallback.classScope;

  return {
    courseId:
      typeof raw.courseId === "string" && raw.courseId.length > 0 ? raw.courseId : fallback.courseId,
    courseTitle:
      typeof raw.courseTitle === "string" && raw.courseTitle.length > 0
        ? raw.courseTitle
        : fallback.courseTitle,
    classScope,
    availableScopes,
    allowedScheduleScopes: normalizeAllowedScheduleScopes({
      availableScopes,
      classScope,
      allowedScheduleScopes,
    }),
  };
}

async function assertStudentCapacityBeforeBinding(input: UpsertAdminCourseMemberBindingInput) {
  if (input.role !== "STUDENT") {
    return;
  }

  const workspace = await fetchAdminCourseWorkspace();
  const targetCourse = workspace.courses.find((course) => course.courseId === input.courseId);

  if (!targetCourse) {
    return;
  }

  const existingBinding = workspace.memberBindings.find(
    (binding) => binding.courseId === input.courseId && binding.userId === input.userId,
  );
  const currentStudentCount = workspace.memberBindings.filter(
    (binding) => binding.courseId === input.courseId && binding.role === "STUDENT",
  ).length;
  const nextStudentCount =
    existingBinding?.role === "STUDENT" ? currentStudentCount : currentStudentCount + 1;

  if (nextStudentCount > targetCourse.capacity) {
    throw new Error("COURSE_CAPACITY_EXCEEDED");
  }
}

function readCustomCoursesFromStorage() {
  if (typeof window === "undefined") {
    return [] as AdminCourseWorkspaceCourse[];
  }

  const raw = window.localStorage.getItem(ADMIN_CUSTOM_COURSE_STORAGE_KEY);

  if (!raw) {
    return [] as AdminCourseWorkspaceCourse[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];

    if (!Array.isArray(parsed)) {
      return [] as AdminCourseWorkspaceCourse[];
    }

    return parsed
      .map((item) => normalizeAdminCourseWorkspaceCourse(item))
      .filter((item): item is AdminCourseWorkspaceCourse => Boolean(item));
  } catch {
    return [] as AdminCourseWorkspaceCourse[];
  }
}

function readDeletedCourseIdsFromStorage() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(ADMIN_DELETED_COURSE_IDS_STORAGE_KEY);

  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];

    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [] as string[];
  }
}

function writeDeletedCourseIds(courseIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ADMIN_DELETED_COURSE_IDS_STORAGE_KEY,
    JSON.stringify(Array.from(new Set(courseIds))),
  );
}

function markCourseAsDeleted(courseId: string) {
  const existing = readDeletedCourseIdsFromStorage();
  writeDeletedCourseIds([...existing, courseId]);
}

function removeDeletedCourseId(courseId: string) {
  const existing = readDeletedCourseIdsFromStorage();
  writeDeletedCourseIds(existing.filter((id) => id !== courseId));
}

function writeCustomCourses(courses: AdminCourseWorkspaceCourse[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_CUSTOM_COURSE_STORAGE_KEY, JSON.stringify(courses));
}

function upsertCustomCourse(course: AdminCourseWorkspaceCourse) {
  const existing = readCustomCoursesFromStorage();
  const next = mergeCourseList(existing, [course]);
  writeCustomCourses(next);
}

function removeCustomCourse(courseId: string) {
  const existing = readCustomCoursesFromStorage();
  writeCustomCourses(existing.filter((course) => course.courseId !== courseId));
}

function readStoredCourseMemberBindings() {
  if (typeof window === "undefined") {
    return [] as AdminCourseMemberBinding[];
  }

  const raw = window.localStorage.getItem(ADMIN_COURSE_MEMBER_BINDING_STORAGE_KEY);

  if (!raw) {
    return [] as AdminCourseMemberBinding[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];

    if (!Array.isArray(parsed)) {
      return [] as AdminCourseMemberBinding[];
    }

    return parsed
      .map((item) => normalizeAdminCourseMemberBinding(item))
      .filter((item): item is AdminCourseMemberBinding => Boolean(item));
  } catch {
    return [] as AdminCourseMemberBinding[];
  }
}

function writeStoredCourseMemberBindings(bindings: AdminCourseMemberBinding[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_COURSE_MEMBER_BINDING_STORAGE_KEY, JSON.stringify(bindings));
}

function upsertCourseMemberBinding(binding: AdminCourseMemberBinding) {
  const existing = readStoredCourseMemberBindings();
  const next = mergeBindingList(existing, [binding]);
  writeStoredCourseMemberBindings(next);
}

function removeCourseMemberBinding(courseId: string, userId: string) {
  const existing = readStoredCourseMemberBindings();
  const next = existing.filter(
    (item) => !(item.courseId === courseId && item.userId === userId),
  );
  writeStoredCourseMemberBindings(next);
}

function removeCourseMemberBindingsByCourseId(courseId: string) {
  const existing = readStoredCourseMemberBindings();
  const next = existing.filter((item) => item.courseId !== courseId);
  writeStoredCourseMemberBindings(next);
}

function mergeCourseList(
  base: AdminCourseWorkspaceCourse[],
  overrides: AdminCourseWorkspaceCourse[],
) {
  const merged = new Map<string, AdminCourseWorkspaceCourse>();

  for (const item of base) {
    merged.set(item.courseId, item);
  }

  for (const item of overrides) {
    merged.set(item.courseId, item);
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.courseTitle.localeCompare(b.courseTitle, "ko"),
  );
}

function mergeUserList(base: AdminCourseWorkspaceUser[], overrides: AdminCourseWorkspaceUser[]) {
  const merged = new Map<string, AdminCourseWorkspaceUser>();

  for (const item of base) {
    merged.set(item.userId, item);
  }

  for (const item of overrides) {
    merged.set(item.userId, item);
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.userName.localeCompare(b.userName, "ko"),
  );
}

function mergeBindingList(base: AdminCourseMemberBinding[], overrides: AdminCourseMemberBinding[]) {
  const merged = new Map<string, AdminCourseMemberBinding>();

  for (const item of base) {
    merged.set(`${item.courseId}:${item.userId}`, item);
  }

  for (const item of overrides) {
    merged.set(`${item.courseId}:${item.userId}`, item);
  }

  return Array.from(merged.values());
}

function normalizeCourseMemberRole(value: unknown): AdminCourseMemberRole {
  if (value === "INSTRUCTOR" || value === "ASSISTANT" || value === "STUDENT") {
    return value;
  }

  if (value === "instructor") {
    return "INSTRUCTOR";
  }

  if (value === "assistant") {
    return "ASSISTANT";
  }

  return "STUDENT";
}

function normalizeCourseStatus(value: unknown): AdminCourseStatus {
  if (value === "PENDING") {
    return "PENDING";
  }

  return "ACTIVE";
}

function normalizeCoursePacingType(value: unknown): AdminCoursePacingType {
  if (value === "SELF_PACED") {
    return "SELF_PACED";
  }

  return "INSTRUCTOR_PACED";
}

function normalizeCourseCapacity(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === "string") {
    const numeric = Number(value);

    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.floor(numeric);
    }
  }

  return fallback;
}

function normalizeDateKey(value: unknown, fallback: string) {
  if (typeof value !== "string" || value.length === 0) {
    return fallback;
  }

  const normalized = normalizeDateLikeString(value);
  if (!normalized) {
    return fallback;
  }

  return normalized;
}

function resolveDefaultTitleByRole(role: AdminCourseMemberRole) {
  if (role === "INSTRUCTOR") {
    return "Instructor";
  }

  if (role === "ASSISTANT") {
    return "Assistant";
  }

  return "Student";
}

function normalizeBirthDate(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  return normalizeDateLikeString(value);
}

function resolveFallbackBirthDate(userId: string, role: AdminCourseMemberRole) {
  if (role !== "STUDENT") {
    return undefined;
  }

  let hash = 0;

  for (const char of userId) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10_000;
  }

  const year = 1997 + (hash % 8);
  const month = (Math.floor(hash / 8) % 12) + 1;
  const day = (Math.floor(hash / 97) % 28) + 1;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function buildCourseLifecycleDefaults({
  index = 0,
  status,
}: {
  index?: number;
  status: AdminCourseStatus;
}) {
  const today = new Date();
  const startDate = addDays(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    status === "PENDING" ? 14 + index * 7 : index * 7,
  );
  const endDate = addDays(startDate, 83);
  const enrollmentStartDate = addDays(startDate, -21);
  const enrollmentEndDate = addDays(startDate, 7);

  return {
    sectionLabel: `${index + 1}반`,
    roomLabel: "8층 AI 강의실",
    capacity: 30,
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(endDate),
    enrollmentStartDate: formatDateKey(enrollmentStartDate),
    enrollmentEndDate: formatDateKey(enrollmentEndDate),
    pacingType: "INSTRUCTOR_PACED" as const,
  };
}

function toAdminScheduleEvent(
  event: StudentScheduleEvent,
  sourceType: AdminScheduleEvent["sourceType"],
): AdminScheduleEvent {
  return {
    ...event,
    sourceType,
  };
}

function toStudentScheduleEvent(event: AdminScheduleEvent): StudentScheduleEvent {
  const { sourceType, ...schedule } = event;
  void sourceType;
  return schedule;
}

function sortScheduleByDateTime(a: AdminScheduleEvent, b: AdminScheduleEvent) {
  if (a.dateKey === b.dateKey) {
    return a.timeLabel.localeCompare(b.timeLabel, "ko");
  }

  return a.dateKey.localeCompare(b.dateKey, "ko");
}

function toClassScope(courseId: string, courseTitle: string) {
  const normalized = toSlug(courseTitle);
  return normalized ? normalized : toSlug(courseId) || "academy-default-class";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildInstructorId(name: string) {
  const normalized = toSlug(name);
  return `instructor-${normalized || "unknown"}`;
}

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-");
}

function normalizeDateLikeString(value: string) {
  const trimmed = value.trim();
  const prefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);

  if (prefixMatch) {
    return isValidDateKey(prefixMatch[1]) ? prefixMatch[1] : undefined;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return formatDateKey(date);
}

function isValidDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

function normalizeNameKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildDateLabelFromDateKey(dateKey: string) {
  const date = new Date(dateKey);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date);

  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
}

function formatWindowEndLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "인증 종료 시각";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
