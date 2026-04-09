import type { StudentScheduleEvent } from "@/types/attendance";

export function buildEffectiveAllowedScheduleScopes({
  allowedScheduleScopes,
  classScope,
}: {
  allowedScheduleScopes: string[];
  classScope: string;
}): string[] {
  const scopes = allowedScheduleScopes.filter((scope) => scope.length > 0);

  if (!scopes.includes("global")) {
    scopes.unshift("global");
  }

  if (classScope && !scopes.includes(classScope)) {
    scopes.push(classScope);
  }

  return Array.from(new Set(scopes));
}

export function isScheduleVisibleForScopes({
  schedule,
  allowedScheduleScopes,
}: {
  schedule: StudentScheduleEvent;
  allowedScheduleScopes: string[];
}) {
  if (schedule.visibilityType === "global") {
    return true;
  }

  return allowedScheduleScopes.includes(schedule.visibilityScope);
}
