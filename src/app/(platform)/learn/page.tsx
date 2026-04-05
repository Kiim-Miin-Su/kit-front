import { LearnPlayerView } from "@/features/course/learn-player-view";
import { fetchLearnCourse, fetchMyLearningCourses } from "@/services/course";

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{
    courseSlug?: string;
    previewLessonId?: string;
  }>;
}) {
  const { courseSlug, previewLessonId } = await searchParams;
  const learningCourses = await fetchMyLearningCourses();
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
      learningCourses={learningCourses}
    />
  );
}
