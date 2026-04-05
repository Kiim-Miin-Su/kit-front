import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-10">
      <section className="grid w-full gap-8 rounded-[36px] border border-slate-200 bg-white/90 p-8 shadow-sm lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[28px] bg-[#10302b] p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Sign In
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight">
            인증 흐름의 시작점
          </h1>
          <p className="mt-4 text-base leading-7 text-emerald-50/85">
            실제 로그인 폼과 OAuth는 다음 작업에서 붙이면 됩니다. 현재는 인증 상태
            저장과 API 모듈을 먼저 안정화했습니다.
          </p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-8">
          <p className="text-sm font-semibold text-slate-500">Auth Ready</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            로그인 화면 플레이스홀더
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            `src/services/auth.ts`와 `src/store/auth-store.ts`를 기준으로 실제 로그인
            폼을 연결하면 됩니다.
          </p>
          <Link
            href="/courses"
            className="mt-8 inline-flex rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
          >
            강의 목록으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
