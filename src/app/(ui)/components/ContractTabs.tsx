"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type TabKey = "summary" | "clauses" | "document";

/**
 * Tabbed contract views (Summary · Clauses · Document View). All panels stay mounted (CSS-hidden)
 * so cross-references work: clicking a "#clause-…" or "#node-…" link switches to the right tab and
 * scrolls to the target after it becomes visible.
 */
export function ContractTabs({
  clauseCount,
  summary,
  clauses,
  document: documentPanel,
}: {
  clauseCount: number;
  summary: ReactNode;
  clauses: ReactNode;
  document: ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("summary");
  const pendingScroll = useRef<string | null>(null);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // After a cross-tab jump, scroll to the target once the new panel is visible.
  useEffect(() => {
    const id = pendingScroll.current;
    if (!id) return;
    pendingScroll.current = null;
    scrollTo(id);
  }, [active]);

  function onClickCapture(e: React.MouseEvent) {
    const link = (e.target as HTMLElement).closest("a");
    const href = link?.getAttribute("href");
    if (!href?.startsWith("#")) return;
    const id = href.slice(1);
    const target: TabKey | null = id.startsWith("clause-")
      ? "clauses"
      : id.startsWith("node-")
        ? "document"
        : null;
    if (!target) return;
    e.preventDefault();
    if (target === active) {
      scrollTo(id);
    } else {
      pendingScroll.current = id;
      setActive(target);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "clauses", label: `Clauses · ${clauseCount}` },
    { key: "document", label: "Document View" },
  ];

  return (
    <div onClickCapture={onClickCapture}>
      <nav className="sticky top-0 z-10 -mx-2 flex gap-1 border-b border-[var(--paper-edge)] bg-[var(--paper)]/85 px-2 backdrop-blur">
        {tabs.map((t) => {
          const on = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              aria-current={on ? "page" : undefined}
              className="relative px-3 py-3 text-sm transition-colors"
              style={{ color: on ? "var(--ink)" : "var(--ink-3)" }}
            >
              {t.label}
              <span
                className="absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-[var(--claret)] transition-opacity"
                style={{ opacity: on ? 1 : 0 }}
                aria-hidden
              />
            </button>
          );
        })}
      </nav>

      <div className="mt-8" hidden={active !== "summary"}>
        {summary}
      </div>
      <div className="mt-8" hidden={active !== "clauses"}>
        {clauses}
      </div>
      <div className="mt-8" hidden={active !== "document"}>
        {documentPanel}
      </div>
    </div>
  );
}
