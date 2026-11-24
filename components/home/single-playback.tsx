"use client";

import { useEffect } from "react";

/**
 * Keeps a page of recordings to one moving picture at a time: when any video
 * starts, every other one is paused.
 *
 * Each player starts by itself when it scrolls into view, and on a tall
 * screen two can be in view together. `play` does not bubble, so the listener
 * is registered for the capture phase on the document, which also covers
 * players mounted after this component. Renders nothing.
 */
export function SinglePlayback() {
  useEffect(() => {
    const onPlay = (event: Event) => {
      const started = event.target;
      if (!(started instanceof HTMLVideoElement)) return;
      for (const video of document.querySelectorAll("video")) {
        if (video !== started && !video.paused) video.pause();
      }
    };
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);
  return null;
}
