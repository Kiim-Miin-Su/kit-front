"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/store/auth-store";

const primaryLinks = [
  { href: "/", label: "홈" },
  { href: "/courses", label: "강의 탐색" },
  { href: "/learn", label: "학습" },
  { href: "/student", label: "학생" },
  { href: "/instructor", label: "강사" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function TopNavigation() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.getRole());
  const showAttendanceAction = true;

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
            AI Edu LMS
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {primaryLinks.map((link) => {
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
          <div className="hidden rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand sm:block">
            {role}
          </div>
          <Link
            href="/sign-in"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            {user ? `${user.name} 계정` : "로그인"}
          </Link>
        </div>
      </div>
    </header>
  );
}
