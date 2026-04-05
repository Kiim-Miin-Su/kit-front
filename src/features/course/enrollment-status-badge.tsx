import { enrollmentStatusMap } from "@/features/course/enrollment-status";
import type { EnrollmentStatus } from "@/types/course";

export function EnrollmentStatusBadge({
  status,
}: {
  status: EnrollmentStatus;
}) {
  const content = enrollmentStatusMap[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${content.className}`}
    >
      {content.label}
    </span>
  );
}
