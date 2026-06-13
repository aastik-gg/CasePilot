"use client";

import { useState } from "react";
import { CLAUSE_LABELS, type ClauseType } from "@/domain/schemas/clause";
import type { CompareResult, Favourability } from "@/domain/schemas/compare";

const FAV_COLOR: Record<Favourability, string> = {
  most_favourable: "var(--risk-standard)",
  favourable: "var(--risk-standard)",
  neutral: "var(--ink-3)",
  unfavourable: "var(--risk-high)",
  least_favourable: "var(--risk-critical)",
};
const FAV_LABEL: Record<Favourability, string> = {
  most_favourable: "Most favourable",
  favourable: "Favourable",
  neutral: "Neutral",
  unfavourable: "Unfavourable",
  least_favourable: "Least favourable",
};

const CLAUSE_TYPES = (Object.keys(CLAUSE_LABELS) as ClauseType[]).filter((t) => t !== "other");

/** Pick a clause type + contracts, compare side by side (PRD F6, FRONTEND_DESIGN §7.5). */
export function CompareTool({ contracts }: { contracts: { id: string; title: string }[] }) {
  const [clauseType, setClauseType] = useState<ClauseType>("liability_limit");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function compare() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clauseType, contractIds: [...selected] }),
      });
      if (!res.ok) {
        setError((await res.json()).error ?? "Comparison failed.");
        return;
      }
      setResult(await res.json());
    } catch {
      setError("Comparison failed.");
    } finally {
      setLoading(false);
    }
  }

  const ordered = result ? result.ranking.map((id) => result.entries.find((e) => e.contractId === id)!).filter(Boolean) : [];

  return (
    <div>
      <div className="rounded-[var(--radius)] border border-[var(--paper-edge)] bg-[var(--paper-2)] p-5">
        <label className="block">
          <span className="eyebrow">Clause type</span>
          <select
            value={clauseType}
            onChange={(e) => setClauseType(e.target.value as ClauseType)}
            className="mt-1 block w-full rounded border border-[var(--paper-edge)] bg-[var(--paper)] px-3 py-2 text-[var(--ink)]"
          >
            {CLAUSE_TYPES.map((t) => (
              <option key={t} value={t}>
                {CLAUSE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>

        <p className="eyebrow mt-4 mb-2">Contracts (pick 2+)</p>
        <div className="flex flex-wrap gap-2">
          {contracts.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              aria-pressed={selected.has(c.id)}
              className="rounded-full border px-3 py-1 text-sm transition-colors"
              style={{
                borderColor: selected.has(c.id) ? "var(--claret)" : "var(--paper-edge)",
                color: selected.has(c.id) ? "var(--claret)" : "var(--ink-2)",
                background: selected.has(c.id) ? "color-mix(in srgb, var(--claret) 8%, transparent)" : "transparent",
              }}
            >
              {c.title}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={compare}
          disabled={selected.size < 2 || loading}
          className="mt-5 rounded bg-[var(--claret)] px-4 py-2 text-sm text-[var(--paper)] disabled:opacity-40"
        >
          {loading ? "Comparing…" : "Compare"}
        </button>
        {error && <p className="mt-3 text-sm text-[var(--risk-critical)]">{error}</p>}
      </div>

      {result && (
        <div className="mt-8">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${ordered.length}, minmax(0,1fr))` }}>
            {ordered.map((e) => (
              <div
                key={e.contractId}
                className="rounded-[var(--radius)] border border-[var(--paper-edge)] bg-[var(--paper-2)] p-4"
              >
                <h3 className="text-[var(--ink)]">{e.title}</h3>
                {e.favourability && (
                  <span className="eyebrow mt-1 block" style={{ color: FAV_COLOR[e.favourability] }}>
                    {FAV_LABEL[e.favourability]}
                  </span>
                )}
                {e.riskScore !== null && (
                  <span className="num text-xs text-[var(--ink-3)]">
                    {e.deviation} · {e.riskScore}/100
                  </span>
                )}
                <p className="mono mt-2 text-xs leading-[1.55] text-[var(--ink-2)]">
                  {e.clauseText ?? "(clause not found in this contract)"}
                </p>
                {e.verdict && <p className="mt-2 text-sm text-[var(--ink-2)]">{e.verdict}</p>}
              </div>
            ))}
          </div>

          {result.differences.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow mb-3">Material differences</p>
              <ul className="space-y-2">
                {result.differences.map((d, i) => (
                  <li key={i} className="border-l-2 border-[var(--paper-edge)] pl-3">
                    <span className="text-[var(--ink)]">{d.aspect}: </span>
                    <span className="text-[var(--ink-2)]">{d.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
