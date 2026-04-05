export type AttendanceStatus = "NOT_CHECKED_IN" | "CHECKED_IN" | "LATE";

export type StudentWorkspaceTab = "attendance" | "calendar";
export type CalendarViewMode = "month" | "agenda";
export type ScheduleVisibilityType = "global" | "class";

export interface StudentScheduleEvent {
  id: string;
  title: string;
  categoryLabel: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  locationLabel: string;
  visibilityType: ScheduleVisibilityType;
  visibilityScope: string;
  visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowLabel?: string;
  attendanceStatus?: AttendanceStatus;
  supportsCodeCheckIn?: boolean;
}

export interface StudentAttendanceProfile {
  programName: string;
  className: string;
  classScope: string;
  allowedScheduleScopes: string[];
  allowedScheduleLabels: string[];
  expectedCodeLength: number;
  schedules: StudentScheduleEvent[];
}

export interface AttendanceOverview {
  programName: string;
  className: string;
  sessionLabel: string;
  scheduleLabel: string;
  dateLabel: string;
  locationLabel: string;
  windowLabel: string;
  status: AttendanceStatus;
  supportsCodeCheckIn: boolean;
  expectedCodeLength: number;
  calendarTabHref: string;
  visibleScopeLabels: string[];
}
