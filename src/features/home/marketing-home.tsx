"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { HomeCourseGrid } from "@/features/home/home-course-grid";
import {
  buildCourseSearchQuery,
  type DurationOption,
  type HomeToggleState,
  type PriceOption,
} from "@/features/home/home-filters";
import { HomeFilterBar } from "@/features/home/home-filter-bar";
import { HomeHeroCarousel, type HomeHeroBanner } from "@/features/home/home-hero-carousel";
import { HomePagination } from "@/features/home/home-pagination";
import { HomeSearch } from "@/features/home/home-search";
import { searchCourses } from "@/services/course";
import { useAuthStore } from "@/store/auth-store";
import type { CourseCatalog, CourseDetail, CourseSearchResult } from "@/types/course";

interface MarketingHomeProps {
  catalog: CourseCatalog;
}

export function MarketingHome({ catalog }: MarketingHomeProps) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const continueCourses = [
    catalog.featuredCourse,
    ...catalog.courses.filter((course) => course.enrollmentStatus === "ACTIVE"),
  ].slice(0, 4);
  const previewCourse =
    catalog.courses.find((course) => course.curriculumPreview.some((lesson) => lesson.isPreview)) ??
    catalog.featuredCourse;
  const banners = buildBanners(catalog, previewCourse);
  const pageSize = 20;
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>("전체");
  const [selectedPrice, setSelectedPrice] = useState<PriceOption>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTopToggles, setActiveTopToggles] = useState<HomeToggleState>({
    할인: false,
    무료: false,
    로드맵: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchResult, setSearchResult] = useState<CourseSearchResult>(() => {
    const seededCourses = buildExpandedCourses(catalog);
    const totalPages = Math.max(1, Math.ceil(seededCourses.length / pageSize));

    return {
      items: seededCourses.slice(0, pageSize),
      page: 1,
      size: pageSize,
      totalPages,
      totalElements: seededCourses.length,
    };
  });

  useEffect(() => {
    let cancelled = false;
    const query = buildCourseSearchQuery({
      page: currentPage,
      size: pageSize,
      keyword: searchQuery,
      category: selectedCategory,
      selectedDuration,
      selectedPrice,
      activeTopToggles,
    });

    searchCourses(query)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setSearchResult(result);

        if (result.page !== currentPage) {
          setCurrentPage(result.page);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeTopToggles,
    currentPage,
    searchQuery,
    selectedCategory,
    selectedDuration,
    selectedPrice,
  ]);

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <HomeHeroCarousel banners={banners} />

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
                    <div
                      className="h-2 rounded-full bg-brand"
                      style={{ width: `${Math.min(course.rating * 20, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">평점 {course.rating.toFixed(1)} 기준 진행 예시</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          <HomeSearch
            searchQuery={searchQuery}
            onSearchQueryChange={(value) => {
              setIsLoading(true);
              setCurrentPage(1);
              setSearchQuery(value);
            }}
            onSearchApply={() => {
              setIsLoading(true);
              setCurrentPage(1);
            }}
          />
          <HomeFilterBar
            selectedCategory={selectedCategory}
            selectedDuration={selectedDuration}
            selectedPrice={selectedPrice}
            activeTopToggles={activeTopToggles}
            onSelectedCategoryChange={(value) => {
              setIsLoading(true);
              setCurrentPage(1);
              setSelectedCategory(value);
            }}
            onSelectedDurationChange={(value) => {
              setIsLoading(true);
              setCurrentPage(1);
              setSelectedDuration(value);
            }}
            onSelectedPriceChange={(value) => {
              setIsLoading(true);
              setCurrentPage(1);
              setSelectedPrice(value);
            }}
            onToggleChange={(key) => {
              setIsLoading(true);
              setCurrentPage(1);
              setActiveTopToggles((prev) => ({
                ...prev,
                [key]: !prev[key],
              }));
            }}
          />
          <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            {isLoading ? (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                서버 필터 적용 중...
              </p>
            ) : null}
            <HomeCourseGrid courses={searchResult.items ?? []} isLoading={isLoading} />
            <HomePagination
              currentPage={searchResult.page}
              totalPages={searchResult.totalPages}
              totalElements={searchResult.totalElements}
              onPageChange={(page) => {
                setIsLoading(true);
                setCurrentPage(page);
              }}
            />
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

function buildBanners(catalog: CourseCatalog, previewCourse: CourseDetail): HomeHeroBanner[] {
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
