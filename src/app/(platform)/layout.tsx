import type { ReactNode } from "react";

import { SectionSidebar } from "@/components/navigation/section-sidebar";
import { TopNavigation } from "@/components/navigation/top-navigation";

export default function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <TopNavigation />
      <main className="mx-auto flex max-w-7xl gap-6 px-6 py-10">
        <SectionSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </main>
    </div>
  );
}
