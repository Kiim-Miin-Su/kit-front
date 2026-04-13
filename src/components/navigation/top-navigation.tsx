"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  navigationFeatureFlags,
  topNavigationPrimaryLinks,
} from "@/config/navigation";
import { signOut } from "@/services/auth";
import { useAuthStore } from "@/store/auth-store";

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  instructor: "/instructor",
  assistant: "/instructor",
  student: "/student",
};

export function TopNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.getRole());
  const clearSession = useAuthStore((state) => state.clearSession);
  const showAttendanceAction = navigationFeatureFlags.showAttendanceShortcut;

  async function handleSignOut() {
    try {
      await signOut();
    } catch {
      // 백엔드 오류여도 클라이언트 세션은 초기화
    }
    clearSession();
    router.push("/sign-in");
  }

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
            AI Edu LMS
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {topNavigationPrimaryLinks.map((link) => {
              const active = isActive(pathname, link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    active
                      ? "bg-ink text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {showAttendanceAction ? (
            <Link
              href="/student?tab=attendance"
              className="hidden rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 sm:inline-flex"
            >
              출석하기
            </Link>
          ) : null}

          {hydrated && user ? (
            <>
              {role && role !== "guest" ? (
                <Link
                  href={ROLE_HOME[role] ?? "/"}
                  className="hidden rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand transition hover:bg-brand/20 sm:block"
                >
                  {role}
                </Link>
              ) : null}
              <span className="hidden text-sm font-medium text-slate-700 sm:block">
                {user.name}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-rose-600"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
