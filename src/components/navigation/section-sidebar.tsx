"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  {
    title: "학습 여정",
    items: [
      { href: "/courses", label: "강의 목록" },
      { href: "/learn", label: "수강 플레이어" },
      { href: "/student", label: "학생 대시보드" },
    ],
  },
  {
    title: "운영",
    items: [
      { href: "/instructor", label: "강사 콘솔" },
      { href: "/admin", label: "관리자" },
    ],
  },
];

export function SectionSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 rounded-[28px] border border-slate-200 bg-white/90 p-5 xl:block">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Workspace
      </p>
      <div className="mt-6 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-sm font-semibold text-ink">{section.title}</p>
            <div className="mt-3 space-y-2">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block rounded-2xl px-4 py-3 text-sm transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
