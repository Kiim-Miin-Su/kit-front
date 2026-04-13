"use client";

import axios from "axios";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import { signIn } from "@/services/auth";
import { useAuthStore } from "@/store/auth-store";

const demoAccounts = [
  "student-demo-01@koreait.academy / password123",
  "instructor-dev-01@koreait.academy / password123",
  "admin-root@koreait.academy / password123",
];

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInPageFallback />}>
      <SignInPageContent />
    </Suspense>
  );
}

function SignInPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  const setSession = useAuthStore((state) => state.setSession);

  const redirectTarget = resolveRedirectTarget(searchParams.get("redirect"));

  const [email, setEmail] = useState("student-demo-01@koreait.academy");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (hydrated && isAuthenticated) {
      router.replace(redirectTarget);
    }
  }, [hydrated, isAuthenticated, redirectTarget, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const session = await signIn({
        email,
        password,
      });
      setSession(session);
      router.push(redirectTarget);
    } catch (caughtError) {
      setError(resolveSignInErrorMessage(caughtError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
      <section className="grid w-full gap-8 rounded-[36px] border border-slate-200 bg-white/90 p-8 shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] bg-[#10302b] p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Sign In
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">
            로컬 인증 흐름 시작
          </h1>
          <p className="mt-4 text-base leading-7 text-emerald-50/85">
            로컬 백엔드의 access token + refresh cookie 구조로 바로 로그인할 수 있습니다.
            저장소는 메모리 기반이라 이후 DB 구현체로 교체하기 쉽도록 분리되어 있습니다.
          </p>
          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
              Demo Accounts
            </p>
            <ul className="mt-4 space-y-3 text-sm text-emerald-50/90">
              {demoAccounts.map((account) => (
                <li key={account}>{account}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8">
          <p className="text-sm font-semibold text-slate-500">Local Auth</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            계정 로그인
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            로그인 후 `/learn`, `/student`, `/courses`의 실연동 여부를 확인할 수 있습니다.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">이메일</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                placeholder="student-demo-01@koreait.academy"
                autoComplete="email"
                disabled={loading}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-brand"
                placeholder="password123"
                autoComplete="current-password"
                disabled={loading}
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={loading || !hydrated}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/courses"
              className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-ink"
            >
              강의 목록으로 이동
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function SignInPageFallback() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
      <section className="grid w-full gap-8 rounded-[36px] border border-slate-200 bg-white/90 p-8 shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] bg-[#10302b] p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Sign In
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">
            로컬 인증 흐름 시작
          </h1>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8">
          <p className="text-sm font-semibold text-slate-500">Local Auth</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            계정 로그인
          </h2>
        </div>
      </section>
    </main>
  );
}

function resolveRedirectTarget(redirect: string | null) {
  if (!redirect || !redirect.startsWith("/") || redirect.startsWith("//")) {
    return "/learn";
  }

  if (redirect.startsWith("/sign-in")) {
    return "/learn";
  }

  return redirect;
}

function resolveSignInErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) {
    return "로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  const response = error.response?.data as { code?: string; message?: string } | undefined;

  if (response?.code === "USER_NOT_FOUND") {
    return "입력한 이메일로 가입된 계정을 찾을 수 없습니다.";
  }

  if (response?.code === "INVALID_PASSWORD") {
    return "비밀번호가 올바르지 않습니다.";
  }

  if (!error.response) {
    return "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
  }

  return response?.message || "로그인에 실패했습니다.";
}
