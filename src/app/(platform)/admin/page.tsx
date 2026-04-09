import { PageIntro } from "@/components/layout/page-intro";
import { AdminAcademyWorkspaceManager } from "@/features/admin/admin-academy-workspace-manager";
import { AdminScheduleManager } from "@/features/admin/admin-schedule-manager";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Admin"
        title="관리자 운영 페이지"
        description="학원 수업/권한과 전체 일정을 운영합니다."
      />
      <AdminAcademyWorkspaceManager />
      <AdminScheduleManager />
    </div>
  );
}
