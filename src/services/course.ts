import { mockCourseCatalog } from "@/features/course/mock-course-data";
import { api } from "@/services/api";
import type { CourseCatalog, CourseDetail } from "@/types/course";

export async function fetchCourseCatalog() {
  try {
    const { data } = await api.get<CourseCatalog>("/courses");
    return data;
  } catch {
    return mockCourseCatalog;
  }
}

export async function fetchCourseBySlug(slug: string) {
  try {
    const { data } = await api.get<CourseDetail>(`/courses/${slug}`);
    return data;
  } catch {
    return mockCourseCatalog.courses.find((course) => course.slug === slug)
      ?? (mockCourseCatalog.featuredCourse.slug === slug
        ? mockCourseCatalog.featuredCourse
        : null);
  }
}

export async function fetchLearnCourse(slug?: string | null) {
  if (slug) {
    const course = await fetchCourseBySlug(slug);

    if (course) {
      return course;
    }
  }

  return (
    mockCourseCatalog.courses.find((course) => course.enrollmentStatus === "ACTIVE") ??
    mockCourseCatalog.featuredCourse
  );
}

export async function fetchMyLearningCourses() {
  try {
    const { data } = await api.get<CourseDetail[]>("/me/courses");
    return data.filter(
      (course) => course.enrollmentStatus === "ACTIVE" || course.enrollmentStatus === "PENDING",
    );
  } catch {
    return [
      mockCourseCatalog.featuredCourse,
      ...mockCourseCatalog.courses.filter(
        (course) => course.enrollmentStatus === "ACTIVE" || course.enrollmentStatus === "PENDING",
      ),
    ];
  }
}
