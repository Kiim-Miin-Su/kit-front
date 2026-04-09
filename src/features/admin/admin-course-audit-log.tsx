"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  adminCourseAuditActionLabelMap,
  adminCourseAuditActionToneMap,
} from "@/features/admin/admin-ui-config";
import {
  fetchAdminCourseAssignmentAudit,
  fetchAdminCourseWorkspace,
} from "@/services/admin";
import type { AdminCourseAssignmentAuditEvent } from "@/types/admin";

export function AdminCourseAuditLog({ courseId }: { courseId: string }) {
  const [events, setEvents] = useState<AdminCourseAssignmentAuditEvent[]>([]);
  const [courseTitle, setCourseTitle] = useState<string>(courseId);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();

  const loadAuditLog = useCallback(async () => {
    setLoading(true);

    try {
      const [workspace, auditEvents] = await Promise.all([
        fetchAdminCourseWorkspace(),
        fetchAdminCourseAssignmentAudit(courseId),
      ]);
      const course = workspace.courses.find((item) => item.courseId === courseId);

      setCourseTitle(course?.courseTitle ?? courseId);
      setEvents(auditEvents);
      setMessage(undefined);
    } catch {
      setMessage({ type: "error", text: "수업 감사 로그를 불러오지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void loadAuditLog();
  }, [loadAuditLog]);

  const groupedByAssignment = useMemo(() => {
    const map = new Map<
      string,
      {
        assignmentId: string;
        assignmentTitle: string;
        events: AdminCourseAssignmentAuditEvent[];
      }
    >();

    for (const event of events) {
      const existing = map.get(event.assignmentId);

      if (existing) {
        existing.events.push(event);
        continue;
      }

      map.set(event.assignmentId, {
        assignmentId: event.assignmentId,
        assignmentTitle: event.assignmentTitle,
        events: [event],
      });
    }

    return Array.from(map.values());
  }, [events]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Course Audit</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">수업 감사 로그</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {courseTitle} 수업의 과제/제출/리뷰 변경 이벤트를 시간순으로 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadAuditLog()}
          className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          새로고침
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

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">감사 로그를 불러오는 중입니다.</p>
      ) : groupedByAssignment.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">표시할 과제 이력이 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {groupedByAssignment.map((assignment) => (
            <article
              key={assignment.assignmentId}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <p className="text-sm font-semibold text-ink">{assignment.assignmentTitle}</p>
              <p className="mt-1 text-xs text-slate-500">과제 ID: {assignment.assignmentId}</p>

              <div className="mt-3 space-y-2">
                {assignment.events.map((event) => (
                  <div
                    key={event.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {event.actorName} · {event.actorRole}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDateTime(event.occurredAt)}
                        {event.submissionId ? ` · 제출 ${event.submissionId}` : ""}
                      </p>
                      {event.note ? <p className="mt-1 text-xs text-slate-600">{event.note}</p> : null}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${adminCourseAuditActionToneMap[event.action]}`}
                    >
                      {adminCourseAuditActionLabelMap[event.action]}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function formatDateTime(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}
