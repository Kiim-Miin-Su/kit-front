import type { StudentScheduleEvent } from "@/types/attendance";

const ADMIN_CUSTOM_SCHEDULE_STORAGE_KEY = "ai-edu-admin-custom-schedules-v1";

export function readStoredCustomAcademySchedules(): StudentScheduleEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(ADMIN_CUSTOM_SCHEDULE_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeStoredSchedule(item))
      .filter((item): item is StudentScheduleEvent => Boolean(item))
      .sort((a, b) => sortScheduleByDateTime(a, b));
  } catch {
    return [];
  }
}

export function upsertStoredCustomAcademySchedule(schedule: StudentScheduleEvent) {
  const existing = readStoredCustomAcademySchedules();
  const next = [...existing.filter((item) => item.id !== schedule.id), schedule].sort((a, b) =>
    sortScheduleByDateTime(a, b),
  );

  writeStoredCustomAcademySchedules(next);
}

export function removeStoredCustomAcademySchedule(scheduleId: string) {
  const existing = readStoredCustomAcademySchedules();
  const filtered = existing.filter((item) => item.id !== scheduleId);
  writeStoredCustomAcademySchedules(filtered);
}

function writeStoredCustomAcademySchedules(schedules: StudentScheduleEvent[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_CUSTOM_SCHEDULE_STORAGE_KEY, JSON.stringify(schedules));
}

function normalizeStoredSchedule(data: unknown): StudentScheduleEvent | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;

  if (typeof raw.id !== "string" || typeof raw.title !== "string" || typeof raw.dateKey !== "string") {
    return null;
  }

  const visibilityType = raw.visibilityType === "global" || raw.visibilityType === "class"
    ? raw.visibilityType
    : "class";
  const visibilityScope =
    typeof raw.visibilityScope === "string" && raw.visibilityScope.length > 0
      ? raw.visibilityScope
      : visibilityType === "global"
        ? "global"
        : "academy-default-class";

  return {
    id: raw.id,
    title: raw.title,
    categoryLabel: typeof raw.categoryLabel === "string" ? raw.categoryLabel : "운영",
    dateKey: raw.dateKey,
    dateLabel:
      typeof raw.dateLabel === "string" && raw.dateLabel.length > 0
        ? raw.dateLabel
        : buildDateLabelFromDateKey(raw.dateKey),
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
    attendanceStatus:
      raw.attendanceStatus === "NOT_CHECKED_IN" ||
      raw.attendanceStatus === "CHECKED_IN" ||
      raw.attendanceStatus === "LATE" ||
      raw.attendanceStatus === "ABSENT"
        ? raw.attendanceStatus
        : undefined,
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : undefined,
    supportsCodeCheckIn: Boolean(raw.supportsCodeCheckIn),
  };
}

function buildDateLabelFromDateKey(dateKey: string) {
  const date = new Date(dateKey);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(date);

  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${weekday}`;
}

function sortScheduleByDateTime(a: StudentScheduleEvent, b: StudentScheduleEvent) {
  if (a.dateKey === b.dateKey) {
    return a.timeLabel.localeCompare(b.timeLabel, "ko");
  }

  return a.dateKey.localeCompare(b.dateKey, "ko");
}
