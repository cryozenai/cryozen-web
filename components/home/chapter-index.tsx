"use client";

import { useEffect, useRef, useState } from "react";
import { monoLabel } from "@/components/home/primitives";

export interface IndexGroup {
  /** Shown before the group's links; omitted for a group of one that names itself. */
  label?: string;
  items: readonly { id: string; label: string }[];
}

/**
 * The tour's sticky index: one link per chapter, with the chapter being read
 * marked as the current location.
 *
 * The links are plain anchors and work without JavaScript. The script only
 * adds the marker: an IntersectionObserver watches a thin band under the
 * sticky bars, and the last chapter to cross it is the current one. The index
 * scrolls sideways when it is wider than the screen, fading out at the right
 * edge as the cue that there is more, and follows the marker.
 */
export function ChapterIndex({ groups, label }: { groups: readonly IndexGroup[]; label: string }) {
  const [current, setCurrent] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Of the chapters touching the band, the one furthest down the page is
        // the one whose heading most recently passed under the bars.
        const reading = ids.filter((id) => visible.has(id)).at(-1);
        if (reading) setCurrent(reading);
      },
      // A band from just under the sticky bars to 45% of the way down.
      { rootMargin: "-136px 0px -55% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [groups]);

  useEffect(() => {
    const scroller = list.current;
    if (!scroller || current === null) return;
    const link = scroller.querySelector<HTMLElement>(`[data-chapter="${current}"]`);
    if (!link) return;
    // Scroll the bar itself, never the page: centre the current link in it.
    const left = link.offsetLeft - (scroller.clientWidth - link.offsetWidth) / 2;
    scroller.scrollTo({ left, behavior: "auto" });
  }, [current]);

  return (
    <nav
      aria-label={label}
      className="sticky top-16 z-40 border-y border-hairline bg-ground/90 backdrop-blur-xl"
    >
      <div
        ref={list}
        className="relative mx-auto flex w-full max-w-7xl items-center gap-x-5 overflow-x-auto ps-6 pe-14 [mask-image:linear-gradient(to_right,#000_calc(100%-3.5rem),transparent)] [scrollbar-width:none] lg:ps-8 [&::-webkit-scrollbar]:hidden"
      >
        {groups.map((group, index) => (
          <div key={group.label ?? index} className="flex shrink-0 items-center gap-x-1">
            {group.label ? (
              <span className={`${monoLabel} me-1.5 text-[0.6875rem]/5 text-muted`}>{group.label}</span>
            ) : null}
            {group.items.map((item) => {
              const active = item.id === current;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  data-chapter={item.id}
                  aria-current={active ? "location" : undefined}
                  className={`flex min-h-12 items-center border-b-2 px-2 text-sm whitespace-nowrap transition-colors duration-150 ${
                    active
                      ? "border-primary font-medium text-core"
                      : "border-transparent text-ink hover:text-core"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
