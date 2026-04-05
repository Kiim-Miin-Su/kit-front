"use client";

import { useMemo, useState } from "react";

import { AttendanceCheckCard } from "@/features/attendance/attendance-check-card";
import { getAttendanceOverview, getVisibleSchedules } from "@/features/attendance/mock-attendance-data";
import type {
  CalendarViewMode,
  StudentAttendanceProfile,
  StudentScheduleEvent,
  StudentWorkspaceTab,
} from "@/types/attendance";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const scheduleToneMap: Record<
  string,
  { dotClassName: string; textClassName: string; bgClassName: string; label: string }
> = {
  운영: {
    dotClassName: "bg-sky-500",
    textClassName: "text-sky-700",
    bgClassName: "bg-sky-50",
    label: "운영",
  },
  수업: {
    dotClassName: "bg-violet-500",
    textClassName: "text-violet-700",
    bgClassName: "bg-violet-50",
    label: "수업",
  },
  특강: {
    dotClassName: "bg-amber-500",
    textClassName: "text-amber-700",
    bgClassName: "bg-amber-50",
    label: "특강",
  },
  "필수 출석": {
    dotClassName: "bg-emerald-500",
    textClassName: "text-emerald-700",
    bgClassName: "bg-emerald-50",
    label: "필수 출석",
  },
};

