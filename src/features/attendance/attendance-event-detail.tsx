"use client";

import { useEffect, useState } from "react";

import { resolveScheduleCheckInAvailability } from "@/features/attendance/attendance-check-in-availability";
import { getScheduleTone } from "@/features/attendance/attendance-schedule-tone";
import type { StudentScheduleEvent } from "@/types/attendance";

export function AttendanceEventDetail({
  dateKey,
  events,
  onOpenAttendance,
}: {
  dateKey?: string;
  events: StudentScheduleEvent[];
  onOpenAttendance: (eventId: string) => void;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);
  if (!dateKey) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-500">선택한 날짜가 없습니다.</p>
      </section>
    );
  }

  const titleLabel = events[0]?.dateLabel ?? formatDateKey(dateKey);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
        하루 일정 상세
      </p>
      <p className="mt-3 text-lg font-semibold text-ink">{titleLabel}</p>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">해당 날짜의 일정이 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {events.map((event) => {
            const tone = getScheduleTone(event.categoryLabel);
            const checkInAvailability =
              event.requiresAttendanceCheck && now
                ? resolveScheduleCheckInAvailability(event, now)
                : { canCheckInNow: false, reason: undefined };
            const checkInDisabled = event.requiresAttendanceCheck && !checkInAvailability.canCheckInNow;

            return (
              <article key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${tone.bgClassName} ${tone.textClassName}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${tone.dotClassName}`} />
                    {event.categoryLabel}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    {event.visibilityLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink">{event.title}</p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p>{event.timeLabel}</p>
                  <p>{event.locationLabel}</p>
                </div>
                {event.requiresAttendanceCheck ? (
                  <div className="mt-3 space-y-1.5">
                    <button
                      type="button"
                      disabled={checkInDisabled}
                      onClick={() => onOpenAttendance(event.id)}
                      className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition ${
                        checkInDisabled
                          ? "cursor-not-allowed bg-slate-200 text-slate-500"
                          : "bg-brand text-white hover:opacity-90"
                      }`}
                    >
                      출석 탭에서 체크하기
                    </button>
                    {checkInDisabled && checkInAvailability.reason ? (
                      <p
                        className={`text-xs font-semibold ${
                          event.attendanceStatus === "ABSENT" ? "text-rose-600" : "text-amber-700"
                        }`}
                      >
                        {checkInAvailability.reason}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatDateKey(dateKey: string) {
  const date = new Date(dateKey);

  if (Number.isNaN(date.getTime())) {
    return dateKey;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}
