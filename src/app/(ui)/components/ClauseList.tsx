import { CLAUSE_LABELS, type Clause } from "@/domain/schemas/clause";
import { RISK_CATEGORY_LABELS } from "@/domain/schemas/risk";
import type { ClauseAssessment } from "@/domain/schemas/assessment";
import { deviationColor, severityColor } from "@/app/(ui)/lib/risk";

/**
 * Clauses ranked by risk: mono verbatim text beside the benchmark verdict + risk (counsel's note),
 * with jump-to-source (PRD F2–F4, FRONTEND_DESIGN §7.3).
 */
export function ClauseList({
  clauses,
  assessments,
}: {
  clauses: Clause[];
  assessments: ClauseAssessment[];
}) {
  if (clauses.length === 0) {
    return <p className="text-sm text-[var(--ink-3)]">No named clauses extracted.</p>;
  }

  const byClause = new Map(assessments.map((a) => [a.clauseId, a] as const));
  const ranked = [...clauses].sort(
    (a, b) => (byClause.get(b.id)?.riskScore ?? -1) - (byClause.get(a.id)?.riskScore ?? -1),
  );

  return (
    <ul className="space-y-4">
      {ranked.map((c) => {
        const a = byClause.get(c.id);
        const risk = severityColor(a?.severity ?? null);
        return (
          <li
            key={c.id}
            id={`clause-${c.id}`}
            className="group relative grid scroll-mt-20 grid-cols-[1fr_260px] gap-6 rounded-[var(--radius)] border border-[var(--paper-edge)] bg-[var(--paper-2)] p-5 shadow-[var(--shadow-page)] max-md:grid-cols-1"
          >
            <span
              className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-[var(--claret)] transition-transform duration-300 group-hover:scale-y-100"
              aria-hidden
            />
            <div>
              <p className="eyebrow">{CLAUSE_LABELS[c.clauseType]}</p>
              <p className="mono mt-2 text-sm leading-[1.55] text-[var(--ink)]">{c.verbatimText}</p>
              {c.nodeIds.length > 0 && (
                <a
                  href={`#node-${c.nodeIds[0]}`}
                  className="mt-3 inline-block text-sm text-[var(--claret)] underline-offset-4 hover:underline"
                >
                  View in document →
                </a>
              )}
            </div>

            <aside className="border-l border-[var(--paper-edge)] pl-5 max-md:border-l-0 max-md:pl-0">
              {a ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                      style={{ color: deviationColor(a.deviation), borderColor: deviationColor(a.deviation) }}
                    >
                      {a.deviation}
                    </span>
                    {a.severity && (
                      <span className="num text-sm" style={{ color: risk }}>
                        {a.riskScore}/100 · {a.severity}
                      </span>
                    )}
                  </div>
                  {a.riskCategories.length > 0 && (
                    <p className="mt-2 text-xs text-[var(--ink-3)]">
                      {a.riskCategories.map((cat) => RISK_CATEGORY_LABELS[cat]).join(" · ")}
                    </p>
                  )}
                  <p
                    className="mt-3 text-[0.95rem] leading-relaxed text-[var(--ink-2)]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {a.rationale}
                  </p>
                  {a.suggestedRedline && (
                    <div className="mt-3 rounded border border-dashed border-[var(--paper-edge)] p-3">
                      <p className="eyebrow mb-1" style={{ color: "var(--risk-standard)" }}>
                        Suggested language
                      </p>
                      <p className="mono text-xs leading-[1.5] text-[var(--ink-2)]">
                        {a.suggestedRedline}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <span className="num text-xs text-[var(--ink-3)]">
                  {Math.round(c.confidence * 100)}% confidence
                </span>
              )}
            </aside>
          </li>
        );
      })}
    </ul>
  );
}
