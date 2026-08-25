"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type SlideRef = { id: string; label: string };

/**
 * The presenting chrome around a deck: scroll progress, a slide rail, keyboard
 * paging, the speaker-notes toggle, and print.
 *
 * It owns the notes state rather than each slide, because the toggle has to
 * reach every narration block at once. State travels down as `data-notes` on a
 * `group/deck` wrapper, so the blocks stay server-rendered and only this file
 * ships to the browser.
 */
export function DeckShell({
  slides,
  otherDeck,
  children,
}: {
  slides: SlideRef[];
  otherDeck: { slug: string; label: string };
  children: ReactNode;
}) {
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);
  const [notes, setNotes] = useState(false);
  // Read by the keyboard handler without re-subscribing it on every scroll.
  const activeRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = slides
      .map((slide) => document.getElementById(slide.id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = sections.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          activeRef.current = index;
          setActive(index);
        }
      },
      // Half the slide on screen is the same "current slide" a presenter means.
      { threshold: 0.5 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [slides]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.min(slides.length - 1, Math.max(0, index));
      document.getElementById(slides[clamped].id)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    [slides],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goTo(activeRef.current + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(activeRef.current - 1);
      } else if (event.key.toLowerCase() === "n") {
        setNotes((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo]);

  return (
    <div className="group/deck" data-notes={notes ? "on" : "off"}>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-60 h-0.5 origin-left bg-primary print:hidden"
        style={{ transform: `scaleX(${progress / 100})` }}
      />

      <nav
        aria-label="Slides"
        className="fixed top-1/2 right-5 z-50 hidden -translate-y-1/2 flex-col gap-2.5 lg:flex print:hidden"
      >
        {slides.map((slide, index) => (
          <a
            key={slide.id}
            href={`#${slide.id}`}
            aria-label={slide.label}
            aria-current={index === active ? "true" : undefined}
            className={`size-2.5 rounded-full border transition-all duration-200 ${
              index === active
                ? "scale-115 border-primary bg-primary"
                : "border-hairline hover:border-primary"
            }`}
          />
        ))}
      </nav>

      <div className="fixed right-4 bottom-4 z-50 flex items-center gap-1.5 rounded-full border border-hairline bg-surface/90 p-1.5 backdrop-blur-xl print:hidden">
        <Link
          href={`/pitch/${otherDeck.slug}`}
          className="rounded-full px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.12em] text-muted uppercase transition-colors hover:text-core"
        >
          {otherDeck.label}
          <span className="hidden sm:inline"> deck</span>
        </Link>
        <button
          type="button"
          onClick={() => setNotes((open) => !open)}
          aria-pressed={notes}
          className={`rounded-full px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.12em] uppercase transition-colors ${
            notes ? "bg-primary/15 text-primary" : "text-muted hover:text-core"
          }`}
        >
          Notes
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full px-3 py-1.5 font-mono text-[0.68rem] tracking-[0.12em] text-muted uppercase transition-colors hover:text-core"
        >
          PDF
        </button>
      </div>

      {children}
    </div>
  );
}
