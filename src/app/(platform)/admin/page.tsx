import { PageIntro } from "@/components/layout/page-intro";
import { StatusPanel } from "@/components/layout/status-panel";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Admin"
        title="관리자 운영 페이지 베이스"
        description="운영 현황과 통계를 붙일 관리 영역의 기본 셸입니다. 공통 네비게이션과 상태 패널을 공유합니다."
      />
      <StatusPanel
        label="API 준비"
        value="Interceptor"
        description="401 응답 처리와 인증 헤더 주입이 공통 axios 클라이언트에 연결되어 있습니다."
      />
    </div>
  );
}
