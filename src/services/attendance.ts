import axios from "axios";

import {
  studentAttendanceProfile,
  submitAttendanceCodeCheckIn,
} from "@/features/attendance/mock-attendance-data";
import {
  buildEffectiveAllowedScheduleScopes,
  isScheduleVisibleForScopes,
} from "@/features/attendance/attendance-schedule-visibility";
import { api } from "@/services/api";
import { readAttendanceScopePolicyByClassScope } from "@/services/attendance-scope-policy-storage";
import { readStoredCustomAcademySchedules } from "@/services/attendance-schedule-storage";
import type {
  AttendanceCheckInError,
  AttendanceCheckInResult,
  AttendanceRuntimeState,
  AttendanceStatus,
  CalendarHoliday,
  HolidaySourceType,
  StudentAttendanceProfile,
  StudentScheduleEvent,
} from "@/types/attendance";

export async function fetchStudentAttendanceWorkspace(): Promise<StudentAttendanceProfile> {
  try {
    const { data } = await api.get<unknown>("/me/attendance/workspace");
    const normalized = normalizeAttendanceWorkspaceResponse(data);

    if (normalized) {
      return mergeCustomSchedulesToAttendanceProfile(normalized);
    }

    throw new Error("INVALID_ATTENDANCE_WORKSPACE_RESPONSE");
  } catch {
    return mergeCustomSchedulesToAttendanceProfile(studentAttendanceProfile);
  }
}

export async function submitStudentAttendanceCheckIn({
  profile,
  scheduleId,
  code,
  runtimeState = {},
}: {
  profile: StudentAttendanceProfile;
  scheduleId: string;
  code: string;
  runtimeState?: AttendanceRuntimeState;
}): Promise<AttendanceCheckInResult> {
  try {
    const { data } = await api.post<unknown>("/attendance/check-in", {
      scheduleId,
      code,
    });
    const normalized = normalizeAttendanceCheckInResponse(data, scheduleId);

    if (normalized) {
      return normalized;
    }

    throw createAttendanceCheckInError("INVALID_CODE", "출석 인증 응답 형식이 올바르지 않습니다.");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      if (status === 400 || status === 401 || status === 403 || status === 409 || status === 422) {
        throw mapAxiosErrorToAttendanceCheckInError(error);
      }
    }

    return submitAttendanceCodeCheckIn({
      profile,
      scheduleId,
      code,
      runtimeState,
    });
  }
}

export async function fetchCalendarHolidays({
  year,
  month,
}: {
  year: number;
  month: number;
}): Promise<CalendarHoliday[]> {
  const fallbackCustom = readCustomHolidaysFromStorage().filter((holiday) =>
    isSameYearMonth(holiday.dateKey, year, month),
  );

  try {
    const { data } = await api.get<unknown>("/calendar/holidays", {
      params: {
        country: "KR",
        year,
        month,
      },
    });
    const normalized = normalizeCalendarHolidaysResponse(data);

    if (!normalized) {
      throw new Error("INVALID_HOLIDAY_RESPONSE");
    }

    return mergeHolidays(normalized, fallbackCustom);
  } catch {
    return fallbackCustom;
  }
}

export async function createCustomHoliday({
  dateKey,
  name,
}: {
  dateKey: string;
  name: string;
}): Promise<CalendarHoliday> {
  try {
    const { data } = await api.post<unknown>("/admin/calendar/holidays", {
      dateKey,
      name,
      sourceType: "CUSTOM",
    });
    const normalized = normalizeSingleCalendarHoliday(data);

    if (!normalized) {
      throw new Error("INVALID_CREATED_HOLIDAY");
    }

    upsertCustomHolidayToStorage(normalized);
    return normalized;
  } catch {
    const created: CalendarHoliday = {
      id: `custom-${dateKey}-${Date.now()}`,
      dateKey,
      name,
      sourceType: "CUSTOM",
    };
    upsertCustomHolidayToStorage(created);
    return created;
  }
}

export async function deleteCustomHoliday(holidayId: string) {
  try {
    await api.delete(`/admin/calendar/holidays/${holidayId}`);
  } catch {
    // no-op, local fallback still applies
  }

  removeCustomHolidayFromStorage(holidayId);
}

