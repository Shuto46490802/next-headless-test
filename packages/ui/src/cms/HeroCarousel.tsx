"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CtaRow, Eyebrow, Heading, SmartLink, type CmsCta, type CmsImage } from "./primitives";

export interface HeroSlideData {
  id: string;
  eyebrow?: string;
  heading: string;
  headingLevel?: "h1" | "h2";
  bodyMobile?: string;
  image: CmsImage | null;
  imageMobile?: CmsImage | null;
  altText?: string;
  type: "brandLed" | "dcLed";
  hue: string;
  ctas: CmsCta[];
  slideLabel?: string;
}

const HUES: Record<string, string> = {
  orange: "#F26B1D", purple: "#6B3FA0", orchid: "#C05AA8", pink: "#F07CA6", yellow: "#F5C518", lime: "#A6CE39", sky: "#4FB3E8",
};

/**
 * Figma "Hero Carousel": up to five slides, auto-advance 7s, pause on hover and focus, dots and
 * prev/next. Brand-led slides are a full-bleed image with a dark scrim; DC-led slides sit on a hue
 * ground with the image as a cut-out on the right.
 */
export function HeroCarousel({ slides, evergreenTiles = [] }: { slides: HeroSlideData[]; evergreenTiles?: CmsCta[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = slides.length;

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  useEffect(() => {
    if (count <= 1 || paused) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [count, paused]);

  if (count === 0) return null;
  const hasTiles = evergreenTiles.length > 0;

  return (
    <section className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-8" aria-roledescription="carousel" aria-label="Featured">
      <div className={`grid gap-4 ${hasTiles ? "lg:grid-cols-[1fr_360px]" : ""}`}>
        <div
          className="relative overflow-hidden rounded-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="relative min-h-[560px] sm:min-h-[620px]">
            {slides.map((slide, i) => {
              const active = i === index;
              const dcLed = slide.type === "dcLed";
              const ground = dcLed ? (HUES[slide.hue] ?? "#4FB3E8") : undefined;
              return (
                <div
                  key={slide.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={slide.slideLabel ?? `${i + 1} of ${count}`}
                  aria-hidden={!active}
                  className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
                  style={ground ? { backgroundColor: ground } : undefined}
                >
                  {slide.image ? (
                    <picture>
                      {slide.imageMobile ? <source media="(max-width: 640px)" srcSet={slide.imageMobile.url} /> : null}
                      <Image
                        src={slide.image.url}
                        alt={slide.altText ?? slide.image.description ?? ""}
                        fill
                        priority={i === 0}
                        sizes="(min-width: 1440px) 1360px, 100vw"
                        className={dcLed ? "object-contain object-right p-8 sm:p-16" : "object-cover"}
                      />
                    </picture>
                  ) : null}
                  {!dcLed ? <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" /> : null}
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-6 sm:p-12 sm:pb-16">
                    {slide.eyebrow ? <Eyebrow className={dcLed ? "text-neutral-900" : "text-brand-sky"}>{slide.eyebrow}</Eyebrow> : null}
                    <Heading level={slide.headingLevel ?? (i === 0 ? "h1" : "h2")} size="xl" className={`max-w-3xl ${dcLed ? "text-neutral-900" : "text-white"}`}>
                      {slide.heading}
                    </Heading>
                    {slide.bodyMobile ? <p className={`max-w-xl text-base sm:text-lg ${dcLed ? "text-neutral-800" : "text-white/90"}`}>{slide.bodyMobile}</p> : null}
                    <CtaRow ctas={slide.ctas.map((c) => (c.variant === "secondary" && !dcLed ? { ...c, variant: "secondary" as const } : c))} className={dcLed ? "" : "text-white"} />
                  </div>
                </div>
              );
            })}
          </div>

          {count > 1 ? (
            <>
              <div className="absolute bottom-6 right-6 flex items-center gap-2 sm:bottom-10 sm:right-12">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-label={`Go to slide ${i + 1}${s.slideLabel ? `: ${s.slideLabel}` : ""}`}
                    aria-current={i === index}
                    onClick={() => go(i)}
                    className={`h-1.5 rounded-full transition-all ${i === index ? "w-6 bg-brand" : "w-1.5 bg-white/70 hover:bg-white"}`}
                  />
                ))}
              </div>
              <button type="button" aria-label="Previous slide" onClick={() => go(index - 1)} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-900 hover:bg-white sm:flex">‹</button>
              <button type="button" aria-label="Next slide" onClick={() => go(index + 1)} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-neutral-900 hover:bg-white sm:flex">›</button>
            </>
          ) : null}
        </div>

        {hasTiles ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {evergreenTiles.map((tile) => (
              <SmartLink key={tile.label} href={tile.href} className="flex min-h-[180px] items-end rounded-3xl bg-brand-tint p-6 font-heading text-2xl font-bold text-brand hover:bg-brand-sky lg:min-h-0">
                {tile.label} →
              </SmartLink>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
