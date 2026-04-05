export type CourseLevel = "입문" | "중급" | "심화";

export type EnrollmentStatus =
  | "NOT_ENROLLED"
  | "PENDING"
  | "ACTIVE"
  | "COMPLETED";

export interface CourseInstructor {
  name: string;
  title: string;
}

export interface CourseLessonPreview {
  id: string;
  title: string;
  durationLabel: string;
  isPreview?: boolean;
  summary?: string;
  headers?: string[];
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  tags: string[];
  level: CourseLevel;
  durationLabel: string;
  lessonCount: number;
  priceLabel: string;
  rating: number;
  reviewCount: number;
  enrollmentCount: number;
  thumbnailTone: string;
  instructor: CourseInstructor;
  enrollmentStatus: EnrollmentStatus;
  isFeatured?: boolean;
}

export interface CourseDetail extends CourseSummary {
  learningPoints: string[];
  curriculumPreview: CourseLessonPreview[];
}

export interface CourseCatalog {
  featuredCourse: CourseDetail;
  courses: CourseDetail[];
  categories: string[];
}