function normalizeAttendanceWorkspaceResponse(data: unknown): StudentAttendanceProfile | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const rawSchedules = Array.isArray(raw.schedules) ? raw.schedules : null;

  if (!rawSchedules) {
    return null;
  }

  const schedules = rawSchedules
    .map((item) => normalizeStudentSchedule(item))
    .filter((schedule): schedule is StudentScheduleEvent => Boolean(schedule));
  const rawAllowedScheduleScopes = Array.isArray(raw.allowedScheduleScopes)
    ? raw.allowedScheduleScopes.filter((scope): scope is string => typeof scope === "string")
    : Array.from(new Set(schedules.map((schedule) => schedule.visibilityScope)));
  const classScope =
    typeof raw.classScope === "string" ? raw.classScope : studentAttendanceProfile.classScope;
  const allowedScheduleScopes = buildEffectiveAllowedScheduleScopes({
    allowedScheduleScopes: rawAllowedScheduleScopes,
    classScope,
  });
  const allowedScheduleLabels = Array.from(
    new Set(
      schedules
        .filter((schedule) =>
          isScheduleVisibleForScopes({
            schedule,
            allowedScheduleScopes,
          }),
        )
        .map((schedule) =>
          schedule.visibilityType === "global" ? "학원 전체 행사" : schedule.visibilityLabel,
        ),
    ),
  );

  return {
    programName:
      typeof raw.programName === "string" ? raw.programName : studentAttendanceProfile.programName,
    className: typeof raw.className === "string" ? raw.className : studentAttendanceProfile.className,
    classScope,
    allowedScheduleScopes,
    allowedScheduleLabels:
      allowedScheduleLabels.length > 0
        ? allowedScheduleLabels
        : studentAttendanceProfile.allowedScheduleLabels,
    expectedCodeLength:
      typeof raw.expectedCodeLength === "number"
        ? raw.expectedCodeLength
        : studentAttendanceProfile.expectedCodeLength,
    schedules,
  };
}

function normalizeCalendarHolidaysResponse(data: unknown): CalendarHoliday[] | null {
  if (!data) {
    return null;
  }

  if (Array.isArray(data)) {
    return data
      .map((item) => normalizeSingleCalendarHoliday(item))
      .filter((holiday): holiday is CalendarHoliday => Boolean(holiday));
  }

  if (typeof data === "object" && data !== null) {
    const raw = data as Record<string, unknown>;

    if (Array.isArray(raw.items)) {
      return raw.items
        .map((item) => normalizeSingleCalendarHoliday(item))
        .filter((holiday): holiday is CalendarHoliday => Boolean(holiday));
    }

    if (Array.isArray(raw.holidays)) {
      return raw.holidays
        .map((item) => normalizeSingleCalendarHoliday(item))
        .filter((holiday): holiday is CalendarHoliday => Boolean(holiday));
    }
  }

  return null;
}

function normalizeSingleCalendarHoliday(data: unknown): CalendarHoliday | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const dateKey = typeof raw.dateKey === "string" ? raw.dateKey : null;
  const name = typeof raw.name === "string" ? raw.name : null;

  if (!dateKey || !name) {
    return null;
  }

  const sourceType = normalizeHolidaySourceType(raw.sourceType);

  return {
    id:
      typeof raw.id === "string" && raw.id.length > 0
        ? raw.id
        : `${sourceType.toLowerCase()}-${dateKey}-${name}`,
    dateKey,
    name,
    sourceType,
  };
}

function normalizeStudentSchedule(item: unknown): StudentScheduleEvent | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const raw = item as Record<string, unknown>;

  if (typeof raw.id !== "string" || typeof raw.title !== "string") {
    return null;
  }

  const visibilityScope =
    typeof raw.visibilityScope === "string" ? raw.visibilityScope : "global";
  const visibilityType =
    raw.visibilityType === "class" || raw.visibilityType === "global"
      ? raw.visibilityType
      : visibilityScope === "global"
        ? "global"
        : "class";
  const normalizedStatus = normalizeAttendanceStatus(raw.attendanceStatus);
  const dateKey = typeof raw.dateKey === "string" ? raw.dateKey : "";
  const dateLabel =
    typeof raw.dateLabel === "string"
      ? raw.dateLabel
      : dateKey
        ? buildDateLabelFromDateKey(dateKey)
        : "일정 날짜";

  return {
    id: raw.id,
    title: raw.title,
    categoryLabel: typeof raw.categoryLabel === "string" ? raw.categoryLabel : "운영",
    dateKey,
    dateLabel,
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
    attendanceWindowLabel:
      typeof raw.attendanceWindowLabel === "string" ? raw.attendanceWindowLabel : undefined,
    attendanceWindowStartAt:
      typeof raw.attendanceWindowStartAt === "string" ? raw.attendanceWindowStartAt : undefined,
    attendanceWindowEndAt:
      typeof raw.attendanceWindowEndAt === "string" ? raw.attendanceWindowEndAt : undefined,
    attendanceStatus: normalizedStatus,
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : undefined,
    supportsCodeCheckIn: Boolean(raw.supportsCodeCheckIn),
  };
}

function normalizeAttendanceCheckInResponse(
  data: unknown,
  fallbackScheduleId: string,
): AttendanceCheckInResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;
  const status = normalizeAttendanceStatus(raw.attendanceStatus);

  if (!status) {
    return null;
  }

  return {
    scheduleId:
      typeof raw.scheduleId === "string" && raw.scheduleId.length > 0
        ? raw.scheduleId
        : fallbackScheduleId,
    attendanceStatus: status,
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : new Date().toISOString(),
    isLate: typeof raw.isLate === "boolean" ? raw.isLate : status === "LATE",
  };
}

function normalizeAttendanceStatus(value: unknown): AttendanceStatus | undefined {
  if (
    value === "NOT_CHECKED_IN" ||
    value === "CHECKED_IN" ||
    value === "LATE" ||
    value === "ABSENT"
  ) {
    return value;
  }

  return undefined;
}

