"use client";

import { useEffect, useRef } from "react";

/**
 * The title-slide mark: a lemniscate of Bernoulli with a spark travelling it.
 *
 * It is the brand thesis drawn once - a closed loop with no outward path,
 * which is the same claim the deck makes about the data. Colours are read from
 * the site's own custom properties rather than hard-coded, so the canvas
 * follows the palette in `globals.css` the way every other element does.
 */
export function Lemniscate({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

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

    // The curve in parametric form: x = R√2·cos(a)/d, y = x·sin(a), d = 1+sin²(a).
    const point = (a: number, cx: number, cy: number, r: number) => {
      const d = 1 + Math.sin(a) * Math.sin(a);
      const x = (r * Math.SQRT2 * Math.cos(a)) / d;
      return { x: cx + x, y: cy + x * Math.sin(a) };
    };

    const draw = (time: number) => {
      const { width, height } = canvas;
      context.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.34;

      // Two passes: a wide soft halo, then the bright hairline over it.
      for (const pass of [0, 1] as const) {
        context.beginPath();
        const steps = 240;
        for (let i = 0; i <= steps; i += 1) {
          const a = (i / steps) * Math.PI * 2;
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
     * a window resize, a font settling, and the print re-layout that swaps the
     * slide to a 1280x720 page and stacks the title grid, which fires no
     * `resize` event and which `beforeprint` is too early to measure.
     */
    const box = new ResizeObserver(redraw);
    box.observe(canvas);

    return () => {
      stop();
      visibility.disconnect();
      box.disconnect();
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
