"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  adminCourseCategoryOptions,
  adminCoursePacingTypeLabelMap,
  adminCourseMemberRoleLabelMap,
  adminCourseMemberRoleToneMap,
  adminCourseWorkspaceUpdatedEvent,
  adminCourseStatusLabelMap,
  adminCourseStatusToneMap,
} from "@/features/admin/admin-ui-config";
import {
  buildAssignableUsersForCourse,
  type AdminAssignableUserOption,
  isCourseStudentCapacityExceeded,
  validateAdminCourseDateWindow,
} from "@/features/admin/admin-academy-workspace-utils";
import {
  createAdminCourse,
  deleteAdminCourse,
  deleteAdminCourseMemberBinding,
  fetchAdminCourseWorkspace,
  searchAdminUsers,
  upsertAdminCourseMemberBinding,
} from "@/services/admin";
import type {
  AdminCourseMemberBinding,
  AdminCourseMemberRole,
  AdminCoursePacingType,
  AdminCourseWorkspaceData,
  AdminCourseWorkspaceUser,
} from "@/types/admin";

const adminCourseRoleCapabilityLabelMap: Record<AdminCourseMemberRole, string> = {
  STUDENT: "학원생: 수업/일정 조회만 가능",
  ASSISTANT: "조교: 수업 멤버 운영 + 당일 일정 변경 가능",
  INSTRUCTOR: "강사: 수업 등록/수정 + 일정 운영 가능",
};

function buildDefaultCourseDateWindow() {
  const today = new Date();
  const startDate = addDays(today, 7);
  const endDate = addDays(startDate, 83);
  const enrollmentStartDate = addDays(startDate, -14);
  const enrollmentEndDate = addDays(startDate, 7);

  return {
    startDate: formatDateKey(startDate),
    endDate: formatDateKey(endDate),
    enrollmentStartDate: formatDateKey(enrollmentStartDate),
    enrollmentEndDate: formatDateKey(enrollmentEndDate),
  };
}

