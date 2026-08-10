/**
 * The cold-flame backdrop: two slow-drifting radial blooms and a hairline grid.
 * Purely decorative, sits behind every page, never intercepts pointer events.
 */
export function Aurora() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-ground" />

      <div
        className="animate-drift absolute -top-1/3 left-1/2 h-[42rem] w-[64rem] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(127,242,255,0.22), rgba(79,227,232,0.10) 45%, transparent 75%)",
        }}
      />
      <div
        className="animate-ember absolute top-[28rem] -right-40 h-[34rem] w-[34rem] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(30,95,140,0.30), transparent 70%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #1a2836 1px, transparent 1px), linear-gradient(to bottom, #1a2836 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage:
            "radial-gradient(ellipse 80% 55% at 50% 0%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 55% at 50% 0%, #000 40%, transparent 100%)",
        }}
      />
    </div>
  );
}
