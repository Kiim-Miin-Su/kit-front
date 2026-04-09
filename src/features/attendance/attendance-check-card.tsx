"use client";

import Link from "next/link";
import { useState } from "react";

import { AttendanceCheckInButton } from "@/features/attendance/attendance-check-in-button";
import {
  attendanceOverviewStatusLabelMap,
  attendanceOverviewStatusToneClassMap,
} from "@/features/attendance/attendance-ui-config";
import type { AttendanceOverview } from "@/types/attendance";

export function AttendanceCheckCard({
  attendance,
  onSubmitCode,
  isSubmitting = false,
  feedback,
}: {
  attendance: AttendanceOverview;
  onSubmitCode?: (code: string) => Promise<void> | void;
  isSubmitting?: boolean;
  feedback?: {
    type: "success" | "error";
    message: string;
  };
}) {
  const [code, setCode] = useState("");
  const actionDisabled = !attendance.canCheckInNow;

  return (
    <article className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-[#f0fbe8] via-[#eff9de] to-[#f7fde9] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#45631b]">출석 체크</p>
          <p className="mt-2 text-xl font-semibold tracking-tight text-[#24380d]">
            {attendance.sessionLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-[#4f6728]">
            {attendance.programName} · {attendance.className}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceOverviewStatusToneClassMap[attendance.status]}`}
        >
          {attendanceOverviewStatusLabelMap[attendance.status]}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-white/80 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a8540]">
          연동된 필수 일정
        </p>
        <p className="mt-2 text-sm font-semibold text-[#2f4410]">{attendance.scheduleLabel}</p>
        <p className="mt-1 text-sm text-[#4f6728]">{attendance.locationLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            {attendance.windowLabel}
          </span>
          {attendance.visibleScopeLabels.map((scope) => (
            <span
              key={scope}
              className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-[#56732a]"
            >
              {scope}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6a8540]">
          출석 인증
        </p>
        <p className="mt-2 text-sm leading-6 text-[#4f6728]">
          출석은 강의별이 아니라 과정/반 단위 일정과 연결됩니다. 캘린더에서 권한이 있는 일정만
          보이고, 그중 필수 출석 일정이 이 카드에 자동 반영됩니다.
        </p>
        {attendance.checkedAtLabel ? (
          <p className="mt-2 text-xs font-semibold text-emerald-700">
            인증 완료 시각: {attendance.checkedAtLabel}
          </p>
        ) : null}
        {attendance.checkInDisabledReason ? (
          <p
            className={`mt-2 text-xs font-semibold ${
              attendance.status === "ABSENT" ? "text-rose-600" : "text-amber-700"
            }`}
          >
            {attendance.checkInDisabledReason}
          </p>
        ) : null}
        {attendance.supportsCodeCheckIn && onSubmitCode ? (
          <form
            className="mt-4 flex flex-col gap-2"
            onSubmit={async (event) => {
              event.preventDefault();

              if (actionDisabled) {
                return;
              }

              await onSubmitCode(code);
            }}
          >
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a8540]">
              인증코드 입력
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                maxLength={attendance.expectedCodeLength}
                placeholder={`${attendance.expectedCodeLength}자리 코드`}
                className="h-10 min-w-[170px] rounded-full border border-emerald-200 bg-white px-4 text-sm font-semibold text-[#355314] outline-none placeholder:text-[#8ca16b]"
              />
              <AttendanceCheckInButton disabled={actionDisabled} isSubmitting={isSubmitting} />
            </div>
          </form>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#355314] disabled:cursor-not-allowed disabled:opacity-80"
            >
              인증코드 입력 기능 준비 중
            </button>
            <Link
              href={attendance.calendarTabHref}
              className="inline-flex h-10 items-center rounded-full border border-emerald-200 bg-transparent px-4 text-sm font-semibold text-[#355314]"
            >
              캘린더 탭 열기
            </Link>
          </div>
        )}
        {feedback ? (
          <p
            className={`mt-3 text-sm font-semibold ${
              feedback.type === "success" ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </article>
  );
}