export function StudentAttendanceWorkspace({
  profile,
  initialTab,
}: {
  profile: StudentAttendanceProfile;
  initialTab: StudentWorkspaceTab;
}) {
  const [activeTab, setActiveTab] = useState<StudentWorkspaceTab>(initialTab);
  const [calendarViewMode, setCalendarViewMode] = useState<CalendarViewMode>("month");
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | undefined>(() =>
    getVisibleSchedules(profile).find((schedule) => schedule.requiresAttendanceCheck)?.id,
  );
  const visibleSchedules = useMemo(() => getVisibleSchedules(profile), [profile]);
  const [selectedCalendarEventId, setSelectedCalendarEventId] = useState<string | undefined>(() =>
    visibleSchedules[0]?.id,
  );
  const attendance = useMemo(
    () => getAttendanceOverview(profile, selectedScheduleId),
    [profile, selectedScheduleId],
  );
  const calendarDays = useMemo(() => buildCalendarDays(visibleSchedules), [visibleSchedules]);
  const selectedCalendarEvent = useMemo(
    () => visibleSchedules.find((schedule) => schedule.id === selectedCalendarEventId) ?? visibleSchedules[0],
    [selectedCalendarEventId, visibleSchedules],
  );

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
            학생은 관리자가 부여한 scope만 볼 수 있습니다. 이 학생은 `global` 학원 행사와
            `AI Product Engineering 3기` 수업 일정을 같이 보고, 필수 출석 일정만 출석 탭과
            연동됩니다.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          {(["attendance", "calendar"] as const).map((tab) => {
            const active = activeTab === tab;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active ? "bg-white text-ink shadow-sm" : "text-slate-500"
                }`}
              >
                {tab === "attendance" ? "출석 탭" : "캘린더 탭"}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "attendance" ? (
        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <AttendanceCheckCard attendance={attendance} />
          <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-ink">필수 출석 일정</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              캘린더에서 `필수 출석`으로 만든 일정만 여기로 올라오고, 선택한 일정 기준으로 출석
              카드가 바뀝니다.
            </p>
            <div className="mt-4 space-y-3">
              {visibleSchedules
                .filter((schedule) => schedule.requiresAttendanceCheck)
                .map((schedule) => {
                  const active = schedule.id === selectedScheduleId;

                  return (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => setSelectedScheduleId(schedule.id)}
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
                    </button>
                  );
                })}
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
              {(["month", "agenda"] as const).map((mode) => {
                const active = calendarViewMode === mode;

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setCalendarViewMode(mode)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      active ? "bg-white text-ink shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {mode === "month" ? "달력형" : "일정형"}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              일정 구분
            </p>
            {Object.values(scheduleToneMap).map((tone) => (
              <div key={tone.label} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${tone.dotClassName}`} />
                <span className={`text-xs font-semibold ${tone.textClassName}`}>{tone.label}</span>
              </div>
            ))}
          </div>

          {calendarViewMode === "month" ? (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
              <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-7 gap-2">
                  {dayLabels.map((label) => (
                    <div
                      key={label}
                      className="rounded-xl bg-white px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400"
                    >
                      {label}
                    </div>
                  ))}
                  {calendarDays.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`min-h-28 rounded-[18px] border p-2 ${
                        day.events.length > 0
                          ? "border-slate-200 bg-white"
                          : "border-dashed border-slate-200 bg-white/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-ink">{day.dayNumber}</p>
                        {day.events.length > 0 ? (
                          <span className="text-[10px] font-semibold text-slate-400">
                            {day.events.length}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {day.events.slice(0, 3).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => {
                              setSelectedCalendarEventId(event.id);
                              if (event.requiresAttendanceCheck) {
                                setSelectedScheduleId(event.id);
                              }
                            }}
                            className={`flex w-full items-center gap-1.5 overflow-hidden rounded-full px-2 py-1 text-left text-[11px] transition hover:opacity-80 ${
                              getScheduleTone(event.categoryLabel).bgClassName
                            }`}
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${getScheduleTone(event.categoryLabel).dotClassName}`} />
                            <span className="shrink-0 font-semibold text-slate-500">
                              {toCompactTimeLabel(event.timeLabel)}
                            </span>
                            <span className="truncate font-semibold text-slate-700">
                              {event.title}
                            </span>
                          </button>
                        ))}
                        {day.events.length > 3 ? (
                          <p className="px-2 text-[10px] font-semibold text-slate-400">
                            +{day.events.length - 3} more
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <CalendarEventDetail
                event={selectedCalendarEvent}
                onOpenAttendance={() => {
                  if (selectedCalendarEvent?.requiresAttendanceCheck) {
                    setSelectedScheduleId(selectedCalendarEvent.id);
                    setActiveTab("attendance");
                  }
                }}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {visibleSchedules.map((schedule) => (
                <ScheduleAgendaCard
                  key={schedule.id}
                  schedule={schedule}
                  onSelectDetail={() => setSelectedCalendarEventId(schedule.id)}
                  onSelectAttendance={() => {
                    if (schedule.requiresAttendanceCheck) {
                      setSelectedScheduleId(schedule.id);
                      setActiveTab("attendance");
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ScheduleAgendaCard({
  schedule,
  onSelectDetail,
  onSelectAttendance,
}: {
  schedule: StudentScheduleEvent;
  onSelectDetail: () => void;
  onSelectAttendance: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        onSelectDetail();
        onSelectAttendance();
      }}
      className="w-full rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 text-left transition hover:border-slate-300 hover:bg-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                getScheduleTone(schedule.categoryLabel).bgClassName
              } ${getScheduleTone(schedule.categoryLabel).textClassName}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${getScheduleTone(schedule.categoryLabel).dotClassName}`} />
              {schedule.categoryLabel}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500">
              {schedule.visibilityLabel}
            </span>
            {schedule.requiresAttendanceCheck ? (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                필수 출석
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-lg font-semibold text-ink">{schedule.title}</p>
          <p className="mt-1 text-sm text-slate-600">
            {schedule.dateLabel} · {schedule.timeLabel}
          </p>
          <p className="mt-1 text-sm text-slate-500">{schedule.locationLabel}</p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Scope
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">{schedule.visibilityScope}</p>
        </div>
      </div>
    </button>
  );
}

function CalendarEventDetail({
  event,
  onOpenAttendance,
}: {
  event?: StudentScheduleEvent;
  onOpenAttendance: () => void;
}) {
  if (!event) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">선택한 일정이 없습니다.</p>
      </section>
    );
  }

  const tone = getScheduleTone(event.categoryLabel);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        일정 상세
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.bgClassName} ${tone.textClassName}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${tone.dotClassName}`} />
          {event.categoryLabel}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {event.visibilityLabel}
        </span>
      </div>
      <p className="mt-4 text-lg font-semibold text-ink">{event.title}</p>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p>{event.dateLabel}</p>
        <p>{event.timeLabel}</p>
        <p>{event.locationLabel}</p>
      </div>
      {event.requiresAttendanceCheck ? (
        <button
          type="button"
          onClick={onOpenAttendance}
          className="mt-5 inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white"
        >
          출석 탭에서 체크하기
        </button>
      ) : null}
    </section>
  );
}

function getScheduleTone(categoryLabel: string) {
  return scheduleToneMap[categoryLabel] ?? scheduleToneMap["운영"];
}

function toCompactTimeLabel(timeLabel: string) {
  return timeLabel.split(" - ")[0] ?? timeLabel;
}

function buildCalendarDays(schedules: StudentScheduleEvent[]) {
  const year = 2026;
  const monthIndex = 3;
  const firstDay = new Date(year, monthIndex, 1);
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmptyCount = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((leadingEmptyCount + lastDate) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyCount + 1;

    if (dayNumber < 1 || dayNumber > lastDate) {
      return {
        dateKey: `empty-${index}`,
        dayNumber: "",
        events: [] as StudentScheduleEvent[],
      };
    }

    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;

    return {
      dateKey,
      dayNumber: String(dayNumber),
      events: schedules.filter((schedule) => schedule.dateKey === dateKey),
    };
  });
}
