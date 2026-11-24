"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { AppFrame, StaticFrame } from "@/components/media/app-frame";
import { ProductVideo } from "@/components/media/product-video";
import { ShortenedNote } from "@/components/media/shortened-note";
import { Ledger } from "@/components/home/primitives";
import type { Capture } from "@/lib/media/types";

export interface SwitcherItem {
  id: string;
  /** The tab's text. */
  tab: string;
  /** Null shows a static frame carrying `tab` instead of a player. */
  capture: Capture | null;
  /** One sentence under the frame. */
  heading: string;
  /** What leaves the machine, printed after `ledgerLabel`. */
  ledger?: string;
}

/**
 * One app window whose recording is chosen by a row of tabs: the hero's
 * surface switcher, and the two activation recordings under Start.
 *
 * This is the only state the home page needs, so it is the page's one
 * client island besides the player itself. Tabs follow the WAI-ARIA tabs
 * pattern with automatic activation: arrow keys, Home, and End move and
 * select, and only the selected tab is in the tab order.
 *
 * Every caption is laid out in the same grid cell and only the selected one is
 * visible, so the block is as tall as its longest caption and switching tabs
 * never moves the page below it.
 */
export function CaptureSwitcher({
  items,
  label,
  name,
  ledgerLabel,
  priority = false,
}: {
  items: readonly SwitcherItem[];
  /** Names the tab list for assistive tech. */
  label: string;
  /** Prefix for element ids; unique per switcher on a page. */
  name: string;
  ledgerLabel: string;
  /** The first tab's poster is this page's largest above-the-fold image. */
  priority?: boolean;
}) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const item = items[selected];
  const panelId = `${name}-panel`;

  function select(index: number, focus: boolean) {
    setSelected(index);
    const tab = tabs.current[index];
    if (!tab) return;
    if (focus) tab.focus({ preventScroll: true });
    // On a narrow screen the row scrolls; keep the selected tab in view
    // without moving the page.
    tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = items.length - 1;
    const target =
      event.key === "ArrowRight"
        ? (index + 1) % items.length
        : event.key === "ArrowLeft"
          ? (index + last) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    select(target, true);
  }

  return (
    <div className="min-w-0">
      {/*
       * Below `sm` the tabs can be wider than the screen. The row then scrolls
       * and its right edge fades out, which is the cue that there is more; the
       * end padding lets the last tab scroll clear of the fade.
       */}
      <div
        role="tablist"
        aria-label={label}
        className="-mx-1 flex snap-x gap-1.5 overflow-x-auto px-1 py-1 [scrollbar-width:none] max-sm:[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] max-sm:pe-10 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((entry, index) => {
          const active = index === selected;
          return (
            <button
              key={entry.id}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${name}-tab-${entry.id}`}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              onClick={() => select(index, false)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`min-h-11 shrink-0 cursor-pointer snap-start rounded-lg border px-3.5 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                active
                  ? "border-primary/45 bg-primary/10 text-core"
                  : "border-transparent text-muted hover:text-core"
              }`}
            >
              {entry.tab}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={panelId} aria-labelledby={`${name}-tab-${item.id}`} className="mt-3">
        <AppFrame>
          {item.capture ? (
            // Keyed, so each recording gets its own player and starts from the top.
            <ProductVideo
              key={item.id}
              capture={item.capture}
              priority={priority && selected === 0}
              loop
            />
          ) : (
            <StaticFrame label={item.tab} />
          )}
        </AppFrame>

        <div className="mt-4 grid">
          {items.map((entry, index) => {
            const active = index === selected;
            return (
              <div
                key={entry.id}
                aria-hidden={active ? undefined : true}
                className={`col-start-1 row-start-1 grid content-start gap-x-8 gap-y-2 ${
                  entry.ledger ? "sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : ""
                } ${active ? "" : "invisible"}`}
              >
                <div className="space-y-1.5">
                  <p className="text-sm/6 font-medium text-core text-pretty">{entry.heading}</p>
                  {entry.capture ? <ShortenedNote capture={entry.capture} /> : null}
                </div>
                {entry.ledger ? <Ledger label={ledgerLabel}>{entry.ledger}</Ledger> : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
