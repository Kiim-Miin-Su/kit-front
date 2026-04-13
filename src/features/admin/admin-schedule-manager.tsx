"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminCourseWorkspaceUpdatedEvent,
  adminScheduleCategoryOptions,
  adminScheduleVisibilityTypeLabelMap,
} from "@/features/admin/admin-ui-config";
import {
  type AdminScheduleRepeatPattern,
  buildRepeatedSchedulePayloads,
  clampRepeatCount,
  validateAdminScheduleInput,
} from "@/features/admin/admin-schedule-utils";
import {
  createAdminSchedule,
  deleteAdminSchedule,
  fetchAdminScheduleWorkspace,
  updateAdminSchedule,
} from "@/services/admin";
import type {
  AdminScheduleEvent,
  AdminScheduleScopeRef,
  AdminScheduleWorkspaceData,
} from "@/types/admin";
import type { ScheduleVisibilityType } from "@/types/attendance";

interface AdminScheduleFormState {
  title: string;
  categoryLabel: string;
  dateKey: string;
  timeLabel: string;
  locationLabel: string;
  visibilityType: ScheduleVisibilityType;
  visibilityScope: string;
  visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowStartAt: string;
  attendanceWindowEndAt: string;
}

interface AdminScheduleTemplate {
  id: string;
  name: string;
  title: string;
  categoryLabel: string;
  timeLabel: string;
  locationLabel: string;
  visibilityType: ScheduleVisibilityType;
  visibilityScope: string;
  visibilityLabel: string;
  requiresAttendanceCheck: boolean;
  attendanceWindowStartAt: string;
  attendanceWindowEndAt: string;
}

const defaultScheduleForm: AdminScheduleFormState = {
  title: "",
  categoryLabel: adminScheduleCategoryOptions[0],
  dateKey: "",
  timeLabel: "",
  locationLabel: "",
  visibilityType: "global" as ScheduleVisibilityType,
  visibilityScope: "global",
  visibilityLabel: "학원 전체 행사",
  requiresAttendanceCheck: false,
  attendanceWindowStartAt: "",
  attendanceWindowEndAt: "",
};

const ADMIN_SCHEDULE_TEMPLATE_STORAGE_KEY = "ai-edu-admin-schedule-templates-v1";

const CALENDAR_DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthKey: string, delta: number) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return toMonthKey(d);
}

