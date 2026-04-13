import { PageIntro } from "@/components/layout/page-intro";
import { studentAttendanceProfile } from "@/features/attendance/mock-attendance-data";
import { StudentAttendanceWorkspace } from "@/features/attendance/student-attendance-workspace";
import { StudentSubmissionWorkspace } from "@/features/submission/student-submission-workspace";
import type { StudentWorkspaceTab } from "@/types/attendance";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab: StudentWorkspaceTab =
    resolvedSearchParams?.tab === "calendar" ? "calendar" : "attendance";

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Student"
        title="학생 운영과 출석 흐름을 한 화면에서 관리합니다"
        description="관리자가 연결한 국비지원 과정, 반 권한, 필수 출석 일정 기준으로 학생이 볼 수 있는 운영 화면을 정리했습니다."
      />
      <StudentAttendanceWorkspace profile={studentAttendanceProfile} initialTab={activeTab} />
      <StudentSubmissionWorkspace />
    </div>
  );
}
