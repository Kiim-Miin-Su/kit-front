"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  instructor: "강사",
  assistant: "보조 강사",
  student: "학생",
  guest: "비로그인",
};

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  instructor: "/instructor",
  assistant: "/instructor",
  student: "/student",
  guest: "/sign-in",
};

export default function UnauthorizedPage() {
  const searchParams = useSearchParams();
  const required = searchParams.get("required") ?? "";
  const from = searchParams.get("from") ?? "";

  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.getRole());

  const requiredRoles = required
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const homeHref = ROLE_HOME[role] ?? "/";

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="rounded-[32px] border border-rose-200 bg-rose-50 p-10 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-3xl">
          🚫
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-rose-800">
          접근 권한이 없습니다
        </h1>

        {from ? (
          <p className="mt-2 text-sm text-rose-600">
            <code className="rounded bg-rose-100 px-1.5 py-0.5 font-mono text-xs">{from}</code>{" "}
            경로에 접근할 수 없습니다.
          </p>
        ) : null}

        <div className="mt-6 space-y-2 text-sm text-rose-700">
          {hydrated ? (
            <p>
              현재 역할:{" "}
              <span className="font-semibold">
                {ROLE_LABEL[role] ?? role}
              </span>
            </p>
          ) : null}

          {requiredRoles.length > 0 ? (
            <p>
              필요 역할:{" "}
              <span className="font-semibold">
                {requiredRoles.map((r) => ROLE_LABEL[r] ?? r).join(" 또는 ")}
              </span>
            </p>
          ) : null}

          {hydrated && user ? (
            <p className="text-rose-500">
              {user.name} 님은 이 페이지에 접근할 수 없습니다.
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={homeHref}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            내 홈으로
          </Link>
          <Link
            href="/sign-in"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
          >
            다른 계정으로 로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
