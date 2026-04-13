import { LearnPlayerView } from "@/features/learn/learn-player-view";
import { fetchLearnCourse } from "@/services/course";

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{
    courseSlug?: string;
    previewLessonId?: string;
  }>;
}) {
  const { courseSlug, previewLessonId } = await searchParams;
  const course = await fetchLearnCourse(courseSlug);
  const selectedLesson =
    course.curriculumPreview.find((lesson) => lesson.id === previewLessonId) ??
    course.curriculumPreview[0];
  const isPreviewMode = Boolean(selectedLesson?.isPreview);

  return (
    <LearnPlayerView
      course={course}
      selectedLesson={selectedLesson}
      isPreviewMode={isPreviewMode}
    />
  );
}