export function AdminAcademyWorkspaceManager({
  defaultSelectedCourseId,
  singleCourseMode = false,
}: {
  defaultSelectedCourseId?: string;
  singleCourseMode?: boolean;
} = {}) {
  const [workspace, setWorkspace] = useState<AdminCourseWorkspaceData>();
  const [loading, setLoading] = useState(true);
  const [courseKeyword, setCourseKeyword] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>();
  const [memberKeyword, setMemberKeyword] = useState("");
  const [savingBindingKey, setSavingBindingKey] = useState<string>();
  const [deletingCourseId, setDeletingCourseId] = useState<string>();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string }>();

  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseCategory, setNewCourseCategory] = useState<string>(adminCourseCategoryOptions[0]);
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [customCategoryOptions, setCustomCategoryOptions] = useState<string[]>([]);
  const [newCourseSectionLabel, setNewCourseSectionLabel] = useState("");
  const [newCourseRoomLabel, setNewCourseRoomLabel] = useState("");
  const [newCourseCapacity, setNewCourseCapacity] = useState("");
  const [newCoursePacingType, setNewCoursePacingType] =
    useState<AdminCoursePacingType>("INSTRUCTOR_PACED");
  const [newCourseDates, setNewCourseDates] = useState(buildDefaultCourseDateWindow);

  const [pendingAssignUserId, setPendingAssignUserId] = useState<string>();
  const [assignUserNameInput, setAssignUserNameInput] = useState("");
  const [assignUserBirthDateInput, setAssignUserBirthDateInput] = useState("");
  const [assignUserIdInput, setAssignUserIdInput] = useState("");
  const [verifyingAssignUser, setVerifyingAssignUser] = useState(false);
  const [verifiedAssignUser, setVerifiedAssignUser] = useState<AdminCourseWorkspaceUser>();
  const [pendingAssignRole, setPendingAssignRole] = useState<AdminCourseMemberRole>("STUDENT");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchAdminCourseWorkspace()
      .then((data) => {
        if (cancelled) {
          return;
        }

        setWorkspace(data);
        const hasDefaultCourse = data.courses.some((course) => course.courseId === defaultSelectedCourseId);
        setSelectedCourseId(hasDefaultCourse ? defaultSelectedCourseId : data.courses[0]?.courseId);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setMessage({
          type: "error",
          text: "관리자 수업 워크스페이스를 불러오지 못했습니다.",
        });
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [defaultSelectedCourseId]);

  useEffect(() => {
    setCustomCategoryOptions(readCustomCourseCategoryOptionsFromStorage());
  }, []);

  const filteredCourses = useMemo(() => {
    if (!workspace) {
      return [];
    }

    if (singleCourseMode) {
      if (defaultSelectedCourseId) {
        return workspace.courses.filter((course) => course.courseId === defaultSelectedCourseId);
      }

      return workspace.courses.slice(0, 1);
    }

    const keyword = courseKeyword.trim().toLowerCase();

    if (keyword.length === 0) {
      return workspace.courses;
    }

    const filtered = workspace.courses.filter((course) =>
      [
        course.courseId,
        course.courseTitle,
        course.category,
        course.classScope,
        course.sectionLabel,
        course.roomLabel,
        course.startDate,
        course.endDate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );

    if (!selectedCourseId) {
      return filtered;
    }

    const selected = workspace.courses.find((course) => course.courseId === selectedCourseId);

    if (!selected || filtered.some((course) => course.courseId === selected.courseId)) {
      return filtered;
    }

    return [selected, ...filtered];
  }, [courseKeyword, defaultSelectedCourseId, selectedCourseId, singleCourseMode, workspace]);

  const selectedCourse = useMemo(() => {
    if (!workspace) {
      return undefined;
    }

    if (!selectedCourseId) {
      return workspace.courses[0];
    }

    return workspace.courses.find((course) => course.courseId === selectedCourseId) ?? workspace.courses[0];
  }, [selectedCourseId, workspace]);

  const memberRows = useMemo(() => {
    if (!workspace || !selectedCourse) {
      return [] as Array<{
        binding: AdminCourseMemberBinding;
        user: AdminCourseWorkspaceUser;
      }>;
    }

    const keyword = memberKeyword.trim().toLowerCase();
    const rows = workspace.memberBindings
      .filter((binding) => binding.courseId === selectedCourse.courseId)
      .map((binding) => {
        const user = workspace.users.find((candidate) => candidate.userId === binding.userId);
        return user ? { binding, user } : null;
      })
      .filter((row): row is { binding: AdminCourseMemberBinding; user: AdminCourseWorkspaceUser } =>
        Boolean(row),
      );

    if (keyword.length === 0) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.user.userName,
        row.user.userId,
        row.user.birthDate,
        row.user.title,
        adminCourseMemberRoleLabelMap[row.binding.role],
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }, [memberKeyword, selectedCourse, workspace]);

  const assignableUsers = useMemo(() => {
    if (!workspace) {
      return [] as AdminAssignableUserOption[];
    }

    return buildAssignableUsersForCourse({
      courseId: selectedCourse?.courseId,
      users: workspace.users,
      memberBindings: workspace.memberBindings,
    });
  }, [selectedCourse?.courseId, workspace]);

  const courseCategoryToggleOptions = useMemo(() => {
    const existingCategories = workspace?.courses.map((course) => course.category) ?? [];
    const merged = [
      ...adminCourseCategoryOptions,
      ...customCategoryOptions,
      ...existingCategories,
    ];

    return Array.from(new Set(merged));
  }, [customCategoryOptions, workspace?.courses]);

  const roleCount = useMemo(() => {
    return memberRows.reduce<Record<AdminCourseMemberRole, number>>(
      (acc, row) => {
        acc[row.binding.role] += 1;
        return acc;
      },
      {
        INSTRUCTOR: 0,
        ASSISTANT: 0,
        STUDENT: 0,
      },
    );
  }, [memberRows]);

  const selectedPendingUser = useMemo(
    () => assignableUsers.find((item) => item.user.userId === pendingAssignUserId),
    [assignableUsers, pendingAssignUserId],
  );
  const selectedCourseStudentCount = roleCount.STUDENT;
  const isPendingStudentCapacityExceeded = Boolean(
    selectedCourse &&
      pendingAssignRole === "STUDENT" &&
      isCourseStudentCapacityExceeded({
        capacity: selectedCourse.capacity,
        currentStudentCount: selectedCourseStudentCount,
        currentUserRole: selectedPendingUser?.assignedRole,
        nextRole: pendingAssignRole,
      }),
  );

  useEffect(() => {
    setPendingAssignUserId(undefined);
    setAssignUserNameInput("");
    setAssignUserBirthDateInput("");
    setAssignUserIdInput("");
    setVerifiedAssignUser(undefined);
    setPendingAssignRole("STUDENT");
  }, [selectedCourse?.courseId]);

  const handleAddCustomCategoryOption = () => {
    const category = newCustomCategory.trim();

    if (!category) {
      setMessage({ type: "error", text: "추가할 카테고리를 입력하세요." });
      return;
    }

    setCustomCategoryOptions((prev) => {
      const next = Array.from(new Set([...prev, category])).sort((a, b) =>
        a.localeCompare(b, "ko"),
      );
      writeCustomCourseCategoryOptionsToStorage(next);
      return next;
    });
    setNewCourseCategory(category);
    setNewCustomCategory("");
    setMessage({ type: "success", text: `${category} 카테고리를 추가했습니다.` });
  };

  const handleCreateCourse = async () => {
    const title = newCourseTitle.trim();

    if (!title) {
      setMessage({ type: "error", text: "수업명을 입력하세요." });
      return;
    }

    if (!newCourseCategory.trim()) {
      setMessage({ type: "error", text: "카테고리를 선택하거나 추가하세요." });
      return;
    }

    const capacity = newCourseCapacity.trim().length > 0
      ? Number(newCourseCapacity.trim())
      : undefined;

    if (typeof capacity === "number" && (!Number.isFinite(capacity) || capacity <= 0)) {
      setMessage({ type: "error", text: "정원은 1명 이상의 숫자로 입력하세요." });
      return;
    }

    const dateWindowError = validateAdminCourseDateWindow(newCourseDates);

    if (dateWindowError) {
      setMessage({ type: "error", text: dateWindowError });
      return;
    }

    try {
      const created = await createAdminCourse({
        courseTitle: title,
        category: newCourseCategory,
        sectionLabel: newCourseSectionLabel.trim() || undefined,
        roomLabel: newCourseRoomLabel.trim() || undefined,
        capacity: typeof capacity === "number" ? Math.floor(capacity) : undefined,
        startDate: newCourseDates.startDate,
        endDate: newCourseDates.endDate,
        enrollmentStartDate: newCourseDates.enrollmentStartDate,
        enrollmentEndDate: newCourseDates.enrollmentEndDate,
        pacingType: newCoursePacingType,
      });
      setWorkspace((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          courses: [...prev.courses, created].sort((a, b) =>
            a.courseTitle.localeCompare(b.courseTitle, "ko"),
          ),
        };
      });
      setCustomCategoryOptions((prev) => {
        const next = Array.from(new Set([...prev, created.category])).sort((a, b) =>
          a.localeCompare(b, "ko"),
        );
        writeCustomCourseCategoryOptionsToStorage(next);
        return next;
      });
      setSelectedCourseId(created.courseId);
      setCourseKeyword("");
      setNewCourseTitle("");
      setNewCourseSectionLabel("");
      setNewCourseRoomLabel("");
      setNewCourseCapacity("");
      setNewCoursePacingType("INSTRUCTOR_PACED");
      setNewCourseDates(buildDefaultCourseDateWindow());
      window.dispatchEvent(new CustomEvent(adminCourseWorkspaceUpdatedEvent));
      setMessage({
        type: "success",
        text: `${created.courseTitle} 수업을 추가했습니다.`,
      });
    } catch {
      setMessage({ type: "error", text: "수업 추가에 실패했습니다." });
    }
  };

  const handleVerifyAssignUser = async () => {
    const userName = assignUserNameInput.trim();
    const birthDate = assignUserBirthDateInput.trim();
    const userId = assignUserIdInput.trim().toLowerCase();

    if (!userName || !birthDate || !userId) {
      setMessage({ type: "error", text: "이름, 생년월일, 아이디를 모두 입력하세요." });
      setVerifiedAssignUser(undefined);
      setPendingAssignUserId(undefined);
      return;
    }

    if (!/^[a-z0-9._-]+$/.test(userId)) {
      setMessage({
        type: "error",
        text: "아이디는 영문 소문자, 숫자, '.', '_', '-'만 사용할 수 있습니다.",
      });
      setVerifiedAssignUser(undefined);
      setPendingAssignUserId(undefined);
      return;
    }

    if (!isValidBirthDateKey(birthDate)) {
      setMessage({
        type: "error",
        text: "생년월일은 YYYY-MM-DD 형식으로 입력하세요.",
      });
      setVerifiedAssignUser(undefined);
      setPendingAssignUserId(undefined);
      return;
    }

    setVerifyingAssignUser(true);

    try {
      const users = await searchAdminUsers(userId);
      const candidate = users.find((user) => user.userId.toLowerCase() === userId);

      if (!candidate) {
        throw new Error("USER_NOT_FOUND");
      }

      if (normalizeNameKey(candidate.userName) !== normalizeNameKey(userName)) {
        throw new Error("USER_NAME_MISMATCH");
      }

      if ((candidate.birthDate ?? "") !== birthDate) {
        throw new Error("USER_BIRTHDATE_MISMATCH");
      }

      setVerifiedAssignUser(candidate);
      setPendingAssignUserId(candidate.userId);
      setPendingAssignRole(
        assignableUsers.find((item) => item.user.userId === candidate.userId)?.assignedRole ??
          candidate.defaultRole,
      );
      setWorkspace((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          users: mergeUsersById(prev.users, [candidate]),
        };
      });
      setMessage({
        type: "success",
        text: `${candidate.userName}(${candidate.userId}) 사용자 확인이 완료되었습니다.`,
      });
    } catch (error) {
      setVerifiedAssignUser(undefined);
      setPendingAssignUserId(undefined);
      setMessage({
        type: "error",
        text: resolveUserVerificationErrorMessage(error),
      });
    } finally {
      setVerifyingAssignUser(false);
    }
  };

  const handleAssignMember = async () => {
    if (!workspace || !selectedCourse || !pendingAssignUserId || !verifiedAssignUser) {
      setMessage({ type: "error", text: "사용자 검증 후 멤버를 등록하세요." });
      return;
    }

    const bindingKey = `${selectedCourse.courseId}:${pendingAssignUserId}`;
    const alreadyAssigned = workspace.memberBindings.some(
      (binding) => binding.courseId === selectedCourse.courseId && binding.userId === pendingAssignUserId,
    );

    if (isPendingStudentCapacityExceeded) {
      setMessage({
        type: "error",
        text: `정원(${selectedCourse.capacity}명)이 가득 차 학원생을 추가할 수 없습니다.`,
      });
      return;
    }

    setSavingBindingKey(bindingKey);
    setMessage(undefined);

    try {
      const saved = await upsertAdminCourseMemberBinding({
        courseId: selectedCourse.courseId,
        userId: pendingAssignUserId,
        role: pendingAssignRole,
      });
      setWorkspace((prev) => {
        if (!prev) {
          return prev;
        }

        const withoutCurrent = prev.memberBindings.filter(
          (binding) => !(binding.courseId === saved.courseId && binding.userId === saved.userId),
        );

        return {
          ...prev,
          memberBindings: [...withoutCurrent, saved],
        };
      });
      setMessage({
        type: "success",
        text: alreadyAssigned ? "수업 멤버 권한을 변경했습니다." : "수업 멤버를 등록했습니다.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: resolveAdminMemberBindingErrorMessage(error, selectedCourse.capacity),
      });
    } finally {
      setSavingBindingKey(undefined);
    }
  };

  const handleDeleteSelectedCourse = async () => {
    if (!workspace || !selectedCourse) {
      return;
    }

    const shouldDelete = window.confirm(
      `${selectedCourse.courseTitle} 수업을 삭제하면 멤버 배정과 해당 수업 scope 일정도 함께 정리됩니다. 계속하시겠습니까?`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingCourseId(selectedCourse.courseId);
    setMessage(undefined);

    try {
      await deleteAdminCourse(selectedCourse.courseId);
      let nextSelectedCourseId: string | undefined;
      setWorkspace((prev) => {
        if (!prev) {
          return prev;
        }

        const nextCourses = prev.courses.filter((course) => course.courseId !== selectedCourse.courseId);
        nextSelectedCourseId = nextCourses[0]?.courseId;

        return {
          ...prev,
          courses: nextCourses,
          memberBindings: prev.memberBindings.filter(
            (binding) => binding.courseId !== selectedCourse.courseId,
          ),
        };
      });
      setSelectedCourseId(nextSelectedCourseId);
      window.dispatchEvent(new CustomEvent(adminCourseWorkspaceUpdatedEvent));
      setMessage({ type: "success", text: `${selectedCourse.courseTitle} 수업을 삭제했습니다.` });
    } catch {
      setMessage({ type: "error", text: "수업 삭제에 실패했습니다." });
    } finally {
      setDeletingCourseId(undefined);
    }
  };

  if (loading) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">관리자 수업 워크스페이스를 불러오는 중입니다.</p>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">Academy Workspace</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            {singleCourseMode ? "수업 상세 운영" : "수업/멤버 권한 관리"}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {singleCourseMode
              ? "선택한 수업의 멤버 권한, 정원, 일정 scope 연동 상태를 상세하게 운영합니다."
              : "학원 전체 수업을 기준으로 강사·조교·학원생 권한을 등록합니다. 강사 목록은 강의 카탈로그와 제출 피드백 이력을 함께 참조해 누락 없이 노출합니다."}
          </p>
        </div>
        <div className="grid min-w-[280px] gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-600">
          <p>수업 {workspace?.courses.length ?? 0}개</p>
          <p>사용자 {workspace?.users.length ?? 0}명</p>
          <p>멤버 배정 {workspace?.memberBindings.length ?? 0}건</p>
        </div>
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

      <div
        className={`mt-5 grid gap-5 ${
          singleCourseMode ? "xl:grid-cols-1" : "xl:grid-cols-[320px_minmax(0,1fr)]"
        }`}
      >
        {!singleCourseMode ? (
          <aside className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">수업 추가</p>
            <input
              value={newCourseTitle}
              onChange={(event) => setNewCourseTitle(event.target.value)}
              placeholder="예: AI Product Engineering 4기"
              className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {courseCategoryToggleOptions.map((category) => {
                const active = category === newCourseCategory;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setNewCourseCategory(category)}
                    className={`inline-flex h-8 items-center rounded-full border px-3 text-xs font-semibold ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-white p-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                기타 카테고리 추가
              </p>
              <div className="mt-1.5 grid gap-2 grid-cols-[minmax(0,1fr)_auto]">
                <input
                  value={newCustomCategory}
                  onChange={(event) => setNewCustomCategory(event.target.value)}
                  placeholder="직접 입력"
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCategoryOption}
                  className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  추가
                </button>
              </div>
            </div>
            <div className="mt-2 grid gap-2 grid-cols-2">
              <input
                value={newCourseSectionLabel}
                onChange={(event) => setNewCourseSectionLabel(event.target.value)}
                placeholder="분반명(예: 4기 A반)"
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              />
              <input
                value={newCourseRoomLabel}
                onChange={(event) => setNewCourseRoomLabel(event.target.value)}
                placeholder="강의실/온라인 룸"
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <div className="mt-2 grid gap-2 grid-cols-2">
              <input
                value={newCourseCapacity}
                onChange={(event) => setNewCourseCapacity(event.target.value)}
                placeholder="정원(선택)"
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              />
              <select
                value={newCoursePacingType}
                onChange={(event) => setNewCoursePacingType(event.target.value as AdminCoursePacingType)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              >
                {(["INSTRUCTOR_PACED", "SELF_PACED"] as const).map((pacingType) => (
                  <option key={pacingType} value={pacingType}>
                    {adminCoursePacingTypeLabelMap[pacingType]}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-2 grid gap-2 grid-cols-2">
              <label className="text-[11px] font-semibold text-slate-500">
                수업 시작일
                <input
                  type="date"
                  value={newCourseDates.startDate}
                  onChange={(event) =>
                    setNewCourseDates((prev) => ({ ...prev, startDate: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-500">
                수업 종료일
                <input
                  type="date"
                  value={newCourseDates.endDate}
                  onChange={(event) =>
                    setNewCourseDates((prev) => ({ ...prev, endDate: event.target.value }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
              </label>
            </div>
            <div className="mt-2 grid gap-2 grid-cols-2">
              <label className="text-[11px] font-semibold text-slate-500">
                모집 시작일
                <input
                  type="date"
                  value={newCourseDates.enrollmentStartDate}
                  onChange={(event) =>
                    setNewCourseDates((prev) => ({
                      ...prev,
                      enrollmentStartDate: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-500">
                모집 종료일
                <input
                  type="date"
                  value={newCourseDates.enrollmentEndDate}
                  onChange={(event) =>
                    setNewCourseDates((prev) => ({
                      ...prev,
                      enrollmentEndDate: event.target.value,
                    }))
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleCreateCourse}
              className="mt-3 inline-flex h-9 items-center rounded-full bg-slate-900 px-3.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              수업 등록
            </button>
          </article>
        </aside>
        ) : null}

        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            {!singleCourseMode ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  수업 검색 → 수업 선택
                </p>
                <input
                  value={courseKeyword}
                  onChange={(event) => setCourseKeyword(event.target.value)}
                  placeholder="수업명 / 카테고리 / scope / 분반 / 기간"
                  className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                />
                <div className="mt-2 max-h-[220px] space-y-2 overflow-auto pr-1">
                  {filteredCourses.length === 0 ? (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      검색 결과가 없습니다.
                    </p>
                  ) : (
                    filteredCourses.map((course) => {
                      const selected = selectedCourse?.courseId === course.courseId;

                      return (
                        <button
                          key={course.courseId}
                          type="button"
                          onClick={() => {
                            setSelectedCourseId(course.courseId);
                            setMessage(undefined);
                          }}
                          className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
                            selected
                              ? "border-brand bg-brand/5"
                              : "border-slate-200 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-ink">{course.courseTitle}</p>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${adminCourseStatusToneMap[course.status]}`}
                            >
                              {adminCourseStatusLabelMap[course.status]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {course.category} · {course.sectionLabel} · {course.classScope}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {course.startDate} ~ {course.endDate}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            ) : null}

            <div
              className={`flex flex-wrap items-start justify-between gap-3 ${
                singleCourseMode ? "" : "mt-3"
              }`}
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {selectedCourse ? selectedCourse.courseTitle : "선택된 수업 없음"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedCourse
                    ? selectedCourse.classScope
                    : singleCourseMode
                      ? "수업 정보를 불러오는 중입니다."
                      : "상단 검색에서 수업을 선택하세요."}
                </p>
                {selectedCourse ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {selectedCourse.startDate} ~ {selectedCourse.endDate} · 모집{" "}
                    {selectedCourse.enrollmentStartDate} ~ {selectedCourse.enrollmentEndDate}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {singleCourseMode ? (
                  <Link
                    href="/admin"
                    className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    전체 수업으로
                  </Link>
                ) : null}
                {!singleCourseMode && selectedCourse ? (
                  <Link
                    href={`/admin/courses/${selectedCourse.courseId}`}
                    className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    수업 상세 페이지
                  </Link>
                ) : null}
                {selectedCourse ? (
                  <Link
                    href={`/admin/courses/${selectedCourse.courseId}/audit`}
                    className="inline-flex h-7 items-center rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    감사 로그
                  </Link>
                ) : null}
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  강사 {roleCount.INSTRUCTOR}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  조교 {roleCount.ASSISTANT}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  학원생 {roleCount.STUDENT}/{selectedCourse?.capacity ?? 0}
                </span>
              </div>
            </div>
            {selectedCourse ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  분반 {selectedCourse.sectionLabel}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  장소 {selectedCourse.roomLabel}
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  정원 {selectedCourse.capacity}명
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {adminCoursePacingTypeLabelMap[selectedCourse.pacingType]}
                </span>
                <button
                  type="button"
                  disabled={deletingCourseId === selectedCourse.courseId}
                  onClick={handleDeleteSelectedCourse}
                  className={`inline-flex h-7 items-center rounded-full border px-2.5 text-xs font-semibold ${
                    deletingCourseId === selectedCourse.courseId
                      ? "cursor-not-allowed border-rose-200 bg-rose-100 text-rose-500"
                      : "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  수업 삭제
                </button>
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  회원정보 검증
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-12">
                  <label className="block xl:col-span-4">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-500">이름</span>
                    <input
                      value={assignUserNameInput}
                      onChange={(event) => {
                        setAssignUserNameInput(event.target.value);
                        setVerifiedAssignUser(undefined);
                        setPendingAssignUserId(undefined);
                      }}
                      placeholder="회원 이름 입력 (예: 김하나)"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                  <label className="block xl:col-span-3">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-500">생년월일</span>
                    <input
                      type="text"
                      value={assignUserBirthDateInput}
                      onChange={(event) => {
                        setAssignUserBirthDateInput(event.target.value);
                        setVerifiedAssignUser(undefined);
                        setPendingAssignUserId(undefined);
                      }}
                      placeholder="YYYY-MM-DD"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                  <label className="block xl:col-span-3">
                    <span className="mb-1 block text-[11px] font-semibold text-slate-500">아이디</span>
                    <input
                      value={assignUserIdInput}
                      onChange={(event) => {
                        setAssignUserIdInput(event.target.value);
                        setVerifiedAssignUser(undefined);
                        setPendingAssignUserId(undefined);
                      }}
                      placeholder="예: student-kim-hana"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                  <div className="xl:col-span-2 xl:self-end">
                    <button
                      type="button"
                      disabled={verifyingAssignUser}
                      onClick={handleVerifyAssignUser}
                      className={`inline-flex h-11 w-full items-center justify-center rounded-full px-4 text-sm font-semibold text-white ${
                        verifyingAssignUser
                          ? "cursor-not-allowed bg-slate-300"
                          : "bg-slate-900 hover:bg-slate-800"
                      }`}
                    >
                      {verifyingAssignUser ? "검증 중..." : "사용자 검증"}
                    </button>
                  </div>
                </div>
              </div>

              {verifiedAssignUser ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  검증됨: {verifiedAssignUser.userName} · {verifiedAssignUser.birthDate ?? "미등록"} ·{" "}
                  {verifiedAssignUser.userId}
                  {selectedPendingUser?.assignedRole
                    ? ` (기등록 역할: ${adminCourseMemberRoleLabelMap[selectedPendingUser.assignedRole]})`
                    : ""}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  회원가입된 사용자의 이름/생년월일/아이디가 모두 일치할 때만 멤버 등록이 가능합니다.
                </p>
              )}

              <div className="grid gap-2 lg:grid-cols-[140px_auto]">
                <select
                  value={pendingAssignRole}
                  onChange={(event) => setPendingAssignRole(event.target.value as AdminCourseMemberRole)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
                >
                  {(["INSTRUCTOR", "ASSISTANT", "STUDENT"] as const).map((role) => (
                    <option key={role} value={role}>
                      {adminCourseMemberRoleLabelMap[role]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={
                    !selectedCourse ||
                    !pendingAssignUserId ||
                    !verifiedAssignUser ||
                    Boolean(savingBindingKey) ||
                    isPendingStudentCapacityExceeded
                  }
                  onClick={handleAssignMember}
                  className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-white ${
                    !selectedCourse ||
                    !pendingAssignUserId ||
                    !verifiedAssignUser ||
                    Boolean(savingBindingKey) ||
                    isPendingStudentCapacityExceeded
                      ? "cursor-not-allowed bg-slate-300"
                      : "bg-slate-900 hover:bg-slate-800"
                  }`}
                >
                  {selectedPendingUser?.assignedRole ? "권한 변경" : "멤버 등록"}
                </button>
              </div>
              <p className="text-xs text-slate-500">{adminCourseRoleCapabilityLabelMap[pendingAssignRole]}</p>
            {selectedCourse && isPendingStudentCapacityExceeded ? (
              <p className="text-xs font-semibold text-rose-600">
                정원({selectedCourse.capacity}명) 초과로 학원생 배정이 불가합니다. 강사/조교 배정은 계속 가능합니다.
              </p>
            ) : null}
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                멤버 검색
              </span>
              <input
                value={memberKeyword}
                onChange={(event) => setMemberKeyword(event.target.value)}
                placeholder="이름 / 생년월일 / 아이디 / 역할"
                className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none"
              />
            </label>

            <div className="mt-3 space-y-2">
              {memberRows.length === 0 ? (
                <p className="text-sm text-slate-500">등록된 멤버가 없습니다.</p>
              ) : (
                memberRows.map((row) => {
                  const bindingKey = `${row.binding.courseId}:${row.binding.userId}`;
                  const saving = savingBindingKey === bindingKey;

                  return (
                    <article
                      key={bindingKey}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-semibold text-ink">{row.user.userName}</p>
                        <p className="text-xs text-slate-500">
                          생년월일 {row.user.birthDate ?? "미등록"} · 아이디 {row.user.userId} · {row.user.title}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {adminCourseRoleCapabilityLabelMap[row.binding.role]}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${adminCourseMemberRoleToneMap[row.binding.role]}`}
                        >
                          {adminCourseMemberRoleLabelMap[row.binding.role]}
                        </span>
                        <select
                          value={row.binding.role}
                          onChange={async (event) => {
                            const nextRole = event.target.value as AdminCourseMemberRole;
                            if (
                              selectedCourse &&
                              isCourseStudentCapacityExceeded({
                                capacity: selectedCourse.capacity,
                                currentStudentCount: selectedCourseStudentCount,
                                currentUserRole: row.binding.role,
                                nextRole,
                              })
                            ) {
                              setMessage({
                                type: "error",
                                text: `정원(${selectedCourse.capacity}명)이 가득 차 학원생으로 변경할 수 없습니다.`,
                              });
                              return;
                            }

                            setSavingBindingKey(bindingKey);
                            setMessage(undefined);

                            try {
                              const saved = await upsertAdminCourseMemberBinding({
                                courseId: row.binding.courseId,
                                userId: row.binding.userId,
                                role: nextRole,
                              });
                              setWorkspace((prev) => {
                                if (!prev) {
                                  return prev;
                                }

                                return {
                                  ...prev,
                                  memberBindings: prev.memberBindings.map((binding) =>
                                    binding.courseId === saved.courseId && binding.userId === saved.userId
                                      ? saved
                                      : binding,
                                  ),
                                };
                              });
                              setMessage({
                                type: "success",
                                text: `${row.user.userName} 권한을 변경했습니다.`,
                              });
                            } catch (error) {
                              setMessage({
                                type: "error",
                                text: resolveAdminMemberBindingErrorMessage(error, selectedCourse?.capacity),
                              });
                            } finally {
                              setSavingBindingKey(undefined);
                            }
                          }}
                          disabled={saving}
                          className={`h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 outline-none ${
                            saving ? "cursor-not-allowed opacity-60" : ""
                          }`}
                        >
                          {(["INSTRUCTOR", "ASSISTANT", "STUDENT"] as const).map((role) => (
                            <option key={role} value={role}>
                              {adminCourseMemberRoleLabelMap[role]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            setSavingBindingKey(bindingKey);
                            setMessage(undefined);

                            try {
                              await deleteAdminCourseMemberBinding({
                                courseId: row.binding.courseId,
                                userId: row.binding.userId,
                              });
                              setWorkspace((prev) => {
                                if (!prev) {
                                  return prev;
                                }

                                return {
                                  ...prev,
                                  memberBindings: prev.memberBindings.filter(
                                    (binding) =>
                                      !(
                                        binding.courseId === row.binding.courseId &&
                                        binding.userId === row.binding.userId
                                      ),
                                  ),
                                };
                              });
                              setMessage({
                                type: "success",
                                text: `${row.user.userName} 배정을 해제했습니다.`,
                              });
                            } catch {
                              setMessage({ type: "error", text: "배정 해제에 실패했습니다." });
                            } finally {
                              setSavingBindingKey(undefined);
                            }
                          }}
                          className={`inline-flex h-8 items-center rounded-lg border border-slate-300 px-2.5 text-xs font-semibold text-slate-600 ${
                            saving ? "cursor-not-allowed opacity-60" : "hover:bg-slate-50"
                          }`}
                        >
                          해제
                        </button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </article>

        </div>
      </div>
    </section>
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const ADMIN_CUSTOM_COURSE_CATEGORY_STORAGE_KEY = "ai-edu-admin-custom-course-categories-v1";

function readCustomCourseCategoryOptionsFromStorage() {
  if (typeof window === "undefined") {
    return [] as string[];
  }

  const raw = window.localStorage.getItem(ADMIN_CUSTOM_COURSE_CATEGORY_STORAGE_KEY);

  if (!raw) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];

    if (!Array.isArray(parsed)) {
      return [] as string[];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [] as string[];
  }
}

function writeCustomCourseCategoryOptionsToStorage(categories: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    ADMIN_CUSTOM_COURSE_CATEGORY_STORAGE_KEY,
    JSON.stringify(Array.from(new Set(categories))),
  );
}

function mergeUsersById(
  primary: AdminCourseWorkspaceUser[],
  secondary: AdminCourseWorkspaceUser[],
) {
  const merged = new Map<string, AdminCourseWorkspaceUser>();

  for (const user of primary) {
    merged.set(user.userId, user);
  }

  for (const user of secondary) {
    merged.set(user.userId, user);
  }

  return Array.from(merged.values());
}

function normalizeNameKey(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function resolveUserVerificationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "USER_NOT_FOUND") {
      return "입력한 아이디로 가입된 사용자를 찾을 수 없습니다.";
    }

    if (error.message === "USER_NAME_MISMATCH") {
      return "입력한 이름이 회원정보와 일치하지 않습니다.";
    }

    if (error.message === "USER_BIRTHDATE_MISMATCH") {
      return "입력한 생년월일이 회원정보와 일치하지 않습니다.";
    }
  }

  return "사용자 검증에 실패했습니다.";
}

function isValidBirthDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return (
    parsed.getFullYear() === Number(value.slice(0, 4)) &&
    parsed.getMonth() + 1 === Number(value.slice(5, 7)) &&
    parsed.getDate() === Number(value.slice(8, 10))
  );
}

function resolveAdminMemberBindingErrorMessage(error: unknown, capacity?: number) {
  if (error instanceof Error && error.message === "COURSE_CAPACITY_EXCEEDED") {
    return capacity
      ? `정원(${capacity}명)이 가득 차 학원생을 배정할 수 없습니다.`
      : "정원이 가득 차 학원생을 배정할 수 없습니다.";
  }

  return "수업 멤버 저장에 실패했습니다.";
}
