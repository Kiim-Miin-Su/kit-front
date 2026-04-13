"use client";

import type { ReactNode } from "react";

import { useAuthStore } from "@/store/auth-store";
import type { UserRole } from "@/types/auth";

type AllowedRole = Exclude<UserRole, "guest">;

export function RoleGate({
  allowedRoles,
  children,
  deniedFallback,
}: {
  allowedRoles: AllowedRole[];
  children: ReactNode;
  deniedFallback?: ReactNode;
}) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const role = useAuthStore((state) => state.getRole());
  const bypassEnabled = process.env.NEXT_PUBLIC_DEV_ROLE_BYPASS === "true";
  const hasRole = allowedRoles.includes(role as AllowedRole);

  if (!hydrated) {
    return (
      <section className="rounded-[24px] border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">권한 정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (hasRole) {
    return <>{children}</>;
  }

  if (bypassEnabled) {
    return <>{children}</>;
  }

  return (
    deniedFallback ?? (
      <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm font-semibold text-rose-700">접근 권한이 없습니다.</p>
        <p className="mt-2 text-sm text-rose-700">
          이 화면은 `{allowedRoles.join(", ")}` 역할만 접근할 수 있습니다.
        </p>
      </section>
    )
  );
}
