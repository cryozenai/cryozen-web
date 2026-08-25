"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type SlideRef = { id: string; label: string };

/*
 * Controls whose own activation key is Space. Paging on Space has to yield to
 * them, or the keypress a focused control is waiting for scrolls the deck
 * instead - which is the whole of keyboard operation for the Notes and PDF
 * buttons, since a pointer is not involved.
 *
 * A link is deliberately not in this list. Space is not a link's activation key
 * in any browser - `<a href>` takes Enter - so a focused slide-rail dot pages
 * the deck on Space and jumps to its slide on Enter.
 */
const SPACE_ACTIVATES =
  'button, summary, [role="button"], [role="checkbox"], [role="switch"],' +
  ' [role="radio"], [role="tab"], [role="menuitem"], [role="option"]';

/*
 * How long a pending claim may stand before geometry takes over again.
 *
 * The release events are all best-effort: `scrollend` is the newest of the
 * three and is not everywhere yet, and a rail click moves the deck without
 * firing `wheel` or `touchstart` either. So no event is allowed to be load
 * bearing - the claim carries the moment it was made and lapses on its own,
 * evaluated when it is read rather than on a timer, so nothing has to fire for
 * it to go away. A smooth scroll of one viewport settles well inside a second.
 */
const PENDING_MS = 1000;

/*
 * The one deck rule that no selector can scope: `@page` describes the sheet,
 * not an element, so it applies to whatever is printed while it is in the
 * document. It cannot live in `app/pitch/deck.css` - Next renders a route
 * stylesheet as a `<link precedence>`, which React treats as a hoistable
 * resource and never removes, so after a client navigation off the deck the
 * page geometry would still be 1280x720 when the reader prints an ordinary
 * page of the site.
 *
 * A plain `<style>` with no `href` or `precedence` is not hoistable, so React
 * mounts and unmounts it with this component and the page box is live exactly
 * while a deck is on screen.
 */
const PAGE_BOX = "@page { size: 1280px 720px; margin: 0; }";

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
  // Measured by the keyboard handler without re-subscribing it on every scroll.
  const sectionsRef = useRef<HTMLElement[]>([]);
  /*
   * The slide a `goTo` is scrolling toward, stamped with when the scroll was
   * started. It is what lets a second keypress land on the slide after the one
   * being scrolled to instead of re-targeting it, and it is dropped the moment
   * the reader takes the scroll over themselves - or, failing any signal at
   * all, once the stamp is older than a scroll could be.
   */
  const pendingRef = useRef<{ index: number; at: number } | null>(null);

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
    sectionsRef.current = sections;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = sections.indexOf(entry.target as HTMLElement);
          if (index === -1) continue;
          setActive(index);
        }
      },
      // Half the slide on screen is the same "current slide" a presenter means.
      { threshold: 0.5 },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [slides]);

  /*
   * A scroll position, not a stored index, answers "which slide am I on": the
   * slide whose centre sits nearest the centre of the viewport. Geometry cannot
   * go stale, so however the reader got here - keys, wheel, drag, a rail link,
   * a restored hash - the answer is the slide they are actually looking at.
   */
  const nearestSlide = useCallback(() => {
    const sections = sectionsRef.current;
    const centre = window.innerHeight / 2;
    let nearest = 0;
    let shortest = Number.POSITIVE_INFINITY;
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - centre);
      if (distance < shortest) {
        shortest = distance;
        nearest = index;
      }
    });
    return nearest;
  }, []);

  /*
   * Where the next keypress counts from. Geometry is the default; the pending
   * claim overrides it only while a scroll this component started is still
   * short of its target and young enough to still be running, which is the
   * window in which geometry still reports the slide being left rather than
   * the one being paged to.
   */
  const originIndex = useCallback(() => {
    const geometric = nearestSlide();
    const pending = pendingRef.current;
    if (
      pending === null ||
      pending.index === geometric ||
      performance.now() - pending.at > PENDING_MS
    ) {
      pendingRef.current = null;
      return geometric;
    }
    return pending.index;
  }, [nearestSlide]);

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.min(slides.length - 1, Math.max(0, index));
      pendingRef.current = { index: clamped, at: performance.now() };
      document.getElementById(slides[clamped].id)?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    },
    [slides],
  );

  useEffect(() => {
    /*
     * Any scroll the reader drives themselves abandons the slide this component
     * was paging to, so the claim is dropped and the next keypress counts from
     * where they actually stopped. `scrollend` covers the ordinary case of a
     * programmatic scroll simply arriving.
     */
    const release = () => {
      pendingRef.current = null;
    };
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("scrollend", release);
    return () => {
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("scrollend", release);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === " " && target?.closest(SPACE_ACTIVATES)) return;

      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(event.key)) {
        event.preventDefault();
        goTo(originIndex() + 1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) {
        event.preventDefault();
        goTo(originIndex() - 1);
      } else if (event.key.toLowerCase() === "n") {
        setNotes((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, originIndex]);

  return (
    <div className="group/deck" data-notes={notes ? "on" : "off"}>
      <style>{PAGE_BOX}</style>

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
