interface PageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function PageIntro({ eyebrow, title, description }: PageIntroProps) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-8 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand">
        {eyebrow}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
        {description}
      </p>
    </section>
  );
}
