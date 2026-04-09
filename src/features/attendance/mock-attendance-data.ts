import { resolveScheduleCheckInAvailability } from "@/features/attendance/attendance-check-in-availability";
import {
  buildEffectiveAllowedScheduleScopes,
  isScheduleVisibleForScopes,
} from "@/features/attendance/attendance-schedule-visibility";
import type {
  AttendanceCheckInError,
  AttendanceCheckInResult,
  AttendanceRuntimeState,
  AttendanceOverview,
  StudentAttendanceProfile,
  StudentScheduleEvent,
} from "@/types/attendance";

export const studentAttendanceProfile: StudentAttendanceProfile = {
  programName: "AI 서비스 개발자 국비지원 과정",
  className: "AI Product Engineering 3기",
  classScope: "ai-product-engineering-3",
  allowedScheduleScopes: ["global", "ai-product-engineering-3"],
  allowedScheduleLabels: ["학원 전체 행사", "AI Product Engineering 3기 수업"],
  expectedCodeLength: 6,
  schedules: [
    {
      id: "orientation-week-2",
      title: "오리엔테이션 및 학습 가이드",
      categoryLabel: "운영",
      dateKey: "2026-04-08",
      dateLabel: "4월 8일 수요일",
      timeLabel: "09:30 - 11:00",
      locationLabel: "온라인 라이브 · Zoom A",
      visibilityType: "global",
      visibilityScope: "global",
      visibilityLabel: "학원 전체 행사",
      requiresAttendanceCheck: false,
    },
    {
      id: "attendance-morning-1",
      title: "오전 출석 체크",
      categoryLabel: "필수 출석",
      dateKey: "2026-04-08",
      dateLabel: "4월 8일 수요일",
      timeLabel: "09:00 - 09:20",
      locationLabel: "8층 AI 강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: true,
      attendanceWindowLabel: "09:20까지 인증 가능",
      attendanceWindowStartAt: "2026-04-08T09:00:00+09:00",
      attendanceWindowEndAt: "2026-04-08T09:20:00+09:00",
      attendanceStatus: "NOT_CHECKED_IN",
      supportsCodeCheckIn: true,
    },
    {
      id: "frontend-lab",
      title: "프론트엔드 실습 랩",
      categoryLabel: "수업",
      dateKey: "2026-04-08",
      dateLabel: "4월 8일 수요일",
      timeLabel: "10:00 - 12:30",
      locationLabel: "8층 AI 강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: false,
    },
    {
      id: "career-coaching",
      title: "커리어 코칭 데이",
      categoryLabel: "특강",
      dateKey: "2026-04-10",
      dateLabel: "4월 10일 금요일",
      timeLabel: "14:00 - 16:00",
      locationLabel: "온라인 라이브 · Meet",
      visibilityType: "global",
      visibilityScope: "global",
      visibilityLabel: "학원 전체 행사",
      requiresAttendanceCheck: false,
    },
    {
      id: "attendance-afternoon-missed",
      title: "오후 출석 체크",
      categoryLabel: "필수 출석",
      dateKey: "2026-04-07",
      dateLabel: "4월 7일 화요일",
      timeLabel: "13:00 - 13:20",
      locationLabel: "8층 AI 강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: true,
      attendanceWindowLabel: "13:20까지 인증 가능",
      attendanceWindowStartAt: "2026-04-07T13:00:00+09:00",
      attendanceWindowEndAt: "2026-04-07T13:20:00+09:00",
      attendanceStatus: "ABSENT",
      supportsCodeCheckIn: true,
    },
    {
      id: "attendance-evening-1",
      title: "종료 전 출석 확인",
      categoryLabel: "필수 출석",
      dateKey: "2026-04-08",
      dateLabel: "4월 8일 수요일",
      timeLabel: "17:40 - 18:00",
      locationLabel: "8층 AI 강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: true,
      attendanceWindowLabel: "18:00까지 인증 가능",
      attendanceWindowStartAt: "2026-04-08T17:40:00+09:00",
      attendanceWindowEndAt: "2026-04-08T18:00:00+09:00",
      attendanceStatus: "CHECKED_IN",
      supportsCodeCheckIn: true,
    },
  ],
};

const mockCheckInCodeByScheduleId: Record<string, string> = {
  "attendance-morning-1": "381924",
  "attendance-evening-1": "143250",
};

export function getVisibleSchedules(
  profile: StudentAttendanceProfile,
  runtimeState: AttendanceRuntimeState = {},
): StudentScheduleEvent[] {
  const allowedScheduleScopes = buildEffectiveAllowedScheduleScopes({
    allowedScheduleScopes: profile.allowedScheduleScopes,
    classScope: profile.classScope,
  });
  const visibleSchedules = profile.schedules.filter((schedule) =>
    isScheduleVisibleForScopes({
      schedule,
      allowedScheduleScopes,
    }),
  );

  return visibleSchedules.map((schedule) => {
    const runtime = runtimeState[schedule.id];

    if (!runtime) {
      return schedule;
    }

    return {
      ...schedule,
      attendanceStatus: runtime.attendanceStatus,
      checkedAt: runtime.checkedAt,
    };
  });
}

