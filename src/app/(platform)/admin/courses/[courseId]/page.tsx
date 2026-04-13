import { RoleGate } from "@/components/auth/role-gate";
import { PageIntro } from "@/components/layout/page-intro";
import { AdminAcademyWorkspaceManager } from "@/features/admin/admin-academy-workspace-manager";
import { AdminAttendanceScopeManager } from "@/features/admin/admin-attendance-scope-manager";
import Link from "next/link";

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Admin"
        title="수업 상세 운영"
        description="선택 수업의 멤버 권한/정원/일정 연동을 상세 관리합니다."
      />
      <RoleGate allowedRoles={["admin"]}>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/courses/${courseId}/audit`}
            className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            수업 감사 로그 보기
          </Link>
        </div>
        <AdminAcademyWorkspaceManager defaultSelectedCourseId={courseId} singleCourseMode />
        <AdminAttendanceScopeManager courseId={courseId} />
      </RoleGate>
    </div>
  );
}
