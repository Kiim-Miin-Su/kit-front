"use client";

import { startTransition, useDeferredValue, useState } from "react";

import { CourseCard } from "@/features/course/course-card";
import type { CourseCatalog, CourseSummary } from "@/types/course";

type SortKey = "popular" | "rating" | "latest";

const sortLabels: Record<SortKey, string> = {
  popular: "인기순",
  rating: "평점순",
  latest: "최신 구성순",
};

function sortCourses(courses: CourseSummary[], sortKey: SortKey) {
  const sorted = [...courses];

  if (sortKey === "rating") {
    return sorted.sort((a, b) => b.rating - a.rating);
  }

  if (sortKey === "latest") {
    return sorted.sort((a, b) => b.lessonCount - a.lessonCount);
  }

  return sorted.sort((a, b) => b.enrollmentCount - a.enrollmentCount);
}

export function CourseCatalogView({
  categories,
  featuredCourse,
  courses,
}: CourseCatalog) {
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [sortKey, setSortKey] = useState<SortKey>("popular");
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);

  const normalizedKeyword = deferredKeyword.trim().toLowerCase();
  const filteredCourses = sortCourses(
    courses.filter((course) => {
      const matchesCategory =
        selectedCategory === "전체" || course.category === selectedCategory;
      const haystack = [
        course.title,
        course.subtitle,
        course.description,
        course.instructor.name,
        ...course.tags,
      ]
        .join(" ")
        .toLowerCase();
      const matchesKeyword =
        normalizedKeyword.length === 0 || haystack.includes(normalizedKeyword);

      return matchesCategory && matchesKeyword;
    }),
    sortKey,
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div
          className={`bg-gradient-to-br ${featuredCourse.thumbnailTone} px-8 py-10 text-white`}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/70">
            Featured Course
          </p>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight">
                {featuredCourse.title}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/85">
                {featuredCourse.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {featuredCourse.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid gap-3 rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="수강생" value={`${featuredCourse.enrollmentCount.toLocaleString()}명`} />
                <Metric label="강의 수" value={`${featuredCourse.lessonCount}개`} />
                <Metric label="러닝타임" value={featuredCourse.durationLabel} />
                <Metric label="평점" value={featuredCourse.rating.toFixed(1)} />
              </div>
              <div className="rounded-2xl bg-slate-950/20 p-4">
                <p className="text-sm font-semibold">{featuredCourse.instructor.name}</p>
                <p className="mt-1 text-sm text-white/80">
                  {featuredCourse.instructor.title}
                </p>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/60">
                  {featuredCourse.priceLabel}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand">
              Course Catalog
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-ink">
              강의를 검색하고 수강 상태를 바로 확인하세요
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              비로그인 사용자는 강의 정보를 탐색하고, 로그인 사용자는 자신의 수강 상태를
              카드에서 바로 볼 수 있습니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,280px)_auto]">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">검색</span>
              <input
                value={keyword}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  startTransition(() => setKeyword(nextValue));
                }}
                placeholder="강의명, 강사명, 태그 검색"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-600">정렬</span>
              <select
                value={sortKey}
                onChange={(event) => {
                  const nextValue = event.target.value as SortKey;
                  startTransition(() => setSortKey(nextValue));
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand focus:bg-white"
              >
                {Object.entries(sortLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => {
            const active = selectedCategory === category;

            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  startTransition(() => setSelectedCategory(category));
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-ink text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 text-sm text-slate-500">
          <p>{filteredCourses.length}개의 강의가 검색되었습니다.</p>
          <p>현재 정렬: {sortLabels[sortKey]}</p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {filteredCourses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </section>

      {filteredCourses.length === 0 ? (
        <section className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center">
          <p className="text-lg font-semibold text-ink">조건에 맞는 강의가 없습니다.</p>
          <p className="mt-2 text-sm text-slate-500">
            검색어를 줄이거나 다른 카테고리를 선택해 보세요.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-white/60">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}