export function AdminScheduleManager() {
  const [workspace, setWorkspace] = useState<AdminScheduleWorkspaceData>();
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();
  const [deletingScheduleId, setDeletingScheduleId] = useState<string>();
  const [editingScheduleId, setEditingScheduleId] = useState<string>();
  const [submittingSchedule, setSubmittingSchedule] = useState(false);
  const [form, setForm] = useState<AdminScheduleFormState>(defaultScheduleForm);
  const [repeatPattern, setRepeatPattern] = useState<AdminScheduleRepeatPattern>("NONE");
  const [repeatCount, setRepeatCount] = useState("4");
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState<AdminScheduleTemplate[]>([]);
  const [scheduleView, setScheduleView] = useState<"list" | "calendar">("list");
  const [calendarMonthKey, setCalendarMonthKey] = useState("");
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string>();

  const loadWorkspace = useCallback(async (withLoading = false) => {
    if (withLoading) {
      setLoading(true);
    }

    try {
      const data = await fetchAdminScheduleWorkspace();
      setWorkspace(data);
      setForm((prev) => syncScheduleFormScope(prev, data.scopes));
    } catch {
      setMessage({ type: "error", text: "학원 일정 워크스페이스를 불러오지 못했습니다." });
    } finally {
      if (withLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadWorkspace(true);
  }, [loadWorkspace]);

  useEffect(() => {
    setTemplates(readAdminScheduleTemplatesFromStorage());
  }, []);

  useEffect(() => {
    setCalendarMonthKey(toMonthKey(new Date()));
  }, []);

  useEffect(() => {
    const handleWorkspaceUpdate = () => {
      void loadWorkspace(false);
    };

    window.addEventListener(adminCourseWorkspaceUpdatedEvent, handleWorkspaceUpdate);
    return () => {
      window.removeEventListener(adminCourseWorkspaceUpdatedEvent, handleWorkspaceUpdate);
    };
  }, [loadWorkspace]);

  const scopeOptionsByType = useMemo(() => {
    const scopes = workspace?.scopes ?? [];
    const globalScopes = scopes.filter((scope) => scope.visibilityType === "global");
    const classScopes = scopes.filter((scope) => scope.visibilityType === "class");

    return {
      global: globalScopes,
      class: classScopes,
    } satisfies Record<ScheduleVisibilityType, typeof scopes>;
  }, [workspace?.scopes]);

  const selectedScopeOptions = scopeOptionsByType[form.visibilityType];
  const filteredSchedules = useMemo(() => {
    const schedules = workspace?.schedules ?? [];
    const normalizedKeyword = keyword.trim().toLowerCase();

    if (normalizedKeyword.length === 0) {
      return schedules;
    }

    return schedules.filter((schedule) =>
      [
        schedule.title,
        schedule.categoryLabel,
        schedule.visibilityLabel,
        schedule.dateKey,
        schedule.locationLabel,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword),
    );
  }, [keyword, workspace?.schedules]);

  const calendarDays = useMemo(() => {
    if (!calendarMonthKey) return [];
    const [year, month] = calendarMonthKey.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDate = new Date(year, month, 0).getDate();
    const leadingEmpty = (firstDay.getDay() + 6) % 7; // 월요일 시작
    const totalCells = Math.ceil((leadingEmpty + lastDate) / 7) * 7;

    return Array.from({ length: totalCells }, (_, index) => {
      const dayNumber = index - leadingEmpty + 1;
      if (dayNumber < 1 || dayNumber > lastDate) {
        return { dateKey: `empty-${index}`, dayNumber: "", events: [] as AdminScheduleEvent[] };
      }
      const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`;
      return {
        dateKey,
        dayNumber: String(dayNumber),
        events: filteredSchedules.filter((s) => s.dateKey === dateKey),
      };
    });
  }, [calendarMonthKey, filteredSchedules]);

  const selectedDayEvents = useMemo(
    () => calendarDays.find((d) => d.dateKey === selectedCalendarDateKey)?.events ?? [],
    [calendarDays, selectedCalendarDateKey],
  );

  const handleSubmitSchedule = async () => {
    const scope =
      selectedScopeOptions.find((option) => option.visibilityScope === form.visibilityScope) ??
      selectedScopeOptions[0];

    if (!scope) {
      setMessage({ type: "error", text: "노출 범위를 선택하세요." });
      return;
    }

    try {
      setSubmittingSchedule(true);
      const payload = {
        title: form.title.trim(),
        categoryLabel: form.categoryLabel,
        dateKey: form.dateKey,
        timeLabel: form.timeLabel.trim(),
        locationLabel: form.locationLabel.trim(),
        visibilityType: scope.visibilityType,
        visibilityScope: scope.visibilityScope,
        visibilityLabel: scope.visibilityLabel,
        requiresAttendanceCheck: form.requiresAttendanceCheck,
        attendanceWindowStartAt: form.attendanceWindowStartAt || undefined,
        attendanceWindowEndAt: form.attendanceWindowEndAt || undefined,
      };
      const validationError = validateAdminScheduleInput(payload);

      if (validationError) {
        setMessage({ type: "error", text: validationError });
        return;
      }
      const savedSchedules: AdminScheduleEvent[] = [];
      let failedCount = 0;

      if (editingScheduleId) {
        const saved = await updateAdminSchedule({
          scheduleId: editingScheduleId,
          ...payload,
        });
        savedSchedules.push(saved);
      } else {
        const repeatedPayloads = buildRepeatedSchedulePayloads({
          payload,
          repeatPattern,
          repeatCount: clampRepeatCount(Number(repeatCount)),
        });

        for (const repeatedPayload of repeatedPayloads) {
          try {
            const created = await createAdminSchedule(repeatedPayload);
            savedSchedules.push(created);
          } catch {
            failedCount += 1;
          }
        }
      }

      if (savedSchedules.length === 0) {
        throw new Error("NO_SCHEDULE_SAVED");
      }

      setWorkspace((prev) => mergeSavedSchedulesToWorkspace(prev, savedSchedules, editingScheduleId));
      setForm((prev) => ({
        ...defaultScheduleForm,
        visibilityType: prev.visibilityType,
        visibilityScope: prev.visibilityType === "global" ? "global" : prev.visibilityScope,
      }));
      setRepeatPattern("NONE");
      setRepeatCount("4");
      setEditingScheduleId(undefined);
      setMessage({
        type: "success",
        text: editingScheduleId
          ? `${savedSchedules[0].title} 일정을 수정했습니다.`
          : failedCount > 0
            ? `${savedSchedules.length}개 일정 등록 완료 (${failedCount}개 실패)`
            : `${savedSchedules.length}개 일정을 등록했습니다.`,
      });
    } catch {
      setMessage({
        type: "error",
        text: editingScheduleId ? "일정 수정에 실패했습니다." : "일정 등록에 실패했습니다.",
      });
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleSaveTemplate = () => {
    const normalizedName = templateName.trim();

    if (!normalizedName) {
      setMessage({ type: "error", text: "템플릿 이름을 입력하세요." });
      return;
    }

    if (!form.title.trim() || !form.timeLabel.trim() || !form.locationLabel.trim()) {
      setMessage({ type: "error", text: "템플릿 저장 전 제목/시간/장소를 입력하세요." });
      return;
    }

    const template: AdminScheduleTemplate = {
      id: `schedule-template-${Date.now()}`,
      name: normalizedName,
      title: form.title.trim(),
      categoryLabel: form.categoryLabel,
      timeLabel: form.timeLabel.trim(),
      locationLabel: form.locationLabel.trim(),
      visibilityType: form.visibilityType,
      visibilityScope: form.visibilityScope,
      visibilityLabel: form.visibilityLabel,
      requiresAttendanceCheck: form.requiresAttendanceCheck,
      attendanceWindowStartAt: form.attendanceWindowStartAt,
      attendanceWindowEndAt: form.attendanceWindowEndAt,
    };
    const nextTemplates = [template, ...templates].slice(0, 16);
    setTemplates(nextTemplates);
    writeAdminScheduleTemplatesToStorage(nextTemplates);
    setTemplateName("");
    setMessage({ type: "success", text: `${template.name} 템플릿을 저장했습니다.` });
  };

  if (loading) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">학원 일정을 불러오는 중입니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Academy Schedule</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">학원 일정 등록/관리</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            휴일 관리 대신 학원 전체 일정을 운영합니다. 등록한 일정은 같은 mock 소스를 통해 학생 캘린더와
            동일한 스키마로 동작합니다.
          </p>
        </div>
        <label className="block min-w-[280px]">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            일정 검색
          </span>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="제목 / 카테고리 / 범위 / 장소"
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
          />
        </label>
      </div>

      {message ? (
        <p
          className={`mt-3 text-sm font-semibold ${
            message.type === "success" ? "text-emerald-700" : "text-rose-600"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {/* 헤더 + 탭 토글 */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">등록 일정 전체</p>
              <p className="mt-1 text-xs text-slate-500">
                학원 전체/수업 범위를 포함한 모든 일정을 보여줍니다.
              </p>
            </div>
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(["list", "calendar"] as const).map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setScheduleView(view)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    scheduleView === view
                      ? "bg-ink text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {view === "list" ? "목록" : "캘린더"}
                </button>
              ))}
            </div>
          </div>

          {/* ── 목록 뷰 ── */}
          {scheduleView === "list" ? (
            <div className="mt-3 max-h-[600px] overflow-y-auto space-y-2 pr-1">
              {filteredSchedules.length === 0 ? (
                <p className="text-sm text-slate-500">표시할 일정이 없습니다.</p>
              ) : (
                filteredSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    isDeleting={deletingScheduleId === schedule.id}
                    onEdit={() => {
                      setEditingScheduleId(schedule.id);
                      setForm({
                        title: schedule.title,
                        categoryLabel: schedule.categoryLabel,
                        dateKey: schedule.dateKey,
                        timeLabel: schedule.timeLabel,
                        locationLabel: schedule.locationLabel,
                        visibilityType: schedule.visibilityType,
                        visibilityScope: schedule.visibilityScope,
                        visibilityLabel: schedule.visibilityLabel,
                        requiresAttendanceCheck: schedule.requiresAttendanceCheck,
                        attendanceWindowStartAt: schedule.attendanceWindowStartAt ?? "",
                        attendanceWindowEndAt: schedule.attendanceWindowEndAt ?? "",
                      });
                      setMessage(undefined);
                    }}
                    onDelete={async () => {
                      setDeletingScheduleId(schedule.id);
                      setMessage(undefined);
                      try {
                        await deleteAdminSchedule(schedule.id);
                        setWorkspace((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            schedules: prev.schedules.filter((item) => item.id !== schedule.id),
                          };
                        });
                        setMessage({ type: "success", text: `${schedule.title} 일정을 삭제했습니다.` });
                      } catch {
                        setMessage({ type: "error", text: "일정 삭제에 실패했습니다." });
                      } finally {
                        setDeletingScheduleId(undefined);
                      }
                    }}
                  />
                ))
              )}
            </div>
          ) : (
            /* ── 캘린더 뷰 ── */
            <div className="mt-3">
              {/* 월 네비게이션 */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMonthKey((prev) => shiftMonth(prev, -1));
                    setSelectedCalendarDateKey(undefined);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  ‹
                </button>
                <p className="text-sm font-semibold text-ink">
                  {calendarMonthKey
                    ? `${calendarMonthKey.split("-")[0]}년 ${Number(calendarMonthKey.split("-")[1])}월`
                    : ""}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarMonthKey((prev) => shiftMonth(prev, 1));
                    setSelectedCalendarDateKey(undefined);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                >
                  ›
                </button>
              </div>

              {/* 요일 헤더 */}
              <div className="mt-2 grid grid-cols-7 gap-px">
                {CALENDAR_DAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`py-1 text-center text-[11px] font-semibold ${
                      i === 5 ? "text-blue-400" : i === 6 ? "text-rose-400" : "text-slate-400"
                    }`}
                  >
                    {label}
                  </div>
                ))}
              </div>

              {/* 날짜 그리드 */}
              <div className="mt-1 grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-slate-200 bg-slate-200">
                {calendarDays.map((day) => {
                  const isSelected = day.dateKey === selectedCalendarDateKey;
                  const hasEvents = day.events.length > 0;
                  const dayNum = Number(day.dayNumber);
                  // 0=Sun,1=Mon..6=Sat → 그리드 위치로 역산
                  const colIndex = calendarDays.indexOf(day) % 7; // 0=Mon…5=Sat,6=Sun

                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      disabled={!day.dayNumber}
                      onClick={() =>
                        setSelectedCalendarDateKey(
                          isSelected ? undefined : day.dateKey,
                        )
                      }
                      className={`relative flex min-h-[52px] flex-col items-center gap-0.5 px-1 py-1.5 text-xs transition ${
                        !day.dayNumber
                          ? "bg-slate-50 cursor-default"
                          : isSelected
                          ? "bg-ink text-white"
                          : "bg-white hover:bg-slate-50"
                      }`}
                    >
                      {day.dayNumber ? (
                        <>
                          <span
                            className={`text-xs font-semibold ${
                              isSelected
                                ? "text-white"
                                : colIndex === 5
                                ? "text-blue-500"
                                : colIndex === 6
                                ? "text-rose-500"
                                : "text-ink"
                            }`}
                          >
                            {dayNum}
                          </span>
                          {hasEvents ? (
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-brand/10 text-brand"
                              }`}
                            >
                              {day.events.length}
                            </span>
                          ) : null}
                        </>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* 선택한 날짜의 일정 */}
              {selectedCalendarDateKey ? (
                <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                  <p className="text-xs font-semibold text-slate-500">
                    {selectedCalendarDateKey} 일정 ({selectedDayEvents.length}건)
                  </p>
                  {selectedDayEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">해당 날짜에 일정이 없습니다.</p>
                  ) : (
                    <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
                      {selectedDayEvents.map((schedule) => (
                        <ScheduleCard
                          key={schedule.id}
                          schedule={schedule}
                          isDeleting={deletingScheduleId === schedule.id}
                          onEdit={() => {
                            setEditingScheduleId(schedule.id);
                            setForm({
                              title: schedule.title,
                              categoryLabel: schedule.categoryLabel,
                              dateKey: schedule.dateKey,
                              timeLabel: schedule.timeLabel,
                              locationLabel: schedule.locationLabel,
                              visibilityType: schedule.visibilityType,
                              visibilityScope: schedule.visibilityScope,
                              visibilityLabel: schedule.visibilityLabel,
                              requiresAttendanceCheck: schedule.requiresAttendanceCheck,
                              attendanceWindowStartAt: schedule.attendanceWindowStartAt ?? "",
                              attendanceWindowEndAt: schedule.attendanceWindowEndAt ?? "",
                            });
                            setMessage(undefined);
                          }}
                          onDelete={async () => {
                            setDeletingScheduleId(schedule.id);
                            setMessage(undefined);
                            try {
                              await deleteAdminSchedule(schedule.id);
                              setWorkspace((prev) => {
                                if (!prev) return prev;
                                return {
                                  ...prev,
                                  schedules: prev.schedules.filter((item) => item.id !== schedule.id),
                                };
                              });
                              setMessage({ type: "success", text: `${schedule.title} 일정을 삭제했습니다.` });
                            } catch {
                              setMessage({ type: "error", text: "일정 삭제에 실패했습니다." });
                            } finally {
                              setDeletingScheduleId(undefined);
                            }
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-center text-xs text-slate-400">
                  날짜를 클릭하면 해당 일정을 볼 수 있습니다.
                </p>
              )}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {editingScheduleId ? "일정 수정" : "일정 등록"}
            </p>
            {editingScheduleId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingScheduleId(undefined);
                  setForm(defaultScheduleForm);
                  setRepeatPattern("NONE");
                  setRepeatCount("4");
                  setMessage(undefined);
                }}
                className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                취소
              </button>
            ) : null}
          </div>
          <div className="mt-3 space-y-2">
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                템플릿 일정
              </p>
              <div className="mt-2 grid gap-2 grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value=""
                  onChange={(event) => {
                    const selectedTemplate = templates.find(
                      (template) => template.id === event.target.value,
                    );

                    if (!selectedTemplate) {
                      return;
                    }

                    setForm((prev) =>
                      syncScheduleFormScope(
                        {
                          ...prev,
                          title: selectedTemplate.title,
                          categoryLabel: selectedTemplate.categoryLabel,
                          timeLabel: selectedTemplate.timeLabel,
                          locationLabel: selectedTemplate.locationLabel,
                          visibilityType: selectedTemplate.visibilityType,
                          visibilityScope: selectedTemplate.visibilityScope,
                          visibilityLabel: selectedTemplate.visibilityLabel,
                          requiresAttendanceCheck: selectedTemplate.requiresAttendanceCheck,
                          attendanceWindowStartAt: selectedTemplate.attendanceWindowStartAt,
                          attendanceWindowEndAt: selectedTemplate.attendanceWindowEndAt,
                        },
                        workspace?.scopes ?? [],
                      ),
                    );
                  }}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none"
                >
                  <option value="">저장된 템플릿 불러오기</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const nextTemplates = templates.slice(0, -1);
                    setTemplates(nextTemplates);
                    writeAdminScheduleTemplatesToStorage(nextTemplates);
                    setMessage({ type: "success", text: "마지막 템플릿을 삭제했습니다." });
                  }}
                  disabled={templates.length === 0}
                  className={`inline-flex h-9 items-center rounded-full border px-3 text-xs font-semibold ${
                    templates.length === 0
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                      : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  최근 템플릿 삭제
                </button>
              </div>
              <div className="mt-2 grid gap-2 grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={templateName}
                  onChange={(event) => setTemplateName(event.target.value)}
                  placeholder="현재 입력을 템플릿으로 저장"
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  템플릿 저장
                </button>
              </div>
            </div>

            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="일정 제목"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
            />
            <select
              value={form.categoryLabel}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, categoryLabel: event.target.value }))
              }
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
            >
              {adminScheduleCategoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <div className="grid gap-2 grid-cols-2">
              <input
                type="date"
                value={form.dateKey}
                onChange={(event) => setForm((prev) => ({ ...prev, dateKey: event.target.value }))}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={form.timeLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, timeLabel: event.target.value }))}
                placeholder="예: 09:30 - 11:00"
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <input
              value={form.locationLabel}
              onChange={(event) => setForm((prev) => ({ ...prev, locationLabel: event.target.value }))}
              placeholder="장소"
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
            />

            <div className="grid gap-2 grid-cols-2">
              <select
                value={form.visibilityType}
                onChange={(event) => {
                  const nextType = event.target.value as ScheduleVisibilityType;
                  const nextScope = scopeOptionsByType[nextType][0];

                  setForm((prev) => ({
                    ...prev,
                    visibilityType: nextType,
                    visibilityScope: nextScope?.visibilityScope ?? "",
                    visibilityLabel: nextScope?.visibilityLabel ?? "",
                  }));
                }}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                {(["global", "class"] as const).map((type) => (
                  <option key={type} value={type}>
                    {adminScheduleVisibilityTypeLabelMap[type]}
                  </option>
                ))}
              </select>
              <select
                value={form.visibilityScope}
                onChange={(event) => {
                  const selected = selectedScopeOptions.find(
                    (scope) => scope.visibilityScope === event.target.value,
                  );

                  setForm((prev) => ({
                    ...prev,
                    visibilityScope: event.target.value,
                    visibilityLabel: selected?.visibilityLabel ?? prev.visibilityLabel,
                  }));
                }}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                {selectedScopeOptions.map((scope) => (
                  <option key={scope.visibilityScope} value={scope.visibilityScope}>
                    {scope.visibilityLabel}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={form.requiresAttendanceCheck}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, requiresAttendanceCheck: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-brand"
              />
              <span className="text-sm font-semibold text-slate-700">필수 출석 일정</span>
            </label>

            {form.requiresAttendanceCheck ? (
              <div className="grid gap-2 grid-cols-2">
                <input
                  type="datetime-local"
                  value={form.attendanceWindowStartAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, attendanceWindowStartAt: event.target.value }))
                  }
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
                <input
                  type="datetime-local"
                  value={form.attendanceWindowEndAt}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, attendanceWindowEndAt: event.target.value }))
                  }
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
              </div>
            ) : null}

            {!editingScheduleId ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  반복 일정 등록
                </p>
                <div className="mt-2 grid gap-2 grid-cols-[minmax(0,1fr)_120px]">
                  <select
                    value={repeatPattern}
                    onChange={(event) =>
                      setRepeatPattern(event.target.value as AdminScheduleRepeatPattern)
                    }
                    className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none"
                  >
                    <option value="NONE">반복 없음(단일)</option>
                    <option value="DAILY">매일 반복</option>
                    <option value="WEEKLY">매주 반복</option>
                  </select>
                  <input
                    value={repeatCount}
                    onChange={(event) => setRepeatCount(event.target.value)}
                    disabled={repeatPattern === "NONE"}
                    placeholder="횟수"
                    className={`h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none ${
                      repeatPattern === "NONE" ? "cursor-not-allowed bg-slate-100" : ""
                    }`}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  반복 횟수는 최대 24회까지 등록됩니다.
                </p>
              </div>
            ) : null}

            <button
              type="button"
              disabled={submittingSchedule}
              onClick={handleSubmitSchedule}
              className={`inline-flex h-10 w-full items-center justify-center rounded-full px-4 text-sm font-semibold text-white ${
                submittingSchedule
                  ? "cursor-not-allowed bg-slate-300"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {editingScheduleId ? "일정 수정 저장" : "일정 등록"}
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

function ScheduleCard({
  schedule,
  isDeleting,
  onEdit,
  onDelete,
}: {
  schedule: AdminScheduleEvent;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{schedule.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {schedule.dateKey} · {schedule.timeLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">{schedule.locationLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
            {schedule.categoryLabel}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            {schedule.visibilityLabel}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              schedule.sourceType === "CUSTOM"
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {schedule.sourceType === "CUSTOM" ? "직접 등록" : "기본 일정"}
          </span>
          {schedule.requiresAttendanceCheck ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              필수 출석
            </span>
          ) : null}
        </div>
      </div>
      {schedule.requiresAttendanceCheck && schedule.attendanceWindowLabel ? (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          {schedule.attendanceWindowLabel}
        </p>
      ) : null}
      {schedule.sourceType === "CUSTOM" ? (
        <div className="mt-2 flex justify-end gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            수정
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onDelete}
            className={`inline-flex h-8 items-center rounded-full border border-slate-300 px-3 text-xs font-semibold text-slate-600 ${
              isDeleting ? "cursor-not-allowed bg-slate-100" : "bg-white hover:bg-slate-50"
            }`}
          >
            삭제
          </button>
        </div>
      ) : null}
    </article>
  );
}

function sortSchedule(a: AdminScheduleEvent, b: AdminScheduleEvent) {
  if (a.dateKey === b.dateKey) {
    return a.timeLabel.localeCompare(b.timeLabel, "ko");
  }

  return a.dateKey.localeCompare(b.dateKey, "ko");
}

function syncScheduleFormScope(form: AdminScheduleFormState, scopes: AdminScheduleScopeRef[]) {
  const scopeOptions = {
    global: scopes.filter((scope) => scope.visibilityType === "global"),
    class: scopes.filter((scope) => scope.visibilityType === "class"),
  } satisfies Record<ScheduleVisibilityType, AdminScheduleScopeRef[]>;

  const selectedScopes = scopeOptions[form.visibilityType];
  const current = selectedScopes.find((scope) => scope.visibilityScope === form.visibilityScope);

  if (current) {
    return {
      ...form,
      visibilityLabel: current.visibilityLabel,
    };
  }

  const fallbackScope = selectedScopes[0] ?? scopeOptions.global[0];

  if (!fallbackScope) {
    return form;
  }

  return {
    ...form,
    visibilityType: fallbackScope.visibilityType,
    visibilityScope: fallbackScope.visibilityScope,
    visibilityLabel: fallbackScope.visibilityLabel,
  };
}

function mergeSavedSchedulesToWorkspace(
  workspace: AdminScheduleWorkspaceData | undefined,
  savedSchedules: AdminScheduleEvent[],
  editingScheduleId?: string,
) {
  if (!workspace) {
    return workspace;
  }

  const scopesByKey = new Map<string, AdminScheduleScopeRef>(
    workspace.scopes.map((scope) => [`${scope.visibilityType}:${scope.visibilityScope}`, scope]),
  );

  for (const saved of savedSchedules) {
    const key = `${saved.visibilityType}:${saved.visibilityScope}`;

    if (!scopesByKey.has(key)) {
      scopesByKey.set(key, {
        visibilityType: saved.visibilityType,
        visibilityScope: saved.visibilityScope,
        visibilityLabel: saved.visibilityLabel,
      });
    }
  }

  const schedulesById = new Map<string, AdminScheduleEvent>(
    workspace.schedules.map((schedule) => [schedule.id, schedule]),
  );

  if (editingScheduleId) {
    schedulesById.delete(editingScheduleId);
  }

  for (const saved of savedSchedules) {
    schedulesById.set(saved.id, saved);
  }

  return {
    ...workspace,
    scopes: Array.from(scopesByKey.values()).sort((a, b) =>
      a.visibilityLabel.localeCompare(b.visibilityLabel, "ko"),
    ),
    schedules: Array.from(schedulesById.values()).sort((a, b) => sortSchedule(a, b)),
  };
}

function readAdminScheduleTemplatesFromStorage() {
  if (typeof window === "undefined") {
    return [] as AdminScheduleTemplate[];
  }

  const raw = window.localStorage.getItem(ADMIN_SCHEDULE_TEMPLATE_STORAGE_KEY);

  if (!raw) {
    return [] as AdminScheduleTemplate[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];

    if (!Array.isArray(parsed)) {
      return [] as AdminScheduleTemplate[];
    }

    return parsed
      .map((item) => normalizeAdminScheduleTemplate(item))
      .filter((item): item is AdminScheduleTemplate => Boolean(item));
  } catch {
    return [] as AdminScheduleTemplate[];
  }
}

function writeAdminScheduleTemplatesToStorage(templates: AdminScheduleTemplate[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_SCHEDULE_TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
}

function normalizeAdminScheduleTemplate(data: unknown): AdminScheduleTemplate | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const raw = data as Record<string, unknown>;

  if (
    typeof raw.id !== "string" ||
    typeof raw.name !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.categoryLabel !== "string" ||
    typeof raw.timeLabel !== "string" ||
    typeof raw.locationLabel !== "string"
  ) {
    return null;
  }

  return {
    id: raw.id,
    name: raw.name,
    title: raw.title,
    categoryLabel: raw.categoryLabel,
    timeLabel: raw.timeLabel,
    locationLabel: raw.locationLabel,
    visibilityType: raw.visibilityType === "class" ? "class" : "global",
    visibilityScope: typeof raw.visibilityScope === "string" ? raw.visibilityScope : "global",
    visibilityLabel:
      typeof raw.visibilityLabel === "string" ? raw.visibilityLabel : "학원 전체 행사",
    requiresAttendanceCheck: Boolean(raw.requiresAttendanceCheck),
    attendanceWindowStartAt:
      typeof raw.attendanceWindowStartAt === "string" ? raw.attendanceWindowStartAt : "",
    attendanceWindowEndAt:
      typeof raw.attendanceWindowEndAt === "string" ? raw.attendanceWindowEndAt : "",
  };
}
