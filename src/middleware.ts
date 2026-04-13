import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/auth";

const ROLE_COOKIE = "ai_edu_role";
const REFRESH_COOKIE = "ai_edu_refresh_token";

/**
 * 역할별 기본 홈 경로.
 * 로그인 후 리다이렉트 또는 권한 없을 때 귀환 경로로 사용된다.
 */
const ROLE_HOME: Record<Exclude<UserRole, "guest">, string> = {
  admin: "/admin",
  instructor: "/instructor",
  student: "/student",
  assistant: "/instructor",
};

/**
 * 경로 접근 허용 역할 테이블.
 * 더 구체적인 경로를 먼저 정의한다.
 */
const ROUTE_PERMISSIONS: Array<{ prefix: string; allowed: UserRole[] }> = [
  { prefix: "/admin", allowed: ["admin"] },
  { prefix: "/instructor", allowed: ["admin", "instructor", "assistant"] },
  { prefix: "/student", allowed: ["admin", "instructor", "assistant", "student"] },
  { prefix: "/learn", allowed: ["admin", "instructor", "assistant", "student"] },
  { prefix: "/submissions", allowed: ["admin", "instructor", "assistant", "student"] },
];

function getRole(request: NextRequest): Exclude<UserRole, "guest"> | null {
  const roleCookie = request.cookies.get(ROLE_COOKIE)?.value;
  const refreshCookie = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshCookie) return null;

  const validRoles: Array<Exclude<UserRole, "guest">> = [
    "admin",
    "instructor",
    "assistant",
    "student",
  ];

  return validRoles.includes(roleCookie as Exclude<UserRole, "guest">)
    ? (roleCookie as Exclude<UserRole, "guest">)
    : "student";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const role = getRole(request);
  const isAuthenticated = role !== null;

  // 인증 페이지 (로그인): 이미 로그인된 경우 역할 홈으로 리다이렉트
  if (pathname.startsWith("/sign-in")) {
    if (isAuthenticated) {
      const home = ROLE_HOME[role];
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  // 보호된 플랫폼 경로 확인
  const matchedRoute = ROUTE_PERMISSIONS.find(({ prefix }) => pathname.startsWith(prefix));

  if (matchedRoute) {
    // 미인증 → 로그인 페이지로 (원래 경로를 redirect 쿼리로 보존)
    if (!isAuthenticated) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // 권한 없는 역할 → 접근 불가 안내 페이지로
    if (!matchedRoute.allowed.includes(role)) {
      const deniedUrl = new URL("/unauthorized", request.url);
      deniedUrl.searchParams.set("required", matchedRoute.allowed.join(","));
      deniedUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(deniedUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/sign-in",
    "/admin/:path*",
    "/instructor/:path*",
    "/student/:path*",
    "/learn/:path*",
    "/submissions/:path*",
  ],
};
