"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STEPS = [
  { key: "uploaded", label: "Filed" },
  { key: "parsing", label: "Structuring" },
  { key: "analyzing", label: "Analyzing" },
  { key: "ready", label: "Ready" },
] as const;

/** Live ingestion status via SSE; refreshes the page to render the tree when ready (PRD F1.5). */
export function IngestStatus({ contractId, initial }: { contractId: string; initial: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    if (status === "ready" || status === "failed") return;
    const es = new EventSource(`/api/contracts/${contractId}/stream`);
    es.onmessage = (e) => {
      const next = JSON.parse(e.data).status as string;
      setStatus(next);
      if (next === "ready" || next === "failed") {
        es.close();
        router.refresh();
      }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [contractId, status, router]);

  const activeIdx = STEPS.findIndex((s) => s.key === status);

  if (status === "failed") {
    return <p className="text-sm text-[var(--risk-critical)]">Ingestion failed. Please re-upload.</p>;
  }

  return (
    <ol className="flex items-center gap-3 text-sm">
      {STEPS.map((step, i) => {
        const done = activeIdx > i;
        const active = activeIdx === i;
        return (
          <li key={step.key} className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-2"
              style={{ color: done || active ? "var(--ink)" : "var(--ink-3)" }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: done ? "var(--risk-standard)" : active ? "var(--claret)" : "var(--paper-edge)",
                }}
              />
              {step.label}
              {active && status !== "ready" && <span className="animate-pulse">…</span>}
            </span>
            {i < STEPS.length - 1 && <span className="text-[var(--paper-edge)]">/</span>}
          </li>
        );
      })}
    </ol>
  );
}
