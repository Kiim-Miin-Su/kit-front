import { notFound } from "next/navigation";

import { CourseDetailView } from "@/features/course/course-detail-view";
import { fetchCourseBySlug } from "@/services/course";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const course = await fetchCourseBySlug(courseSlug);

  if (!course) {
    notFound();
  }

  return <CourseDetailView course={course} />;
}
