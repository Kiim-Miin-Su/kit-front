import { PageIntro } from "@/components/layout/page-intro";
import { CourseCatalogView } from "@/features/course/course-catalog";
import { fetchCourseCatalog } from "@/services/course";

export default async function CoursesPage() {
  const catalog = await fetchCourseCatalog();

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Courses"
        title="강의 목록 페이지"
        description="비로그인 사용자는 강의를 탐색하고, 로그인 사용자는 자신의 수강 상태를 확인할 수 있는 카탈로그 화면입니다. 검색, 카테고리, 정렬을 기준으로 빠르게 강의를 훑을 수 있습니다."
      />
      <CourseCatalogView {...catalog} />
    </div>
  );
}
