import type { ReactNode } from "react";

import { TopNavigation } from "@/components/navigation/top-navigation";

export default function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <TopNavigation />
      {children}
    </div>
  );
}
