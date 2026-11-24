"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type { Capture } from "@/lib/media/types";

/** What a parent can ask of the player. */
export interface ProductVideoHandle {
  /**
   * Jumps to `seconds` and plays from there. It plays even under reduced
   * motion, because it only ever runs in answer to the visitor's own action.
   */
  seek(seconds: number): void;
  pause(): void;
}

export interface ProductVideoProps {
  capture: Capture;
  /** Start when scrolled into view. Ignored when the visitor prefers reduced motion. */
  autoPlay?: boolean;
  loop?: boolean;
  /** The poster is this page's largest above-the-fold image: fetch it first. */
  priority?: boolean;
  /** Show the captions track's cues over the video. */
  showCaptions?: boolean;
  /** Called with the playback position, a few times a second while playing. */
  onTimeUpdate?: (seconds: number) => void;
  onPlayingChange?: (playing: boolean) => void;
  ref?: Ref<ProductVideoHandle>;
  className?: string;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * The cue to show at the video's current position, read from the cue list
 * rather than from `activeCues`: after a seek that lands exactly on a cue
 * boundary, Chrome keeps the cue that just ended in `activeCues` and would
 * show the previous step's caption over the next step.
 */
function captionAt(video: HTMLVideoElement): string {
  const cues = video.textTracks[0]?.cues;
  if (!cues) return "";
  const time = video.currentTime;
  for (let index = cues.length - 1; index >= 0; index -= 1) {
    const cue = cues[index];
    if (cue.startTime <= time && time < cue.endTime) {
      return cue instanceof VTTCue ? cue.text.replace(/<[^>]+>/g, "") : "";
    }
  }
  return "";
}

function play(video: HTMLVideoElement, at?: number) {
  if (at !== undefined) video.currentTime = at;
  video.play().catch(() => {
    // Rejected by the browser's autoplay policy, or interrupted by a pause.
    // Either way the video is paused and the button says so, which is the
    // whole recovery: the visitor presses play.
  });
}

/**
 * A product recording that costs the page nothing until it is watched.
 *
 * The poster is a plain `<picture>` in the server HTML, so it is the LCP
 * element and paints without JavaScript. The `<video>` does not exist until
 * the frame is on screen after hydration, and it is `preload="none"`, so a
 * visitor who never scrolls to it downloads no video bytes at all. The box has
 * the capture's aspect ratio from the first byte, and the video is stacked on
 * top of the poster rather than replacing it, so nothing moves and there is no
 * blank frame between the two.
 *
 * WCAG 2.2.2: anything that plays by itself for more than five seconds needs a
 * way to stop it, so the play/pause button is always visible, and a visitor
 * who prefers reduced motion gets the poster and nothing moves until they
 * press play.
 */
export function ProductVideo({
  capture,
  autoPlay = true,
  loop = false,
  priority = false,
  showCaptions = true,
  onTimeUpdate,
  onPlayingChange,
  ref,
  className = "",
}: ProductVideoProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // A start asked for before the <video> exists; honoured when it mounts.
  const pendingRef = useRef<{ at?: number } | null>(null);
  // The visitor pressed pause: scrolling back into view must not override that.
  const heldRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [caption, setCaption] = useState("");

  function start(at?: number) {
    const video = videoRef.current;
    if (video) {
      play(video, at);
    } else {
      pendingRef.current = { at };
      setMounted(true);
    }
  }

  function attachVideo(video: HTMLVideoElement | null) {
    videoRef.current = video;
    if (!video) return;

    /*
     * Cues are drawn by this component, not by the browser. Chrome lays a
     * native cue out at the top of the video and then moves it to the bottom,
     * and counts that as a layout shift for every cue: measured at 0.01 each,
     * on a page that otherwise scores zero. "hidden" still loads the track; it
     * only turns the native rendering off. Without captions the track stays
     * disabled and its file is never fetched.
     */
    const track = video.textTracks[0];
    if (track && showCaptions) track.mode = "hidden";

    const pending = pendingRef.current;
    if (pending) {
      pendingRef.current = null;
      play(video, pending.at);
    }
  }

  function toggle() {
    const video = videoRef.current;
    if (video && !video.paused) {
      heldRef.current = true;
      video.pause();
    } else {
      heldRef.current = false;
      start();
    }
  }

  function reportPlaying(next: boolean) {
    setPlaying(next);
    onPlayingChange?.(next);
  }

  useImperativeHandle(ref, () => ({
    seek(seconds) {
      heldRef.current = false;
      start(Math.min(Math.max(seconds, 0), capture.duration));
    },
    pause() {
      heldRef.current = true;
      videoRef.current?.pause();
    },
  }));

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const reducedMotion = window.matchMedia(REDUCED_MOTION);

    // Observer callbacks run after a frame has been produced, so the video is
    // never created before first paint and never competes with the poster.
    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current;
        if (!entry.isIntersecting) {
          video?.pause();
          return;
        }
        if (!autoPlay || heldRef.current || reducedMotion.matches) return;
        if (video) {
          if (video.paused) play(video);
        } else {
          pendingRef.current = {};
          setMounted(true);
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(frame);

    // Turning the preference on mid-visit stops what was started automatically.
    const onPreferenceChange = () => {
      if (reducedMotion.matches) videoRef.current?.pause();
    };
    reducedMotion.addEventListener("change", onPreferenceChange);

    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", onPreferenceChange);
    };
  }, [autoPlay]);

  return (
    <div
      ref={frameRef}
      className={`relative w-full overflow-hidden bg-ground ${className}`}
      style={{ aspectRatio: `${capture.width} / ${capture.height}` }}
    >
      <picture className="absolute inset-0 block">
        <source type="image/avif" srcSet={capture.poster.avif} />
        {/*
         * A plain <img> on purpose. next/image would route this through the
         * image optimizer, which the site does not use (see the img-src note in
         * next.config.ts); the capture stream already ships AVIF and WebP at
         * the exact display size, which is all the optimizer would produce.
         */}
        <img
          src={capture.poster.webp}
          alt={mounted ? "" : capture.title}
          width={capture.width}
          height={capture.height}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="block size-full object-cover"
        />
      </picture>

      {mounted ? (
        <video
          ref={attachVideo}
          muted
          playsInline
          preload="none"
          loop={loop}
          aria-label={capture.title}
          width={capture.width}
          height={capture.height}
          className="absolute inset-0 size-full object-cover"
          onPlay={() => reportPlaying(true)}
          onPause={() => reportPlaying(false)}
          onTimeUpdate={(event) => {
            const video = event.currentTarget;
            setCaption(showCaptions ? captionAt(video) : "");
            onTimeUpdate?.(video.currentTime);
          }}
        >
          {capture.sources.map((source) => (
            <source key={source.src} src={source.src} type={source.type} />
          ))}
          <track kind="captions" src={capture.captions} srcLang="en" label="English" />
        </video>
      ) : null}

      {/*
       * Hidden from assistive tech: the recording has no audio, so the cues
       * caption what is on screen, and a screen reader gets the same content
       * from the transcript without text changing under its cursor.
       */}
      {caption ? (
        <p
          aria-hidden="true"
          className="pointer-events-none absolute bottom-3 left-3 max-w-[calc(100%-5.5rem)] rounded-md bg-ground/85 px-2.5 py-1.5 text-xs/5 font-medium text-core backdrop-blur-sm sm:text-sm/5"
        >
          {caption}
        </p>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-label={`${playing ? "Pause" : "Play"}: ${capture.title}`}
        className="absolute right-3 bottom-3 grid size-11 place-items-center rounded-full border border-hairline bg-ground/85 text-core backdrop-blur-sm transition-colors duration-150 hover:border-primary/60 hover:text-glow"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="size-4">
          {playing ? (
            <path d="M5 3.5h3.5v13H5zM11.5 3.5H15v13h-3.5z" />
          ) : (
            <path d="M6 3.4v13.2a.6.6 0 0 0 .92.5l10.2-6.6a.6.6 0 0 0 0-1L6.92 2.9A.6.6 0 0 0 6 3.4z" />
          )}
        </svg>
      </button>
    </div>
  );
}