function normalizeHolidaySourceType(value: unknown): HolidaySourceType {
  return value === "CUSTOM" ? "CUSTOM" : "NATIONAL";
}

function mapAxiosErrorToAttendanceCheckInError(error: unknown): AttendanceCheckInError {
  if (!axios.isAxiosError(error)) {
    return createAttendanceCheckInError("INVALID_CODE", "출석 인증 요청 중 오류가 발생했습니다.");
  }

  const data = error.response?.data as { message?: string; code?: string } | undefined;
  const message = typeof data?.message === "string" ? data.message : "출석 인증에 실패했습니다.";
  const code = mapErrorCode(data?.code);

  return createAttendanceCheckInError(code, message);
}

function mapErrorCode(rawCode: unknown): AttendanceCheckInError["code"] {
  if (
    rawCode === "SCHEDULE_NOT_FOUND" ||
    rawCode === "NOT_REQUIRED" ||
    rawCode === "UNSUPPORTED" ||
    rawCode === "OUTSIDE_ATTENDANCE_WINDOW" ||
    rawCode === "INVALID_CODE_LENGTH" ||
    rawCode === "INVALID_CODE" ||
    rawCode === "ALREADY_CHECKED_IN" ||
    rawCode === "ALREADY_ABSENT"
  ) {
    return rawCode;
  }

  return "INVALID_CODE";
}

function createAttendanceCheckInError(code: AttendanceCheckInError["code"], message: string) {
  return {
    code,
    message,
  } satisfies AttendanceCheckInError;
}

function buildDateLabelFromDateKey(dateKey: string) {
  const date = new Date(dateKey);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date);

  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
}

function mergeHolidays(primary: CalendarHoliday[], custom: CalendarHoliday[]) {
  const mergedByDate = new Map<string, CalendarHoliday>();

  for (const holiday of primary) {
    mergedByDate.set(holiday.dateKey, holiday);
  }

  for (const holiday of custom) {
    mergedByDate.set(holiday.dateKey, holiday);
  }

  return Array.from(mergedByDate.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function mergeCustomSchedulesToAttendanceProfile(
  profile: StudentAttendanceProfile,
): StudentAttendanceProfile {
  const persistedPolicy = readAttendanceScopePolicyByClassScope(profile.classScope);
  const customSchedules = readStoredCustomAcademySchedules();

  const effectiveAllowedScopes = buildEffectiveAllowedScheduleScopes({
    allowedScheduleScopes: persistedPolicy?.allowedScheduleScopes ?? profile.allowedScheduleScopes,
    classScope: profile.classScope,
  });

  const mergedById = new Map<string, StudentScheduleEvent>();

  for (const schedule of profile.schedules) {
    mergedById.set(schedule.id, schedule);
  }

  for (const schedule of customSchedules) {
    if (
      !isScheduleVisibleForScopes({
        schedule,
        allowedScheduleScopes: effectiveAllowedScopes,
      })
    ) {
      continue;
    }

    mergedById.set(schedule.id, schedule);
  }

  const schedules = Array.from(mergedById.values()).sort((a, b) => {
    if (a.dateKey === b.dateKey) {
      return a.timeLabel.localeCompare(b.timeLabel, "ko");
    }

    return a.dateKey.localeCompare(b.dateKey, "ko");
  });
  const allowedScheduleLabels = Array.from(
    new Set(
      schedules
        .filter((schedule) =>
          isScheduleVisibleForScopes({
            schedule,
            allowedScheduleScopes: effectiveAllowedScopes,
          }),
        )
        .map((schedule) =>
          schedule.visibilityType === "global" ? "학원 전체 행사" : schedule.visibilityLabel,
        ),
    ),
  );

  return {
    ...profile,
    allowedScheduleScopes: effectiveAllowedScopes,
    schedules,
    allowedScheduleLabels:
      allowedScheduleLabels.length > 0 ? allowedScheduleLabels : profile.allowedScheduleLabels,
  };
}

function isSameYearMonth(dateKey: string, year: number, month: number) {
  const date = new Date(dateKey);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

const CUSTOM_HOLIDAY_STORAGE_KEY = "attendance-custom-holidays";

function readCustomHolidaysFromStorage(): CalendarHoliday[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(CUSTOM_HOLIDAY_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeSingleCalendarHoliday(item))
      .filter((holiday): holiday is CalendarHoliday => Boolean(holiday));
  } catch {
    return [];
  }
}

function writeCustomHolidaysToStorage(holidays: CalendarHoliday[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CUSTOM_HOLIDAY_STORAGE_KEY, JSON.stringify(holidays));
}

function upsertCustomHolidayToStorage(holiday: CalendarHoliday) {
  const existing = readCustomHolidaysFromStorage();
  const withoutCurrent = existing.filter((item) => item.id !== holiday.id && item.dateKey !== holiday.dateKey);

  writeCustomHolidaysToStorage([...withoutCurrent, holiday]);
}

function removeCustomHolidayFromStorage(holidayId: string) {
  const existing = readCustomHolidaysFromStorage();
  const filtered = existing.filter((item) => item.id !== holidayId);

  writeCustomHolidaysToStorage(filtered);
}
