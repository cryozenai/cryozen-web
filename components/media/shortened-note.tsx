import { formatSpan } from "@/lib/media/step-sync";
import type { Capture } from "@/lib/media/types";

/**
 * The visible disclosure for a recording whose waiting time was sped up: how
 * long the session really took. Renders nothing for a recording shown at its
 * real length. It sits beside the player rather than in the captions, so it is
 * read by someone who never turns them on.
 */
export function ShortenedNote({ capture, className = "" }: { capture: Capture; className?: string }) {
  if (capture.realDuration === undefined) return null;
  return (
    <p className={`font-mono text-xs/5 text-muted ${className}`}>
      <span className="text-primary">Shortened:</span> real run {formatSpan(capture.realDuration)}
    </p>
  );
}
