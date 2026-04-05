import type { EnrollmentStatus } from "@/types/course";

export interface EnrollmentStatusMeta {
  label: string;
  className: string;
  description: string;
  actionLabel: string;
  actionDisabled: boolean;
}

export const enrollmentStatusMap: Record<EnrollmentStatus, EnrollmentStatusMeta> = {
  NOT_ENROLLED: {
    label: "미수강",
    className: "bg-slate-100 text-slate-700",
    description: "아직 수강 권한이 없습니다. 결제 또는 관리자 승인 이후 학습을 시작할 수 있습니다.",
    actionLabel: "수강 신청 필요",
    actionDisabled: true,
  },
  PENDING: {
    label: "승인 대기",
    className: "bg-amber-100 text-amber-800",
    description: "수강 승인 처리 전입니다. 승인 완료 후 플레이어 입장이 열립니다.",
    actionLabel: "승인 대기 중",
    actionDisabled: true,
  },
  ACTIVE: {
    label: "수강 중",
    className: "bg-emerald-100 text-emerald-800",
    description: "현재 수강 권한이 활성화되어 있습니다. 바로 학습을 이어서 진행할 수 있습니다.",
    actionLabel: "플레이어로 이동",
    actionDisabled: false,
  },
  COMPLETED: {
    label: "수강 완료",
    className: "bg-sky-100 text-sky-800",
    description: "수강은 완료됐지만 현재 정책상 학습 플레이어는 활성 수강 상태에서만 진입합니다.",
    actionLabel: "활성 수강 필요",
    actionDisabled: true,
  },
};
