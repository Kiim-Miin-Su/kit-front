import { mockCourseCatalog } from "@/features/course/mock-course-data";
import { MarketingHome } from "@/features/home/marketing-home";

export default function HomePage() {
  return <MarketingHome catalog={mockCourseCatalog} />;
}