export function getAttendanceOverview(
  profile: StudentAttendanceProfile,
  selectedScheduleId?: string,
  runtimeState: AttendanceRuntimeState = {},
): AttendanceOverview {
  const visibleSchedules = getVisibleSchedules(profile, runtimeState);
  const requiredSchedules = visibleSchedules.filter((schedule) => schedule.requiresAttendanceCheck);
  const selectedRequiredSchedule =
    requiredSchedules.find((schedule) => schedule.id === selectedScheduleId) ?? requiredSchedules[0];
  const checkInAvailability = selectedRequiredSchedule
    ? resolveScheduleCheckInAvailability(selectedRequiredSchedule)
    : { canCheckInNow: false, reason: "출석 대상 일정이 없습니다." };

  return {
    scheduleId: selectedRequiredSchedule?.id,
    programName: profile.programName,
    className: profile.className,
    sessionLabel: selectedRequiredSchedule?.title ?? "출석 대상 일정 없음",
    scheduleLabel: selectedRequiredSchedule
      ? `${selectedRequiredSchedule.dateLabel} · ${selectedRequiredSchedule.timeLabel}`
      : "관리자가 필수 출석 일정을 아직 연결하지 않았습니다.",
    dateLabel: selectedRequiredSchedule?.dateLabel ?? "일정 연동 대기",
    locationLabel: selectedRequiredSchedule?.locationLabel ?? "강의실/온라인 정보 대기",
    windowLabel: selectedRequiredSchedule?.attendanceWindowLabel ?? "출석 체크 일정 대기",
    status: selectedRequiredSchedule?.attendanceStatus ?? "NOT_CHECKED_IN",
    checkedAtLabel: selectedRequiredSchedule?.checkedAt
      ? formatCheckedAtLabel(selectedRequiredSchedule.checkedAt)
      : undefined,
    supportsCodeCheckIn: selectedRequiredSchedule?.supportsCodeCheckIn ?? false,
    canCheckInNow: checkInAvailability.canCheckInNow,
    checkInDisabledReason: checkInAvailability.reason,
    expectedCodeLength: profile.expectedCodeLength,
    calendarTabHref: "/student?tab=calendar",
    visibleScopeLabels: Array.from(
      new Set(
        visibleSchedules.map((schedule) =>
          schedule.visibilityType === "global" ? "학원 전체 행사" : schedule.visibilityLabel,
        ),
      ),
    ),
  };
}

export async function submitAttendanceCodeCheckIn({
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
  const schedule = getVisibleSchedules(profile, runtimeState).find((item) => item.id === scheduleId);

  if (!schedule) {
    throw createAttendanceCheckInError("SCHEDULE_NOT_FOUND", "선택한 출석 일정을 찾을 수 없습니다.");
  }

  if (!schedule.requiresAttendanceCheck) {
    throw createAttendanceCheckInError("NOT_REQUIRED", "이 일정은 출석 인증 대상이 아닙니다.");
  }

  if (!schedule.supportsCodeCheckIn) {
    throw createAttendanceCheckInError("UNSUPPORTED", "이 일정은 코드 인증을 지원하지 않습니다.");
  }

  if (schedule.attendanceStatus === "CHECKED_IN") {
    throw createAttendanceCheckInError("ALREADY_CHECKED_IN", "이미 출석이 완료된 일정입니다.");
  }

  if (schedule.attendanceStatus === "ABSENT") {
    throw createAttendanceCheckInError("ALREADY_ABSENT", "결석 처리된 일정은 인증할 수 없습니다.");
  }

  const checkInAvailability = resolveScheduleCheckInAvailability(schedule);

  if (!checkInAvailability.canCheckInNow) {
    throw createAttendanceCheckInError(
      "OUTSIDE_ATTENDANCE_WINDOW",
      checkInAvailability.reason ?? "출석 인증 가능 시간이 아닙니다.",
    );
  }

  const normalizedCode = code.trim();

  if (normalizedCode.length !== profile.expectedCodeLength) {
    throw createAttendanceCheckInError(
      "INVALID_CODE_LENGTH",
      `인증코드는 ${profile.expectedCodeLength}자리여야 합니다.`,
    );
  }

  const expectedCode = mockCheckInCodeByScheduleId[scheduleId] ?? "381924";

  if (normalizedCode !== expectedCode) {
    throw createAttendanceCheckInError("INVALID_CODE", "인증코드가 올바르지 않습니다.");
  }

  const checkedAt = new Date().toISOString();

  return {
    scheduleId,
    attendanceStatus: "CHECKED_IN",
    checkedAt,
    isLate: false,
  };
}

function createAttendanceCheckInError(code: AttendanceCheckInError["code"], message: string) {
  return {
    code,
    message,
  } satisfies AttendanceCheckInError;
}

function formatCheckedAtLabel(checkedAt: string) {
  const parsed = new Date(checkedAt);

  if (Number.isNaN(parsed.getTime())) {
    return checkedAt;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}
