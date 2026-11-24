import type { TocItem } from "@/lib/docs/slugger";

export function DocsToc({ items }: { items: TocItem[] }) {
  if (items.length === 0) return null;

  return (
    <aside className="hidden xl:block">
      <nav
        aria-label="On this page"
        className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pl-2"
      >
        <h2 className="text-[11px] font-semibold tracking-[0.14em] text-core uppercase">
          On this page
        </h2>
        <ul className="mt-3 space-y-2 border-l border-hairline">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className={`block border-l border-transparent py-0.5 text-xs/5 text-muted transition-colors duration-150 hover:border-primary hover:text-core ${
                  item.level === 3 ? "pl-6" : "pl-3"
                }`}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
