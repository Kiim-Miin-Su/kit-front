"use client";

import { useEffect, useMemo, useState } from "react";

import { AttendanceAgendaList } from "@/features/attendance/attendance-agenda-list";
import { AttendanceCalendar } from "@/features/attendance/attendance-calendar";
import { AttendanceCheckCard } from "@/features/attendance/attendance-check-card";
import { AttendanceLegend } from "@/features/attendance/attendance-legend";
import {
  attendanceScheduleStatusLabelMap,
  attendanceScheduleStatusToneClassMap,
  calendarViewModeOptions,
  studentWorkspaceTabOptions,
} from "@/features/attendance/attendance-ui-config";
import {
  getAttendanceOverview,
  getVisibleSchedules,
} from "@/features/attendance/mock-attendance-data";
import {
  fetchCalendarHolidays,
  fetchStudentAttendanceWorkspace,
  submitStudentAttendanceCheckIn,
} from "@/services/attendance";
import type {
  AttendanceCheckInError,
  AttendanceRuntimeState,
  CalendarViewMode,
  StudentAttendanceProfile,
  StudentWorkspaceTab,
} from "@/types/attendance";

export function StudentAttendanceWorkspace({
  profile,
  initialTab,
}: {
  profile: StudentAttendanceProfile;
  initialTab: StudentWorkspaceTab;
}) {
  const [workspaceProfile, setWorkspaceProfile] = useState(profile);
  const [activeTab, setActiveTab] = useState<StudentWorkspaceTab>(initialTab);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("month");
  const [attendanceRuntimeState, setAttendanceRuntimeState] = useState<AttendanceRuntimeState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();
  const [holidayDateKeySet, setHolidayDateKeySet] = useState<Set<string>>(new Set());
  const [loadedHolidayPeriodKey, setLoadedHolidayPeriodKey] = useState<string>();
  // 뷰 렌더용 이벤트는 프로필 + 런타임 출석상태를 합성해 계산한다.
  // (백엔드 실시간 반영 시에는 service 응답만 바꿔도 동일하게 동작)
  const visibleSchedules = useMemo(
    () => getVisibleSchedules(workspaceProfile, attendanceRuntimeState),
    [attendanceRuntimeState, workspaceProfile],
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | undefined>(() =>
    getVisibleSchedules(profile).find((schedule) => schedule.requiresAttendanceCheck)?.id,
  );
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | undefined>(() =>
    getVisibleSchedules(profile)[0]?.dateKey,
  );
  const attendance = useMemo(
    () => getAttendanceOverview(workspaceProfile, selectedScheduleId, attendanceRuntimeState),
    [attendanceRuntimeState, selectedScheduleId, workspaceProfile],
  );
  const requiredSchedules = visibleSchedules.filter((schedule) => schedule.requiresAttendanceCheck);
  const attendanceHistory = requiredSchedules.filter((schedule) =>
    schedule.attendanceStatus === "CHECKED_IN" ||
    schedule.attendanceStatus === "LATE" ||
    schedule.attendanceStatus === "ABSENT",
  );

  useEffect(() => {
    let cancelled = false;

    fetchStudentAttendanceWorkspace().then((resolvedProfile) => {
      if (!cancelled) {
        setWorkspaceProfile(resolvedProfile);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      !selectedScheduleId ||
      !requiredSchedules.some((schedule) => schedule.id === selectedScheduleId)
    ) {
      setSelectedScheduleId(requiredSchedules[0]?.id);
    }
  }, [requiredSchedules, selectedScheduleId]);

  useEffect(() => {
    if (!selectedCalendarDateKey) {
      setSelectedCalendarDateKey(visibleSchedules[0]?.dateKey);
      return;
    }

    const hasSelectedDateInVisibleSchedule = visibleSchedules.some(
      (schedule) => schedule.dateKey === selectedCalendarDateKey,
    );

    if (!hasSelectedDateInVisibleSchedule) {
      setSelectedCalendarDateKey(visibleSchedules[0]?.dateKey);
    }
  }, [selectedCalendarDateKey, visibleSchedules]);

  useEffect(() => {
    if (activeTab !== "calendar") {
      return;
    }

    const referenceDateKey = selectedCalendarDateKey ?? visibleSchedules[0]?.dateKey;

    if (!referenceDateKey) {
      return;
    }

    const parsed = new Date(referenceDateKey);

    if (Number.isNaN(parsed.getTime())) {
      return;
    }

    const year = parsed.getFullYear();
    const month = parsed.getMonth() + 1;
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;

    if (loadedHolidayPeriodKey === periodKey) {
      return;
    }

    let cancelled = false;

    // 월 전환 시에만 공휴일 API를 호출한다.
    // 이미 로드한 periodKey는 재호출하지 않아 캘린더 이동 비용을 줄인다.
    fetchCalendarHolidays({ year, month }).then((holidays) => {
      if (cancelled) {
        return;
      }

      setHolidayDateKeySet(new Set(holidays.map((holiday) => holiday.dateKey)));
      setLoadedHolidayPeriodKey(periodKey);
    });

    return () => {
      cancelled = true;
    };
  }, [activeTab, loadedHolidayPeriodKey, selectedCalendarDateKey, visibleSchedules]);

  return (
    <section
      id="attendance"
      className="scroll-mt-24 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Attendance & Calendar
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            과정/반 기준 출석 체크와 일정 권한
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            학생은 관리자가 부여한 scope만 볼 수 있습니다. 이 학생은 `global` 학원 행사와{" "}
            `{workspaceProfile.className}` 수업 일정을 같이 보고, 필수 출석 일정만 출석 탭과
            연동됩니다.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {studentWorkspaceTabOptions.map((tabOption) => {
            const active = activeTab === tabOption.value;

            return (
              <button
                key={tabOption.value}
                type="button"
                onClick={() => setActiveTab(tabOption.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-white text-ink shadow-sm" : "text-slate-500"
                }`}
              >
                {tabOption.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "attendance" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <AttendanceCheckCard
            attendance={attendance}
            isSubmitting={isSubmitting}
            feedback={feedback}
            onSubmitCode={async (code) => {
              if (!attendance.scheduleId) {
                setFeedback({
                  type: "error",
                  message: "현재 선택된 필수 출석 일정이 없습니다.",
                });
                return;
              }

              setIsSubmitting(true);
              setFeedback(undefined);

              try {
                const result = await submitStudentAttendanceCheckIn({
                  profile: workspaceProfile,
                  scheduleId: attendance.scheduleId,
                  code,
                  runtimeState: attendanceRuntimeState,
                });

                setAttendanceRuntimeState((prev) => ({
                  ...prev,
                  [result.scheduleId]: {
                    attendanceStatus: result.attendanceStatus,
                    checkedAt: result.checkedAt,
                  },
                }));
                setFeedback({
                  type: "success",
                  message: result.isLate
                    ? "출석이 지각 처리되었습니다."
                    : "출석이 정상 처리되었습니다.",
                });
              } catch (error) {
                setFeedback({
                  type: "error",
                  message: resolveAttendanceErrorMessage(error),
                });
              } finally {
                setIsSubmitting(false);
              }
            }}
          />
          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-ink">필수 출석 일정</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              캘린더에서 `필수 출석`으로 만든 일정만 여기로 올라오고, 선택한 일정 기준으로 출석
              카드가 바뀝니다.
            </p>
            <div className="mt-4 space-y-3">
              {requiredSchedules.map((schedule) => {
                const active = schedule.id === selectedScheduleId;

                return (
                  <button
                    key={schedule.id}
                    type="button"
                    onClick={() => {
                      setSelectedScheduleId(schedule.id);
                      setFeedback(undefined);
                    }}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      active
                        ? "border-brand bg-brand/5"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <p className="text-sm font-semibold text-ink">{schedule.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {schedule.dateLabel} · {schedule.timeLabel}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      {schedule.visibilityLabel}
                    </p>
                    {schedule.attendanceStatus ? (
                      <p
                        className={`mt-1 text-xs font-semibold ${attendanceScheduleStatusToneClassMap[schedule.attendanceStatus]}`}
                      >
                        {attendanceScheduleStatusLabelMap[schedule.attendanceStatus]}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="text-sm font-semibold text-ink">출석 이력</p>
              {attendanceHistory.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">아직 인증 완료된 이력이 없습니다.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {attendanceHistory.map((history) => (
                    <div key={history.id} className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-ink">{history.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {history.dateLabel} · {history.timeLabel}
                      </p>
                      <p
                        className={`mt-1 text-xs font-semibold ${
                          history.attendanceStatus === "LATE"
                            ? "text-amber-700"
                            : history.attendanceStatus === "ABSENT"
                              ? "text-rose-600"
                              : "text-emerald-700"
                        }`}
                      >
                        {history.attendanceStatus === "ABSENT"
                          ? "결석 처리"
                          : history.attendanceStatus === "LATE"
                            ? history.checkedAt
                              ? `지각 인증 시각: ${formatHistoryTime(history.checkedAt)}`
                              : "지각 처리"
                            : history.checkedAt
                              ? `인증 시각: ${formatHistoryTime(history.checkedAt)}`
                              : "출석 완료"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">캘린더 보기</p>
              <p className="mt-1 text-sm text-slate-600">
                달력형과 일정형을 오가며 같은 scope의 일정을 확인할 수 있습니다.
              </p>
            </div>
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              {calendarViewModeOptions.map((viewModeOption) => {
                const active = calendarViewMode === viewModeOption.value;

                return (
                  <button
                    key={viewModeOption.value}
                    type="button"
                    onClick={() => setCalendarViewMode(viewModeOption.value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-white text-ink shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {viewModeOption.label}
                  </button>
                );
              })}
            </div>
          </div>

          <AttendanceLegend />

          {calendarViewMode === "month" ? (
            <AttendanceCalendar
              schedules={visibleSchedules}
              selectedDateKey={selectedCalendarDateKey}
              holidayDateKeySet={holidayDateKeySet}
              onSelectDateKey={(dateKey) => {
                setSelectedCalendarDateKey(dateKey);
                const requiredEventOnDate = visibleSchedules.find(
                  (schedule) =>
                    schedule.dateKey === dateKey && schedule.requiresAttendanceCheck,
                );

                if (requiredEventOnDate) {
                  setSelectedScheduleId(requiredEventOnDate.id);
                }
              }}
              onOpenAttendance={(eventId) => {
                setSelectedScheduleId(eventId);
                setActiveTab("attendance");
              }}
            />
          ) : (
            <AttendanceAgendaList
              schedules={visibleSchedules}
              onSelectDetail={(dateKey) => setSelectedCalendarDateKey(dateKey)}
              onSelectAttendance={(scheduleId) => {
                const targetEvent = visibleSchedules.find((schedule) => schedule.id === scheduleId);

                if (targetEvent?.requiresAttendanceCheck) {
                  setSelectedScheduleId(scheduleId);
                  setActiveTab("attendance");
                }
              }}
            />
          )}
        </div>
      )}
    </section>
  );
}

function resolveAttendanceErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as AttendanceCheckInError).message);
  }

  return "출석 인증 중 오류가 발생했습니다.";
}

function formatHistoryTime(isoString: string) {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
