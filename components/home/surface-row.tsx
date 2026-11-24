import Link from "next/link";
import { ArrowIcon } from "@/components/icons";
import { privacyLabels } from "@/lib/product/types";
import type { Surface } from "@/lib/product/types";

/** One surface as a row: its name, how far its data travels, and its benefit. */
export function SurfaceRow({ surface }: { surface: Surface }) {
  return (
    <li>
      <Link href={`/features/${surface.id}`} className="group block py-3.5">
        <span className="flex items-center gap-1.5 text-base/6 font-medium text-core transition-colors duration-150 group-hover:text-glow">
          {surface.name}
          <ArrowIcon className="size-3.5 text-primary transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
        <span className="mt-1 block text-sm/6 text-ink text-pretty">{surface.tagline}</span>
        <span className="mt-1.5 block font-mono text-[0.6875rem]/5 text-muted">
          {privacyLabels[surface.privacy.leaves]}
        </span>
      </Link>
    </li>
  );
}
