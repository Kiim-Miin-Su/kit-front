import { AttendanceEventDetail } from "@/features/attendance/attendance-event-detail";
import {
  attendanceCalendarDayLabels,
  attendanceCalendarWeekendIndexes,
} from "@/features/attendance/attendance-ui-config";
import { getScheduleTone, toCompactTimeLabel } from "@/features/attendance/attendance-schedule-tone";
import type { StudentScheduleEvent } from "@/types/attendance";

export function AttendanceCalendar({
  schedules,
  selectedDateKey,
  onSelectDateKey,
  onOpenAttendance,
  holidayDateKeySet,
}: {
  schedules: StudentScheduleEvent[];
  selectedDateKey?: string;
  onSelectDateKey: (dateKey: string) => void;
  onOpenAttendance: (eventId: string) => void;
  holidayDateKeySet?: Set<string>;
}) {
  const calendarDays = buildCalendarDays({
    schedules,
    holidayDateKeySet,
    referenceDateKey: selectedDateKey,
  });
  const selectedDay =
    calendarDays.find((day) => day.dateKey === selectedDateKey && day.dayNumber !== "") ??
    calendarDays.find((day) => day.events.length > 0) ??
    calendarDays.find((day) => day.dayNumber !== "");

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-7 gap-2">
          {attendanceCalendarDayLabels.map((label, index) => (
            <div
              key={label}
              className={`rounded-xl bg-white px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] ${
                attendanceCalendarWeekendIndexes.has(index) ? "text-rose-500" : "text-slate-400"
              }`}
            >
              {label}
            </div>
          ))}
          {calendarDays.map((day) => {
            if (!day.dayNumber) {
              return (
                <div
                  key={day.dateKey}
                  className="min-h-28 rounded-[18px] border border-dashed border-slate-200 bg-white/60 p-2"
                />
              );
            }

            const isSelected = selectedDay?.dateKey === day.dateKey;

            return (
              <div
                key={day.dateKey}
                role="button"
                tabIndex={0}
                onClick={() => onSelectDateKey(day.dateKey)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectDateKey(day.dateKey);
                  }
                }}
                className={`min-h-28 cursor-pointer rounded-[18px] border p-2 transition ${
                  isSelected
                    ? "border-brand bg-brand/5"
                    : day.events.length > 0
                      ? "border-slate-200 bg-white"
                      : "border-dashed border-slate-200 bg-white/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs font-semibold ${
                      day.isWeekend || day.isHoliday ? "text-rose-500" : "text-ink"
                    }`}
                  >
                    {day.dayNumber}
                  </p>
                  {day.events.length > 0 ? (
                    <span className="text-[10px] font-semibold text-slate-400">{day.events.length}</span>
                  ) : null}
                </div>
                <div className="mt-2 space-y-1.5">
                  {day.events.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`flex w-full items-center gap-1.5 overflow-hidden rounded-full px-2 py-1 text-left text-[11px] ${
                        getScheduleTone(event.categoryLabel).bgClassName
                      }`}
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${getScheduleTone(event.categoryLabel).dotClassName}`}
                      />
                      <span className="shrink-0 font-semibold text-slate-500">
                        {toCompactTimeLabel(event.timeLabel)}
                      </span>
                      <span className="truncate font-semibold text-slate-700">{event.title}</span>
                    </div>
                  ))}
                  {day.events.length > 3 ? (
                    <p className="px-2 text-[10px] font-semibold text-slate-400">
                      +{day.events.length - 3} more
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <AttendanceEventDetail
        dateKey={selectedDay?.dateKey}
        events={selectedDay?.events ?? []}
        onOpenAttendance={onOpenAttendance}
      />
    </div>
  );
}

function buildCalendarDays(
  {
    schedules,
    holidayDateKeySet = new Set(),
    referenceDateKey,
  }: {
    schedules: StudentScheduleEvent[];
    holidayDateKeySet?: Set<string>;
    referenceDateKey?: string;
  },
) {
  // 하드코딩된 연/월 대신 "선택일 -> 일정 첫 날짜 -> 오늘" 순서로 기준 월을 결정한다.
  const referenceDate = resolveReferenceDate(referenceDateKey, schedules);
  const year = referenceDate.getFullYear();
  const monthIndex = referenceDate.getMonth();
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
        isWeekend: false,
        isHoliday: false,
      };
    }

    const dateKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
    const dayOfWeek = (index % 7) as number;

    return {
      dateKey,
      dayNumber: String(dayNumber),
      events: schedules.filter((schedule) => schedule.dateKey === dateKey),
      isWeekend: attendanceCalendarWeekendIndexes.has(dayOfWeek),
      isHoliday: holidayDateKeySet.has(dateKey),
    };
  });
}

function resolveReferenceDate(
  referenceDateKey: string | undefined,
  schedules: StudentScheduleEvent[],
) {
  const fromSelection = parseDateKey(referenceDateKey);

  if (fromSelection) {
    return fromSelection;
  }

  const sortedDateKey = schedules
    .map((schedule) => schedule.dateKey)
    .sort((a, b) => a.localeCompare(b))[0];
  const fromSchedules = parseDateKey(sortedDateKey);

  if (fromSchedules) {
    return fromSchedules;
  }

  // new Date()는 SSR/CSR 타이밍에 따라 hydration mismatch를 유발할 수 있음.
  // 일정도 없고 선택일도 없으면 2000-01-01을 기준으로 렌더링하고,
  // 클라이언트에서 부모가 today를 selectedDateKey로 주입해야 함.
  return new Date(2000, 0, 1);
}

function parseDateKey(dateKey?: string) {
  if (!dateKey) {
    return null;
  }

  const date = new Date(dateKey);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}
