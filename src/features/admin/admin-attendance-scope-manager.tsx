"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  fetchAdminAttendanceScopeWorkspace,
  updateAdminAttendanceScopePolicy,
} from "@/services/admin";
import type { AdminAttendanceScopeWorkspaceData } from "@/types/admin";

export function AdminAttendanceScopeManager({ courseId }: { courseId: string }) {
  const [workspace, setWorkspace] = useState<AdminAttendanceScopeWorkspaceData>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingScopes, setPendingScopes] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();

  const loadWorkspace = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchAdminAttendanceScopeWorkspace(courseId);
      setWorkspace(data);
      setPendingScopes(data.allowedScheduleScopes);
      setMessage(undefined);
    } catch {
      setMessage({ type: "error", text: "출석 scope 워크스페이스를 불러오지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const selectedScopeSet = useMemo(() => new Set(pendingScopes), [pendingScopes]);

  const handleToggleScope = (scope: string) => {
    setPendingScopes((prev) => {
      if (scope === "global" || scope === workspace?.classScope) {
        return prev;
      }

      if (prev.includes(scope)) {
        return prev.filter((item) => item !== scope);
      }

      return [...prev, scope];
    });
  };

  const handleSave = async () => {
    if (!workspace) {
      return;
    }

    setSaving(true);

    try {
      const saved = await updateAdminAttendanceScopePolicy({
        courseId: workspace.courseId,
        allowedScheduleScopes: pendingScopes,
      });
      setWorkspace(saved);
      setPendingScopes(saved.allowedScheduleScopes);
      setMessage({ type: "success", text: "출석 일정 scope 정책을 저장했습니다." });
    } catch {
      setMessage({ type: "error", text: "출석 일정 scope 정책 저장에 실패했습니다." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">출석 scope 정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (!workspace) {
    return null;
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Attendance Scope</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">출석 일정 scope 관리</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {workspace.courseTitle} 수업 학생이 볼 수 있는 일정 scope를 편집합니다. `global`과 본인 수업
            scope는 필수입니다.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold text-white ${
            saving ? "cursor-not-allowed bg-slate-300" : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          정책 저장
        </button>
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

      <div className="mt-4 grid gap-2">
        {workspace.availableScopes.map((scope) => {
          const checked = selectedScopeSet.has(scope.visibilityScope);
          const locked =
            scope.visibilityScope === "global" || scope.visibilityScope === workspace.classScope;

          return (
            <label
              key={`${scope.visibilityType}:${scope.visibilityScope}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-ink">{scope.visibilityLabel}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {scope.visibilityType === "global" ? "학원 공통" : `scope: ${scope.visibilityScope}`}
                </p>
              </div>
              <input
                type="checkbox"
                checked={checked}
                disabled={locked}
                onChange={() => handleToggleScope(scope.visibilityScope)}
                className={`h-4 w-4 rounded border-slate-300 text-brand ${
                  locked ? "cursor-not-allowed opacity-70" : ""
                }`}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
