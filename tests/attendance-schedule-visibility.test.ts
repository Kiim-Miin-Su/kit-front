import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEffectiveAllowedScheduleScopes,
  isScheduleVisibleForScopes,
} from "../src/features/attendance/attendance-schedule-visibility.ts";

const globalEvent = {
  id: "s-global",
  title: "학원 전체 공지",
  categoryLabel: "운영",
  dateKey: "2026-04-10",
  dateLabel: "4월 10일 금요일",
  timeLabel: "09:00 - 10:00",
  locationLabel: "온라인",
  visibilityType: "global" as const,
  visibilityScope: "global",
  visibilityLabel: "학원 전체 행사",
  requiresAttendanceCheck: false,
};

const classEvent = {
  ...globalEvent,
  id: "s-class",
  title: "프론트엔드 수업",
  visibilityType: "class" as const,
  visibilityScope: "ai-product-engineering-3",
  visibilityLabel: "AI Product Engineering 3기 수업",
};

test("buildEffectiveAllowedScheduleScopes always includes global and classScope", () => {
  const scopes = buildEffectiveAllowedScheduleScopes({
    allowedScheduleScopes: [],
    classScope: "ai-product-engineering-3",
  });

  assert.deepEqual(scopes, ["global", "ai-product-engineering-3"]);
});

test("isScheduleVisibleForScopes always shows global schedules", () => {
  const visible = isScheduleVisibleForScopes({
    schedule: globalEvent,
    allowedScheduleScopes: ["ai-product-engineering-3"],
  });

  assert.equal(visible, true);
});

test("isScheduleVisibleForScopes hides class schedules outside allowed scopes", () => {
  const visible = isScheduleVisibleForScopes({
    schedule: classEvent,
    allowedScheduleScopes: ["global", "another-class"],
  });

  assert.equal(visible, false);
});
