import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAssignableUsersForCourse,
  isCourseStudentCapacityExceeded,
  validateAdminCourseDateWindow,
} from "../src/features/admin/admin-academy-workspace-utils.ts";

test("validateAdminCourseDateWindow accepts a valid date range", () => {
  const result = validateAdminCourseDateWindow({
    startDate: "2026-05-01",
    endDate: "2026-07-30",
    enrollmentStartDate: "2026-04-10",
    enrollmentEndDate: "2026-05-05",
  });

  assert.equal(result, null);
});

test("validateAdminCourseDateWindow rejects when course start is after end", () => {
  const result = validateAdminCourseDateWindow({
    startDate: "2026-08-01",
    endDate: "2026-07-30",
    enrollmentStartDate: "2026-06-01",
    enrollmentEndDate: "2026-06-15",
  });

  assert.equal(result, "수업 시작일은 종료일보다 늦을 수 없습니다.");
});

test("validateAdminCourseDateWindow rejects when enrollment end is after course end", () => {
  const result = validateAdminCourseDateWindow({
    startDate: "2026-05-01",
    endDate: "2026-06-30",
    enrollmentStartDate: "2026-04-01",
    enrollmentEndDate: "2026-07-01",
  });

  assert.equal(result, "모집 종료일은 수업 종료일을 넘을 수 없습니다.");
});

test("validateAdminCourseDateWindow rejects impossible date values", () => {
  const result = validateAdminCourseDateWindow({
    startDate: "2026-02-30",
    endDate: "2026-06-30",
    enrollmentStartDate: "2026-04-01",
    enrollmentEndDate: "2026-04-20",
  });

  assert.equal(result, "수업 기간과 모집 기간을 모두 입력하세요.");
});

test("buildAssignableUsersForCourse keeps assigned users in option list", () => {
  const users = [
    { userId: "u1", userName: "강사A", title: "Instructor", defaultRole: "INSTRUCTOR" as const },
    { userId: "u2", userName: "학생A", title: "Student", defaultRole: "STUDENT" as const },
  ];
  const memberBindings = [
    { courseId: "c1", userId: "u1", role: "INSTRUCTOR" as const },
  ];

  const options = buildAssignableUsersForCourse({
    courseId: "c1",
    users,
    memberBindings,
  });

  assert.equal(options.length, 2);
  assert.equal(options.find((option) => option.user.userId === "u1")?.assignedRole, "INSTRUCTOR");
  assert.equal(options.find((option) => option.user.userId === "u2")?.assignedRole, undefined);
});

test("isCourseStudentCapacityExceeded excludes instructor/assistant from capacity", () => {
  assert.equal(
    isCourseStudentCapacityExceeded({
      capacity: 1,
      currentStudentCount: 1,
      currentUserRole: "INSTRUCTOR",
      nextRole: "ASSISTANT",
    }),
    false,
  );
});

test("isCourseStudentCapacityExceeded blocks new student when capacity is full", () => {
  assert.equal(
    isCourseStudentCapacityExceeded({
      capacity: 2,
      currentStudentCount: 2,
      currentUserRole: "ASSISTANT",
      nextRole: "STUDENT",
    }),
    true,
  );
});

test("isCourseStudentCapacityExceeded allows already-assigned student update", () => {
  assert.equal(
    isCourseStudentCapacityExceeded({
      capacity: 2,
      currentStudentCount: 2,
      currentUserRole: "STUDENT",
      nextRole: "STUDENT",
    }),
    false,
  );
});
