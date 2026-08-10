"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";

export function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the command stays selectable by hand.
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline bg-elevated/60 px-4 py-3">
      <span className="font-mono text-xs text-primary select-none">$</span>
      <code className="flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap text-ink">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy: ${command}`}
        className="shrink-0 rounded-md p-1.5 text-muted transition-colors duration-150 hover:text-core"
      >
        {copied ? (
          <CheckIcon className="size-4 text-primary" />
        ) : (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-4"
            aria-hidden="true"
          >
            <rect x="7" y="7" width="9" height="9" rx="2" />
            <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
          </svg>
        )}
      </button>
    </div>
  );
}
