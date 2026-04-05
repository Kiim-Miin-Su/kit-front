import { PageIntro } from "@/components/layout/page-intro";
import { StatusPanel } from "@/components/layout/status-panel";

export default function InstructorDashboardPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Instructor"
        title="강사 콘솔 시작점"
        description="강의 생성, 수정, 업로드 관리 화면을 붙일 강사 전용 콘솔의 초기 자리입니다."
      />
      <StatusPanel
        label="라우트 그룹"
        value="Organized"
        description="강사 영역을 플랫폼 라우트 그룹 아래로 정리해 공통 셸을 공유하도록 맞췄습니다."
      />
    </div>
  );
}
