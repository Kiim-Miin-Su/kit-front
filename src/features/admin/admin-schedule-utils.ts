import type { CreateAdminScheduleInput } from "@/types/admin";

export type AdminScheduleRepeatPattern = "NONE" | "DAILY" | "WEEKLY";

export function clampRepeatCount(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(24, Math.max(1, Math.floor(value)));
}

export function buildRepeatedSchedulePayloads({
  payload,
  repeatPattern,
  repeatCount,
}: {
  payload: CreateAdminScheduleInput;
  repeatPattern: AdminScheduleRepeatPattern;
  repeatCount: number;
}): CreateAdminScheduleInput[] {
  const resolvedCount = repeatPattern === "NONE" ? 1 : clampRepeatCount(repeatCount);
  const dayOffset = repeatPattern === "WEEKLY" ? 7 : 1;

  return Array.from({ length: resolvedCount }, (_, index) => {
    const shiftDays = index * dayOffset;

    return {
      ...payload,
      dateKey: shiftDateKey(payload.dateKey, shiftDays),
      attendanceWindowStartAt: shiftDateTimeLocal(payload.attendanceWindowStartAt, shiftDays),
      attendanceWindowEndAt: shiftDateTimeLocal(payload.attendanceWindowEndAt, shiftDays),
    };
  });
}

export function validateAdminScheduleInput(input: CreateAdminScheduleInput): string | null {
  if (!input.title.trim() || !input.timeLabel.trim() || !input.locationLabel.trim()) {
    return "제목, 시간, 장소를 입력하세요.";
  }

  if (!isValidDateKey(input.dateKey)) {
    return "일정 날짜는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.";
  }

  if (input.visibilityType === "global" && input.visibilityScope !== "global") {
    return "학원 전체 일정은 visibilityScope가 global이어야 합니다.";
  }

  if (input.requiresAttendanceCheck && !input.attendanceWindowEndAt) {
    return "출석 체크 일정은 인증 종료 시각이 필요합니다.";
  }

  if (input.attendanceWindowStartAt && !isValidDateTimeLocal(input.attendanceWindowStartAt)) {
    return "출석 시작 시각 형식이 올바르지 않습니다.";
  }

  if (input.attendanceWindowEndAt && !isValidDateTimeLocal(input.attendanceWindowEndAt)) {
    return "출석 종료 시각 형식이 올바르지 않습니다.";
  }

  if (input.attendanceWindowStartAt && input.attendanceWindowEndAt) {
    const start = parseDateTimeLocal(input.attendanceWindowStartAt);
    const end = parseDateTimeLocal(input.attendanceWindowEndAt);

    if (start && end && start.getTime() > end.getTime()) {
      return "출석 시작 시각은 종료 시각보다 늦을 수 없습니다.";
    }
  }

  return null;
}

function shiftDateKey(dateKey: string, shiftDays: number) {
  if (shiftDays === 0) {
    return dateKey;
  }

  const parsed = parseDateKey(dateKey);

  if (!parsed) {
    return dateKey;
  }

  parsed.setDate(parsed.getDate() + shiftDays);

  return formatDateKey(parsed);
}

function shiftDateTimeLocal(dateTime: string | undefined, shiftDays: number) {
  if (!dateTime) {
    return undefined;
  }

  if (shiftDays === 0) {
    return dateTime;
  }

  const parsed = parseDateTimeLocal(dateTime);

  if (!parsed) {
    return dateTime;
  }

  parsed.setDate(parsed.getDate() + shiftDays);

  return formatDateTimeLocal(parsed);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function isValidDateKey(value: string) {
  return Boolean(parseDateKey(value));
}

function parseDateKey(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function isValidDateTimeLocal(value: string) {
  return Boolean(parseDateTimeLocal(value));
}

function parseDateTimeLocal(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute
  ) {
    return null;
  }

  return parsed;
}
