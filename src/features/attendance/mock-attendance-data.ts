import type {
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
      attendanceStatus: "CHECKED_IN",
      supportsCodeCheckIn: true,
    },
  ],
};

export function getVisibleSchedules(profile: StudentAttendanceProfile): StudentScheduleEvent[] {
  return profile.schedules.filter((schedule) =>
    profile.allowedScheduleScopes.includes(schedule.visibilityScope),
  );
}

export function getAttendanceOverview(
  profile: StudentAttendanceProfile,
  selectedScheduleId?: string,
): AttendanceOverview {
  const visibleSchedules = getVisibleSchedules(profile);
  const requiredSchedules = visibleSchedules.filter((schedule) => schedule.requiresAttendanceCheck);
  const selectedRequiredSchedule =
    requiredSchedules.find((schedule) => schedule.id === selectedScheduleId) ?? requiredSchedules[0];

  return {
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
    supportsCodeCheckIn: selectedRequiredSchedule?.supportsCodeCheckIn ?? false,
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
