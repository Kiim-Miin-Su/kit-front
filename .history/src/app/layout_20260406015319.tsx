import "./globals.css";
import type { Metadata } from "next";
import { ReactNode } from "react";

import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "AI Edu LMS",
  description: "AI 기반 LMS와 학습 코파일럿",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-app text-ink antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
