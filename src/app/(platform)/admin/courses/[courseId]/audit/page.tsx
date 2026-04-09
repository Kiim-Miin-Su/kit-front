import Link from "next/link";

import { PageIntro } from "@/components/layout/page-intro";
import { AdminCourseAuditLog } from "@/features/admin/admin-course-audit-log";

export default async function AdminCourseAuditPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  return (
    <div className="space-y-6">
      <PageIntro
        eyebrow="Admin"
        title="수업 감사 로그"
        description="과정별 과제/제출/리뷰 이력을 시간순으로 조회합니다."
      />
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/admin/courses/${courseId}`}
          className="inline-flex h-9 items-center rounded-full border border-slate-300 bg-white px-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          수업 상세로 돌아가기
        </Link>
      </div>
      <AdminCourseAuditLog courseId={courseId} />
    </div>
  );
}
