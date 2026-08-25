"use client";

import { useEffect, useId, useRef } from "react";

// The curve in parametric form: x = R√2·cos(a)/d, y = x·sin(a), d = 1+sin²(a).
const point = (a: number, cx: number, cy: number, r: number) => {
  const d = 1 + Math.sin(a) * Math.sin(a);
  const x = (r * Math.SQRT2 * Math.cos(a)) / d;
  return { x: cx + x, y: cy + x * Math.sin(a) };
};

const STEPS = 240;

/*
 * The printed mark's coordinate space.
 *
 * A square viewBox reproduces the canvas exactly: the canvas sizes its radius
 * from `min(width, height)` and centres it, which is what `preserveAspectRatio`
 * already does with a square box in an oblong one. Everything below is
 * expressed as the same fraction of the radius the canvas uses, so the two
 * drawings are the same drawing at different resolutions.
 */
const BOX = 400;
const R = BOX * 0.34;
const WOBBLE = R * 0.04;
const HALO_WIDTH = R * 0.08;
const LINE_WIDTH = R * 0.0167;
const SPARK_HALO = R * 0.174;
const SPARK_CORE = R * 0.02;

/* The static frame: `time = 0`, so the spark sits at the start of the sweep. */
const PRINT_PATH = (() => {
  let path = "";
  for (let i = 0; i <= STEPS; i += 1) {
    const a = (i / STEPS) * Math.PI * 2;
    const { x, y } = point(a, BOX / 2, BOX / 2, R);
    const wobble = Math.sin(a * 2) * WOBBLE;
    path += `${i === 0 ? "M" : "L"}${(x + wobble).toFixed(2)} ${y.toFixed(2)}`;
  }
  return `${path}Z`;
})();

const PRINT_SPARK = point(0, BOX / 2, BOX / 2, R);

/**
 * The title-slide mark: a lemniscate of Bernoulli with a spark travelling it.
 *
 * It is the brand thesis drawn once - a closed loop with no outward path,
 * which is the same claim the deck makes about the data. Colours are read from
 * the site's own custom properties rather than hard-coded, so the mark follows
 * the palette in `globals.css` the way every other element does.
 *
 * Screen gets the animated canvas; print gets the same curve as a static inline
 * SVG. The PDF is the artefact that reaches an investor and the print check
 * reads only its text layer, so the printed mark cannot be left depending on
 * whether a resize notification is delivered before Chrome captures the page.
 * Vector output has no bitmap to be stale, and is right at any page size.
 */
export function Lemniscate({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // Squashed because `useId` emits delimiters that a `url(#...)` cannot carry.
  const haloId = `lemniscate-halo-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) =>
      styles.getPropertyValue(name).trim() || fallback;
    const deep = token("--color-deep", "#1e5f8c");
    const primary = token("--color-primary", "#4fe3e8");
    const glow = token("--color-glow", "#7ff2ff");

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      // Writing either attribute clears the bitmap, so only write a real change.
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
    };
    resize();

    const draw = (time: number) => {
      const { width, height } = canvas;
      context.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.34;

      // Two passes: a wide soft halo, then the bright hairline over it.
      for (const pass of [0, 1] as const) {
        context.beginPath();
        for (let i = 0; i <= STEPS; i += 1) {
          const a = (i / STEPS) * Math.PI * 2;
          const { x, y } = point(a, cx, cy, r);
          const wobble = Math.sin(a * 2 + time * 0.0009) * 6 * dpr;
          if (i === 0) context.moveTo(x + wobble, y);
          else context.lineTo(x + wobble, y);
        }
        context.closePath();
        context.lineWidth = (pass === 0 ? 12 : 2.5) * dpr;
        context.strokeStyle = pass === 0 ? deep : primary;
        context.globalAlpha = pass === 0 ? 0.5 : 0.95;
        context.lineJoin = "round";
        context.stroke();
      }

      context.globalAlpha = 1;
      const { x: sx, y: sy } = point((time * 0.0006) % (Math.PI * 2), cx, cy, r);
      const halo = context.createRadialGradient(sx, sy, 0, sx, sy, 26 * dpr);
      halo.addColorStop(0, glow);
      halo.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(sx, sy, 26 * dpr, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = glow;
      context.beginPath();
      context.arc(sx, sy, 3 * dpr, 0, Math.PI * 2);
      context.fill();
    };

    let frame = 0;
    let running = false;
    // The last timestamp drawn, so a redraw resumes the curve where it stood.
    let clock = 0;

    const redraw = () => {
      resize();
      draw(clock);
    };

    const loop = (time: number) => {
      clock = time;
      draw(time);
      frame = requestAnimationFrame(loop);
    };

    // Reduced motion still gets the mark, drawn once. The motion is not the point.
    const start = () => {
      if (running || reduceMotion) return;
      running = true;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frame);
    };

    draw(0);

    /*
     * One title slide among fourteen full-viewport ones: off screen, the loop
     * is redrawing a 240-segment path and a gradient halo nobody is looking at.
     * rAF pauses for a hidden tab but not for a scrolled-past canvas.
     */
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0 },
    );
    visibility.observe(canvas);

    /*
     * The bitmap is sized from the laid-out box, so anything that relays out
     * the box has to resize before it redraws or the old bitmap is stretched
     * into the new one. Observing the box itself catches every cause at once -
     * a window resize, a font settling, a container that reflows - without
     * having to enumerate them.
     */
    const box = new ResizeObserver(redraw);
    box.observe(canvas);

    return () => {
      stop();
      visibility.disconnect();
      box.disconnect();
    };
  }, []);

  return (
    <div className={className}>
      <canvas ref={ref} aria-hidden="true" className="block size-full print:hidden" />
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${BOX} ${BOX}`}
        className="hidden size-full print:block"
      >
        <defs>
          <radialGradient id={haloId}>
            <stop offset="0%" stopColor="var(--color-glow, #7ff2ff)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--color-glow, #7ff2ff)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d={PRINT_PATH}
          fill="none"
          stroke="var(--color-deep, #1e5f8c)"
          strokeWidth={HALO_WIDTH}
          strokeLinejoin="round"
          strokeOpacity="0.5"
        />
        <path
          d={PRINT_PATH}
          fill="none"
          stroke="var(--color-primary, #4fe3e8)"
          strokeWidth={LINE_WIDTH}
          strokeLinejoin="round"
          strokeOpacity="0.95"
        />
        <circle cx={PRINT_SPARK.x} cy={PRINT_SPARK.y} r={SPARK_HALO} fill={`url(#${haloId})`} />
        <circle
          cx={PRINT_SPARK.x}
          cy={PRINT_SPARK.y}
          r={SPARK_CORE}
          fill="var(--color-glow, #7ff2ff)"
        />
      </svg>
    </div>
  );
}
