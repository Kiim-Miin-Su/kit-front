export interface AttendanceScopePolicyRecord {
  courseId: string;
  classScope: string;
  allowedScheduleScopes: string[];
  updatedAt: string;
}

const ADMIN_ATTENDANCE_SCOPE_POLICY_STORAGE_KEY = "ai-edu-admin-attendance-scope-policy-v1";

export function readAttendanceScopePolicyByCourseId(courseId: string) {
  const map = readAttendanceScopePolicyMap();
  return map[courseId];
}

export function readAttendanceScopePolicyByClassScope(classScope: string) {
  const map = readAttendanceScopePolicyMap();

  return Object.values(map).find((record) => record.classScope === classScope);
}

export function upsertAttendanceScopePolicyRecord(input: {
  courseId: string;
  classScope: string;
  allowedScheduleScopes: string[];
}) {
  const map = readAttendanceScopePolicyMap();
  map[input.courseId] = {
    courseId: input.courseId,
    classScope: input.classScope,
    allowedScheduleScopes: Array.from(new Set(input.allowedScheduleScopes)),
    updatedAt: new Date().toISOString(),
  };

  writeAttendanceScopePolicyMap(map);
}

export function removeAttendanceScopePolicyRecord(courseId: string) {
  const map = readAttendanceScopePolicyMap();

  if (map[courseId]) {
    delete map[courseId];
    writeAttendanceScopePolicyMap(map);
  }
}

function readAttendanceScopePolicyMap(): Record<string, AttendanceScopePolicyRecord> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(ADMIN_ATTENDANCE_SCOPE_POLICY_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, AttendanceScopePolicyRecord> = {};

    Object.entries(parsed).forEach(([courseId, value]) => {
      const normalized = normalizeAttendanceScopePolicyRecord(courseId, value);

      if (normalized) {
        result[courseId] = normalized;
      }
    });

    return result;
  } catch {
    return {};
  }
}

function writeAttendanceScopePolicyMap(map: Record<string, AttendanceScopePolicyRecord>) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(ADMIN_ATTENDANCE_SCOPE_POLICY_STORAGE_KEY, JSON.stringify(map));
}

function normalizeAttendanceScopePolicyRecord(
  courseId: string,
  value: unknown,
): AttendanceScopePolicyRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const classScope =
    typeof raw.classScope === "string" && raw.classScope.length > 0
      ? raw.classScope
      : typeof raw.courseId === "string" && raw.courseId.length > 0
        ? raw.courseId
        : "";
  const allowedScheduleScopes = Array.isArray(raw.allowedScheduleScopes)
    ? raw.allowedScheduleScopes.filter((scope): scope is string => typeof scope === "string")
    : [];

  if (!classScope || allowedScheduleScopes.length === 0) {
    return null;
  }

  return {
    courseId,
    classScope,
    allowedScheduleScopes,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date(0).toISOString(),
  };
}
