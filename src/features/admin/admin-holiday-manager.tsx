"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createCustomHoliday,
  deleteCustomHoliday,
  fetchCalendarHolidays,
} from "@/services/attendance";
import type { CalendarHoliday } from "@/types/attendance";

export function AdminHolidayManager() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateKey, setDateKey] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();

  useEffect(() => {
    let cancelled = false;

    fetchCalendarHolidays({ year, month })
      .then((items) => {
        if (!cancelled) {
          setHolidays(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMessage({
            type: "error",
            text: "공휴일 목록을 불러오지 못했습니다.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [month, year]);

  const grouped = useMemo(
    () =>
      holidays.slice().sort((a, b) => a.dateKey.localeCompare(b.dateKey)),
    [holidays],
  );

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
            Holiday Manager
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-ink">
            대한민국 공휴일 + 커스텀 휴일 관리
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            캘린더 진입 시 API에서 월별 공휴일을 불러오고, 관리자에서 커스텀 휴일을 추가할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={year}
            onChange={(event) => {
              setLoading(true);
              setMessage(undefined);
              setYear(Number(event.target.value) || today.getFullYear());
            }}
            className="h-10 w-24 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-ink outline-none"
          />
          <select
            value={month}
            onChange={(event) => {
              setLoading(true);
              setMessage(undefined);
              setMonth(Number(event.target.value));
            }}
            className="h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-ink outline-none"
          >
            {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
              <option key={value} value={value}>
                {value}월
              </option>
            ))}
          </select>
        </div>
      </div>

      <form
        className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[180px_minmax(0,1fr)_120px]"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage(undefined);

          if (!dateKey || !name.trim()) {
            setMessage({
              type: "error",
              text: "날짜와 휴일명을 모두 입력해 주세요.",
            });
            return;
          }

          try {
            const created = await createCustomHoliday({
              dateKey,
              name: name.trim(),
            });

            setDateKey("");
            setName("");
            setMessage({
              type: "success",
              text: `${created.dateKey} 휴일이 추가되었습니다.`,
            });

            const createdDate = new Date(created.dateKey);
            if (!Number.isNaN(createdDate.getTime())) {
              const targetYear = createdDate.getFullYear();
              const targetMonth = createdDate.getMonth() + 1;

              if (targetYear === year && targetMonth === month) {
                setHolidays((prev) => {
                  const filtered = prev.filter(
                    (holiday) => holiday.id !== created.id && holiday.dateKey !== created.dateKey,
                  );
                  return [...filtered, created];
                });
              }
            }
          } catch {
            setMessage({
              type: "error",
              text: "휴일 추가에 실패했습니다.",
            });
          }
        }}
      >
        <input
          type="date"
          value={dateKey}
          onChange={(event) => setDateKey(event.target.value)}
          className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-ink outline-none"
        />
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 임시 휴무일"
          className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-ink outline-none"
        />
        <button
          type="submit"
          className="h-10 rounded-xl bg-brand px-3 text-sm font-semibold text-white"
        >
          휴일 추가
        </button>
      </form>

      {message ? (
        <p
          className={`mt-3 text-sm font-semibold ${
            message.type === "success" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-5 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">공휴일을 불러오는 중입니다...</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-slate-500">선택한 월의 공휴일이 없습니다.</p>
        ) : (
          grouped.map((holiday) => (
            <div
              key={holiday.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{holiday.name}</p>
                <p className="text-xs text-slate-500">{holiday.dateKey}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    holiday.sourceType === "CUSTOM"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {holiday.sourceType === "CUSTOM" ? "커스텀" : "대한민국 공휴일"}
                </span>
                {holiday.sourceType === "CUSTOM" ? (
                  <button
                    type="button"
                    onClick={async () => {
                      await deleteCustomHoliday(holiday.id);
                      setHolidays((prev) => prev.filter((item) => item.id !== holiday.id));
                    }}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
                  >
                    삭제
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
