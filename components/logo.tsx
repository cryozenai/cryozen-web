"use client";

import { useId } from "react";

/**
 * The CryoZen mark: a square-in-square tesseract projection drawn as an ice
 * crystal, lit from a white-hot core out to glacial cyan at the edges.
 */
export function Logo({ className = "size-8" }: { className?: string }) {
  const id = useId();
  const edge = `${id}-edge`;
  const core = `${id}-core`;

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={edge} x1="16" y1="1" x2="16" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EAFCFF" />
          <stop offset="0.5" stopColor="#7FF2FF" />
          <stop offset="1" stopColor="#1E5F8C" />
        </linearGradient>
        <radialGradient id={core} cx="16" cy="16" r="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EAFCFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#4FE3E8" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="16" cy="16" r="8" fill={`url(#${core})`} />

      <path
        d="M16 1.5 30.5 16 16 30.5 1.5 16Z"
        stroke={`url(#${edge})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16 8.5 23.5 16 16 23.5 8.5 16Z"
        stroke={`url(#${edge})`}
        strokeWidth="1.25"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <path
        d="M16 1.5V8.5M16 23.5V30.5M1.5 16H8.5M23.5 16H30.5"
        stroke={`url(#${edge})`}
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Logo className="size-7" />
      <span className="text-[15px] font-semibold tracking-[0.14em] text-core uppercase">
        CryoZen
      </span>
    </span>
  );
}
