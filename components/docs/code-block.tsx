"use client";

import { useEffect, useState } from "react";
import { CheckIcon } from "@/components/icons";

export function CodeBlock({
  code,
  language,
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; the block remains selectable.
    }
  }

  return (
    <div className="my-5 overflow-hidden rounded-lg border border-hairline bg-elevated/60">
      <div className="flex items-center justify-between border-b border-hairline/80 px-4 py-2">
        <span className="font-mono text-[11px] tracking-[0.08em] text-muted uppercase">
          {language || "text"}
        </span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code block"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors duration-150 hover:text-core"
        >
          {copied ? (
            <>
              <CheckIcon className="size-3.5 text-primary" />
              <span className="text-primary">Copied</span>
            </>
          ) : (
            <>
              <svg
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="size-3.5"
                aria-hidden="true"
              >
                <rect x="7" y="7" width="9" height="9" rx="2" />
                <path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
              </svg>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs/6 text-ink">
        <code>{code}</code>
      </pre>
    </div>
  );
}
