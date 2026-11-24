import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";
import Markdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { CopyCommand } from "@/components/copy-command";
import { InlineCode, textLink } from "@/components/ui";
import { remarkHeadingIds } from "@/lib/docs/slugger";
import { CodeBlock } from "./code-block";

const SHELL_LANGUAGES = new Set(["bash", "sh", "shell", "zsh", ""]);

function extractText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return extractText(child.props.children);
      }
      return "";
    })
    .join("");
}

function HeadingAnchor({
  id,
  label,
}: {
  id?: string;
  label: string;
}) {
  if (!id) return null;
  return (
    <a
      href={`#${id}`}
      aria-label={`Link to section ${label}`}
      className="ml-2 font-mono text-primary opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus:opacity-100"
    >
      #
    </a>
  );
}

const markdownComponents: Components = {
  h2: ({ node, id, children, ...props }) => (
    <h2
      id={id}
      className="group mt-10 mb-4 scroll-mt-24 border-b border-hairline/70 pb-2 text-2xl font-semibold tracking-tight text-core"
      {...props}
    >
      {children}
      <HeadingAnchor id={id} label={extractText(children)} />
    </h2>
  ),
  h3: ({ node, id, children, ...props }) => (
    <h3
      id={id}
      className="group mt-7 mb-3 scroll-mt-24 text-lg font-semibold text-core"
      {...props}
    >
      {children}
      <HeadingAnchor id={id} label={extractText(children)} />
    </h3>
  ),
  h4: ({ node, id, children, ...props }) => (
    <h4
      id={id}
      className="group mt-6 mb-2 scroll-mt-24 text-base font-semibold text-core"
      {...props}
    >
      {children}
      <HeadingAnchor id={id} label={extractText(children)} />
    </h4>
  ),
  p: ({ node, ...props }) => <p className="my-4 text-sm/7 text-ink sm:text-[15px]/7" {...props} />,
  ul: ({ node, ...props }) => (
    <ul
      className="my-4 list-disc space-y-2 pl-5 text-sm/7 text-ink marker:text-primary/70 sm:text-[15px]/7"
      {...props}
    />
  ),
  ol: ({ node, ...props }) => (
    <ol
      className="my-4 list-decimal space-y-2 pl-5 text-sm/7 text-ink marker:text-primary/70 sm:text-[15px]/7"
      {...props}
    />
  ),
  li: ({ node, ...props }) => <li className="pl-1" {...props} />,
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-5 border-l-2 border-primary/50 bg-surface/60 px-4 py-2 text-sm/7 text-muted"
      {...props}
    />
  ),
  a: ({ node, href = "", children, ...props }) => {
    if (href.startsWith("/")) {
      return (
        <Link href={href} className={textLink} {...props}>
          {children}
        </Link>
      );
    }
    if (href.startsWith("#")) {
      return (
        <a href={href} className={textLink} {...props}>
          {children}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className={textLink} {...props}>
        {children}
      </a>
    );
  },
  code: ({ node, className, children, ...props }) => {
    // Fenced blocks are unwrapped by `pre` below; inline code lands here.
    if (className?.startsWith("language-")) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return <InlineCode>{children}</InlineCode>;
  },
  pre: ({ children }) => {
    const child = Children.only(children);
    if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
      const match = /language-([^\s]+)/.exec(child.props.className ?? "");
      const language = (match?.[1] ?? "").toLowerCase();
      const rawCode = extractText(child.props.children).replace(/\n$/, "");
      const isSingleShellCommand =
        SHELL_LANGUAGES.has(language) &&
        !rawCode.includes("\n") &&
        rawCode.trim().length > 0 &&
        !rawCode.trim().startsWith("#");

      if (isSingleShellCommand) {
        return (
          <div className="my-4">
            <CopyCommand command={rawCode.trim()} />
          </div>
        );
      }
      return <CodeBlock code={rawCode} language={language || undefined} />;
    }
    return (
      <pre className="my-5 overflow-x-auto rounded-lg border border-hairline bg-elevated/60 p-4 font-mono text-xs/6 text-ink">
        {children}
      </pre>
    );
  },
  table: ({ node, ...props }) => (
    <div className="my-6 overflow-x-auto rounded-lg border border-hairline bg-surface/40">
      <table className="w-full border-collapse text-left text-sm" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="border-b border-hairline bg-surface/80 text-xs font-semibold tracking-[0.06em] text-core uppercase" {...props} />
  ),
  tbody: ({ node, ...props }) => <tbody className="divide-y divide-hairline/70" {...props} />,
  tr: ({ node, ...props }) => <tr className="align-top" {...props} />,
  th: ({ node, ...props }) => <th className="px-4 py-3 font-semibold text-core" {...props} />,
  td: ({ node, ...props }) => <td className="px-4 py-3 text-sm/6 text-ink" {...props} />,
  hr: () => <hr className="my-8 border-hairline" />,
  strong: ({ node, ...props }) => <strong className="font-semibold text-core" {...props} />,
};

export function DocsMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0">
      <Markdown remarkPlugins={[remarkGfm, remarkHeadingIds]} components={markdownComponents}>
        {content}
      </Markdown>
    </div>
  );
}
