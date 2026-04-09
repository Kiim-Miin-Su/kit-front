import assert from "node:assert/strict";
import test from "node:test";

import {
  buildRepeatedSchedulePayloads,
  clampRepeatCount,
  validateAdminScheduleInput,
} from "../src/features/admin/admin-schedule-utils.ts";

test("clampRepeatCount limits value between 1 and 24", () => {
  assert.equal(clampRepeatCount(0), 1);
  assert.equal(clampRepeatCount(4.7), 4);
  assert.equal(clampRepeatCount(30), 24);
});

test("buildRepeatedSchedulePayloads returns one payload when repeat is NONE", () => {
  const payloads = buildRepeatedSchedulePayloads({
    payload: {
      title: "오전 출석 체크",
      categoryLabel: "필수 출석",
      dateKey: "2026-04-10",
      timeLabel: "09:00 - 09:20",
      locationLabel: "A강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: true,
      attendanceWindowStartAt: "2026-04-10T09:00",
      attendanceWindowEndAt: "2026-04-10T09:20",
    },
    repeatPattern: "NONE",
    repeatCount: 12,
  });

  assert.equal(payloads.length, 1);
  assert.equal(payloads[0].dateKey, "2026-04-10");
});

test("buildRepeatedSchedulePayloads expands weekly schedules with shifted dates", () => {
  const payloads = buildRepeatedSchedulePayloads({
    payload: {
      title: "정규 수업",
      categoryLabel: "수업",
      dateKey: "2026-04-10",
      timeLabel: "10:00 - 12:00",
      locationLabel: "A강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: false,
    },
    repeatPattern: "WEEKLY",
    repeatCount: 3,
  });

  assert.deepEqual(payloads.map((item) => item.dateKey), [
    "2026-04-10",
    "2026-04-17",
    "2026-04-24",
  ]);
});

test("buildRepeatedSchedulePayloads shifts attendance windows for daily repeat", () => {
  const payloads = buildRepeatedSchedulePayloads({
    payload: {
      title: "오후 출석",
      categoryLabel: "필수 출석",
      dateKey: "2026-04-10",
      timeLabel: "13:00 - 13:20",
      locationLabel: "A강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: true,
      attendanceWindowStartAt: "2026-04-10T13:00",
      attendanceWindowEndAt: "2026-04-10T13:20",
    },
    repeatPattern: "DAILY",
    repeatCount: 2,
  });

  assert.equal(payloads.length, 2);
  assert.equal(payloads[1].attendanceWindowStartAt, "2026-04-11T13:00");
  assert.equal(payloads[1].attendanceWindowEndAt, "2026-04-11T13:20");
});

test("buildRepeatedSchedulePayloads keeps invalid dateKey unchanged", () => {
  const payloads = buildRepeatedSchedulePayloads({
    payload: {
      title: "테스트 일정",
      categoryLabel: "운영",
      dateKey: "2026-02-30",
      timeLabel: "10:00 - 11:00",
      locationLabel: "A강의실",
      visibilityType: "class",
      visibilityScope: "ai-product-engineering-3",
      visibilityLabel: "AI Product Engineering 3기 수업",
      requiresAttendanceCheck: false,
    },
    repeatPattern: "DAILY",
    repeatCount: 2,
  });

  assert.deepEqual(payloads.map((item) => item.dateKey), ["2026-02-30", "2026-02-30"]);
});

test("validateAdminScheduleInput validates required and date fields", () => {
  const result = validateAdminScheduleInput({
    title: "수업 일정",
    categoryLabel: "수업",
    dateKey: "2026-04-10",
    timeLabel: "10:00 - 11:00",
    locationLabel: "A강의실",
    visibilityType: "class",
    visibilityScope: "ai-product-engineering-3",
    visibilityLabel: "AI Product Engineering 3기 수업",
    requiresAttendanceCheck: false,
  });

  assert.equal(result, null);
});

test("validateAdminScheduleInput rejects impossible dateKey", () => {
  const result = validateAdminScheduleInput({
    title: "수업 일정",
    categoryLabel: "수업",
    dateKey: "2026-02-30",
    timeLabel: "10:00 - 11:00",
    locationLabel: "A강의실",
    visibilityType: "class",
    visibilityScope: "ai-product-engineering-3",
    visibilityLabel: "AI Product Engineering 3기 수업",
    requiresAttendanceCheck: false,
  });

  assert.equal(result, "일정 날짜는 YYYY-MM-DD 형식의 유효한 날짜여야 합니다.");
});

test("validateAdminScheduleInput rejects invalid attendance window range", () => {
  const result = validateAdminScheduleInput({
    title: "출석 체크",
    categoryLabel: "필수 출석",
    dateKey: "2026-04-10",
    timeLabel: "09:00 - 09:20",
    locationLabel: "A강의실",
    visibilityType: "class",
    visibilityScope: "ai-product-engineering-3",
    visibilityLabel: "AI Product Engineering 3기 수업",
    requiresAttendanceCheck: true,
    attendanceWindowStartAt: "2026-04-10T09:30",
    attendanceWindowEndAt: "2026-04-10T09:20",
  });

  assert.equal(result, "출석 시작 시각은 종료 시각보다 늦을 수 없습니다.");
});

test("validateAdminScheduleInput rejects global scope mismatch", () => {
  const result = validateAdminScheduleInput({
    title: "학원 공지",
    categoryLabel: "운영",
    dateKey: "2026-04-10",
    timeLabel: "10:00 - 11:00",
    locationLabel: "온라인",
    visibilityType: "global",
    visibilityScope: "ai-product-engineering-3",
    visibilityLabel: "학원 전체 행사",
    requiresAttendanceCheck: false,
  });

  assert.equal(result, "학원 전체 일정은 visibilityScope가 global이어야 합니다.");
});
