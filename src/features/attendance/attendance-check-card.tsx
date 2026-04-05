import Link from "next/link";

import type { AttendanceOverview } from "@/types/attendance";

const statusLabelMap: Record<AttendanceOverview["status"], string> = {
  NOT_CHECKED_IN: "출석 전",
  CHECKED_IN: "출석 완료",
  LATE: "지각 체크",
};

export function AttendanceCheckCard({
  attendance,
}: {
  attendance: AttendanceOverview;
}) {
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
        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-[#45631b]">
          {statusLabelMap[attendance.status]}
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
          관리자 연결 기준
        </p>
        <p className="mt-2 text-sm leading-6 text-[#4f6728]">
          출석은 강의별이 아니라 과정/반 단위 일정과 연결됩니다. 캘린더에서 권한이 있는 일정만
          보이고, 그중 필수 출석 일정이 이 카드에 자동 반영됩니다.
        </p>
        <div className="mt-4 flex items-center gap-2">
          {Array.from({ length: attendance.expectedCodeLength }).map((_, index) => (
            <span
              key={index}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-100 bg-white text-sm font-semibold text-[#6a8540]"
            >
              •
            </span>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!attendance.supportsCodeCheckIn}
            className="inline-flex h-10 items-center rounded-full bg-white px-4 text-sm font-semibold text-[#355314] disabled:cursor-not-allowed disabled:opacity-80"
          >
            인증코드 입력 기능 예정
          </button>
          <Link
            href={attendance.calendarTabHref}
            className="inline-flex h-10 items-center rounded-full border border-emerald-200 bg-transparent px-4 text-sm font-semibold text-[#355314]"
          >
            캘린더 탭 열기
          </Link>
        </div>
      </div>
    </article>
  );
}
