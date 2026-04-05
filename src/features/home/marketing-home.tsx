"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/store/auth-store";
import type { CourseCatalog, CourseDetail } from "@/types/course";

interface MarketingHomeProps {
  catalog: CourseCatalog;
}

const topFilters = ["수강 시간", "할인", "가격", "무료", "로드맵"];

const categoryShortcuts = [
  { label: "전체", icon: "◫" },
  { label: "개발 · 프로그래밍", icon: "⌘" },
  { label: "데이터 사이언스", icon: "◈" },
  { label: "AI 기술", icon: "✦" },
  { label: "AI 활용", icon: "◎" },
  { label: "게임 개발", icon: "✸" },
  { label: "보안 · 네트워크", icon: "◌" },
  { label: "하드웨어", icon: "▣" },
  { label: "디자인 · 아트", icon: "◍" },
  { label: "업무 생산성", icon: "◪" },
  { label: "커리어 · 자기계발", icon: "◉" },
];

export function MarketingHome({ catalog }: MarketingHomeProps) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const continueCourses = [
    catalog.featuredCourse,
    ...catalog.courses.filter((course) => course.enrollmentStatus === "ACTIVE"),
  ].slice(0, 4);
  const allCourses = buildExpandedCourses(catalog);
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [openTopFilter, setOpenTopFilter] = useState<"수강 시간" | "가격" | null>(null);
  const [selectedDuration, setSelectedDuration] = useState("전체");
  const [selectedPrice, setSelectedPrice] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTopToggles, setActiveTopToggles] = useState({
    할인: false,
    무료: false,
    로드맵: false,
  });
  const previewCourse =
    catalog.courses.find((course) => course.curriculumPreview.some((lesson) => lesson.isPreview)) ??
    catalog.featuredCourse;
  const banners = buildBanners(catalog, previewCourse);
  const [currentBanner, setCurrentBanner] = useState(0);
  const filteredCards = allCourses.filter((course) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [
        course.title,
        course.subtitle,
        course.category,
        course.instructor.name,
        ...course.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    if (selectedCategory === "전체") {
      return (
        matchesQuery &&
        matchesTopFilters(course, selectedDuration, selectedPrice, activeTopToggles)
      );
    }

    return (
      matchesQuery &&
      mapCourseCategoryToShortcut(course.category) === selectedCategory &&
      matchesTopFilters(course, selectedDuration, selectedPrice, activeTopToggles)
    );
  });
  const featuredCards = (filteredCards.length > 0 ? filteredCards : allCourses);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(featuredCards.length / pageSize));
  const pagedCards = featuredCards.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [banners.length]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedDuration, selectedPrice, activeTopToggles, searchQuery]);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand">
                AI Edu LMS
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                배우고 싶은 강의를 찾고, 바로 이어서 학습하세요
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                강의 탐색, 상세 확인, 미리보기, 학습 플레이어까지 한 번에 이어지는 학습 홈입니다.
                필요한 다음 행동을 위에서부터 바로 고를 수 있게 구성했습니다.
              </p>
            </div>
          </div>
          <div
            className={`bg-gradient-to-r ${banners[currentBanner].tone} px-8 py-8 text-white sm:px-12`}
          >
            <div className="flex min-h-[220px] max-w-xl flex-col justify-between">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
                {banners[currentBanner].eyebrow}
              </p>
              <h2 className="mt-3 min-h-[96px] text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                {banners[currentBanner].title}
              </h2>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-white/85 sm:text-base">
                {banners[currentBanner].description}
              </p>
              <div className="mt-5 flex min-h-[44px] flex-wrap items-center gap-3">
                <Link
                  href={banners[currentBanner].primaryHref}
                  className="inline-flex h-10 items-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink"
                >
                  {banners[currentBanner].primaryLabel}
                </Link>
                <Link
                  href={banners[currentBanner].secondaryHref}
                  className="inline-flex h-10 items-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white"
                >
                  {banners[currentBanner].secondaryLabel}
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-5 left-6 flex items-center gap-2 sm:left-8">
            {banners.map((banner, index) => {
              const active = index === currentBanner;

              return (
                <button
                  key={banner.title}
                  type="button"
                  onClick={() => setCurrentBanner(index)}
                  className={`h-3 rounded-full transition ${
                    active ? "w-9 bg-white" : "w-3 bg-white/45"
                  }`}
                  aria-label={`${index + 1}번 배너 보기`}
                />
              );
            })}
          </div>
          <div className="absolute bottom-5 right-6 flex items-center gap-2 sm:right-8">
            <button
              type="button"
              onClick={() =>
                setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length)
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg text-white"
              aria-label="이전 배너"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setCurrentBanner((prev) => (prev + 1) % banners.length)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg text-white"
              aria-label="다음 배너"
            >
              ›
            </button>
          </div>
        </section>

        {hydrated && user ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink">이어서 학습하기</p>
                <p className="mt-1 text-sm text-slate-500">
                  최근 학습 중이던 강의로 바로 돌아가거나 미리보기 가능한 강의를 이어서 볼 수 있습니다.
                </p>
              </div>
              <Link href="/learn" className="hidden text-sm font-semibold text-brand sm:block">
                내 학습 →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[240px_repeat(3,minmax(0,1fr))]">
              <article className="rounded-[24px] bg-gradient-to-br from-[#dbeea2] via-[#d8f3b1] to-[#f4f8da] p-4">
                <p className="text-sm font-semibold text-[#45631b]">바로 학습 시작</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-[#24380d]">
                  이어서 보던 강의로 복귀하세요
                </p>
                <p className="mt-2 text-sm leading-6 text-[#4f6728]">
                  플레이어와 상세 흐름을 바로 오가면서 다음 학습 액션을 빠르게 이어갈 수 있습니다.
                </p>
                <Link
                  href={`/learn?courseSlug=${continueCourses[0].slug}`}
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#355314]"
                >
                  대시보드 열기
                </Link>
              </article>
              {continueCourses.map((course) => (
                <article
                  key={course.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className={`h-20 rounded-[18px] bg-gradient-to-br ${course.thumbnailTone}`} />
                  <p className="mt-3 min-h-[44px] text-sm font-semibold leading-6 text-ink">
                    {course.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {course.lessonCount}개 강의 · {course.durationLabel}
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(course.rating * 20, 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    평점 {course.rating.toFixed(1)} 기준 진행 예시
                  </p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <div className="flex justify-center">
            <div className="w-full max-w-2xl rounded-[28px] border border-emerald-100 bg-emerald-50 p-4 shadow-sm">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                Quick Search
              </p>
              <div className="mt-3 flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-brand">
                  ⌕
                </span>
                <label className="min-w-0 flex-1">
                  <span className="sr-only">강의 검색</span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Next.js, Spring, SQL, AI 활용, 디자인 시스템"
                    className="w-full border-0 bg-transparent text-sm font-medium text-ink outline-none placeholder:text-slate-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-semibold text-white"
                  aria-label="검색 적용"
                >
                  →
                </button>
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                검색과 카테고리 필터가 아래 강의 카드에 함께 반영됩니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {topFilters.map((pill) => {
                const isDropdown = pill === "수강 시간" || pill === "가격";
                const isActive =
                  (pill === "수강 시간" && selectedDuration !== "전체") ||
                  (pill === "가격" && selectedPrice !== "전체") ||
                  (!isDropdown && activeTopToggles[pill as keyof typeof activeTopToggles]);

                return (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => {
                      if (pill === "수강 시간" || pill === "가격") {
                        setOpenTopFilter((prev) => (prev === pill ? null : pill));
                        return;
                      }

                      setActiveTopToggles((prev) => ({
                        ...prev,
                        [pill]: !prev[pill as keyof typeof prev],
                      }));
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold shadow-sm ${
                      isActive
                        ? "border-emerald-300 bg-emerald-50 text-brand"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {pill}
                    {pill === "수강 시간"
                      ? ` ${selectedDuration === "전체" ? "˅" : `· ${selectedDuration}`}`
                      : ""}
                    {pill === "가격"
                      ? ` ${selectedPrice === "전체" ? "˅" : `· ${selectedPrice}`}`
                      : ""}
                  </button>
                );
              })}
            </div>
            <p className="text-sm font-semibold text-slate-500">추천순</p>
          </div>

          {openTopFilter ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
              {(openTopFilter === "수강 시간" ? durationOptions : priceOptions).map((option) => {
                const active =
                  openTopFilter === "수강 시간"
                    ? selectedDuration === option
                    : selectedPrice === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      if (openTopFilter === "수강 시간") {
                        setSelectedDuration(option);
                      } else {
                        setSelectedPrice(option);
                      }

                      setOpenTopFilter(null);
                    }}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                      active
                        ? "border-emerald-300 bg-emerald-50 text-brand"
                        : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
              {categoryShortcuts.map((shortcut) => {
                const active = selectedCategory === shortcut.label;

                return (
                  <button
                    key={shortcut.label}
                    type="button"
                    onClick={() =>
                      setSelectedCategory((prev) =>
                        prev === shortcut.label ? "전체" : shortcut.label,
                      )
                    }
                    className={`flex min-w-[104px] shrink-0 flex-col items-center gap-2 rounded-2xl border px-3 py-3 text-center transition ${
                      active
                        ? "border-emerald-300 bg-emerald-50 text-brand"
                        : "border-transparent bg-white text-slate-700"
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg shadow-sm ${
                        active ? "bg-emerald-100 text-brand" : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {shortcut.icon}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{shortcut.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setSelectedCategory("전체")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-brand"
                aria-label="카테고리 전체로 초기화"
              >
                ↻
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory((prev) => (prev === "전체" ? "전체" : "전체"))}
                className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                  selectedCategory === "전체"
                    ? "border-emerald-200 bg-emerald-50 text-brand"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                전체
              </button>
              {selectedCategory !== "전체" ? (
                <button
                  type="button"
                  onClick={() => setSelectedCategory("전체")}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-brand"
                >
                  {selectedCategory} ×
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {pagedCards.map((course) => (
                <article
                  key={course.id}
                  className="flex h-full flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className={`h-32 bg-gradient-to-br ${course.thumbnailTone} p-4 text-white`}>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                        {course.category}
                      </span>
                      <span className="rounded-full bg-slate-950/20 px-3 py-1 text-xs font-semibold">
                        {course.level}
                      </span>
                    </div>
                    <div className="mt-7">
                      <p className="min-h-[48px] text-[17px] font-semibold leading-6">{course.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <p className="min-h-[44px] text-sm leading-6 text-slate-600">
                      {course.subtitle}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                      <span>{course.rating.toFixed(1)}</span>
                      <span>·</span>
                      <span>후기 {course.reviewCount}개</span>
                      <span>·</span>
                      <span>{course.priceLabel}</span>
                    </div>
                    <div className="mt-auto pt-4">
                      <div className="flex min-h-[38px] flex-wrap gap-2">
                        <Link
                          href={`/courses/${course.slug}`}
                          className="inline-flex h-9 items-center rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-white"
                        >
                          상세
                        </Link>
                        <Link
                          href={`/learn?courseSlug=${course.slug}`}
                          className="inline-flex h-9 items-center rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-ink"
                        >
                          학습
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <p className="text-sm text-slate-500">
                총 {featuredCards.length}개 강의 · {currentPage}/{totalPages} 페이지
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                      currentPage === page
                        ? "bg-ink text-white"
                        : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-10 items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        </section>

        <Link
          href="/sign-in"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full border border-emerald-200 bg-white px-4 py-3 shadow-lg transition hover:-translate-y-0.5"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
            문의
          </span>
          <span className="pr-1">
            <span className="block text-sm font-semibold text-ink">문의하기</span>
            <span className="block text-xs text-slate-500">결제, 승인, 수강 문제</span>
          </span>
        </Link>
      </div>
    </main>
  );
}

function mapCourseCategoryToShortcut(category: string) {
  if (category === "프론트엔드" || category === "백엔드") {
    return "개발 · 프로그래밍";
  }

  if (category === "데이터") {
    return "데이터 사이언스";
  }

  if (category === "AI 활용") {
    return "AI 활용";
  }

  if (category === "디자인 시스템") {
    return "디자인 · 아트";
  }

  return "전체";
}

function buildExpandedCourses(catalog: CourseCatalog) {
  const seeds = [catalog.featuredCourse, ...catalog.courses];
  const suffixes = [
    { key: "starter", label: "Starter" },
    { key: "bootcamp", label: "Bootcamp" },
    { key: "intensive", label: "Intensive" },
  ];

  return seeds.flatMap((course, seedIndex) =>
    suffixes.map((suffix, suffixIndex) => ({
      ...course,
      id: `${course.id}-${suffix.key}`,
      slug: `${course.slug}-${suffix.key}`,
      title: `${course.title} ${suffix.label}`,
      subtitle: `${course.subtitle} ${suffix.label} 트랙`,
      reviewCount: course.reviewCount + suffixIndex * 11 + seedIndex * 3,
      enrollmentCount: course.enrollmentCount + suffixIndex * 140 + seedIndex * 60,
      rating: Math.max(4.3, Number((course.rating - suffixIndex * 0.1).toFixed(1))),
      priceLabel:
        suffixIndex === 0
          ? course.priceLabel
          : suffixIndex === 1
            ? "₩44,000"
            : "₩79,000",
      isFeatured: suffixIndex === 1 ? true : course.isFeatured,
    })),
  );
}

const durationOptions = ["전체", "10시간 미만", "10시간~15시간", "15시간 이상"];
const priceOptions = ["전체", "무료", "5만원 이하", "5만원~8만원", "8만원 이상"];

function matchesTopFilters(
  course: CourseDetail,
  selectedDuration: string,
  selectedPrice: string,
  activeTopToggles: {
    할인: boolean;
    무료: boolean;
    로드맵: boolean;
  },
) {
  const durationMinutes = parseDurationLabel(course.durationLabel);
  const priceValue = parsePriceLabel(course.priceLabel);
  const durationMatch =
    selectedDuration === "전체" ||
    (selectedDuration === "10시간 미만" && durationMinutes < 600) ||
    (selectedDuration === "10시간~15시간" &&
      durationMinutes >= 600 &&
      durationMinutes < 900) ||
    (selectedDuration === "15시간 이상" && durationMinutes >= 900);
  const priceMatch =
    selectedPrice === "전체" ||
    (selectedPrice === "무료" && priceValue === 0) ||
    (selectedPrice === "5만원 이하" && priceValue > 0 && priceValue <= 50000) ||
    (selectedPrice === "5만원~8만원" && priceValue > 50000 && priceValue <= 80000) ||
    (selectedPrice === "8만원 이상" && priceValue > 80000);
  const freeMatch = !activeTopToggles.무료 || priceValue === 0;
  const discountMatch = !activeTopToggles.할인 || course.reviewCount >= 80;
  const roadmapMatch = !activeTopToggles.로드맵 || course.isFeatured || course.enrollmentStatus === "ACTIVE";

  return durationMatch && priceMatch && freeMatch && discountMatch && roadmapMatch;
}

function parseDurationLabel(label: string) {
  const hourMatch = label.match(/(\d+)시간/);
  const minuteMatch = label.match(/(\d+)분/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;

  return hours * 60 + minutes;
}

function parsePriceLabel(label: string) {
  if (label.includes("무료") || label.includes("구독")) {
    return 0;
  }

  return Number(label.replace(/[^\d]/g, ""));
}

function buildBanners(catalog: CourseCatalog, previewCourse: CourseDetail) {
  return [
    {
      eyebrow: "Weekly Highlight",
      title: "요즘 많이 찾는 AI 활용 강의",
      description:
        "강의 상세에서 미리보기로 먼저 확인하고, 수강 상태에 따라 바로 학습까지 이어지는 흐름을 홈에서 바로 체험할 수 있습니다.",
      primaryLabel: "추천 강의 보기",
      primaryHref: `/courses/${previewCourse.slug}`,
      secondaryLabel: "미리보기 열기",
      secondaryHref: `/learn?courseSlug=${previewCourse.slug}&previewLessonId=${previewCourse.curriculumPreview[0]?.id ?? ""}`,
      tone: "from-[#bd6b4f] via-[#c77555] to-[#b55c43]",
    },
    {
      eyebrow: "Continue Learning",
      title: catalog.featuredCourse.title,
      description:
        "학습 중인 강의가 있다면 홈에서 바로 플레이어로 복귀하고, mock 레이아웃 기준으로 다음 구현 단계를 확인할 수 있습니다.",
      primaryLabel: "이어서 학습하기",
      primaryHref: `/learn?courseSlug=${catalog.featuredCourse.slug}`,
      secondaryLabel: "강의 상세",
      secondaryHref: `/courses/${catalog.featuredCourse.slug}`,
      tone: "from-[#0f3c35] via-[#145c54] to-[#1f7c6e]",
    },
    {
      eyebrow: "Explore",
      title: "강의 탐색부터 플레이어 진입까지",
      description:
        "홈, 목록, 상세, 미리보기, 학습 플레이어를 한 번에 연결해 사용자 흐름을 먼저 검증하는 데 집중했습니다.",
      primaryLabel: "강의 목록 보기",
      primaryHref: "/courses",
      secondaryLabel: "사용 흐름 보기",
      secondaryHref: `/courses/${catalog.courses[0]?.slug ?? catalog.featuredCourse.slug}`,
      tone: "from-[#263451] via-[#334d76] to-[#4c6a96]",
    },
  ];
}
