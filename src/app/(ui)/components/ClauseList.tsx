import { CLAUSE_LABELS, type Clause } from "@/domain/schemas/clause";
import { RISK_CATEGORY_LABELS } from "@/domain/schemas/risk";
import type { ClauseAssessment } from "@/domain/schemas/assessment";
import { deviationColor, severityColor } from "@/app/(ui)/lib/risk";

/**
 * Clause Explorer — clauses ranked by risk, with a § column, the verbatim text in a record block,
 * and a counsel's-note column (deviation chip, score, rationale, suggested redline). PRD F2–F4.
 */
export function ClauseList({
  clauses,
  assessments,
  numberByNodeId,
}: {
  clauses: Clause[];
  assessments: ClauseAssessment[];
  numberByNodeId: Map<string, string | null>;
}) {
  const byClause = new Map(assessments.map((a) => [a.clauseId, a] as const));
  const ranked = [...clauses].sort(
    (a, b) => (byClause.get(b.id)?.riskScore ?? -1) - (byClause.get(a.id)?.riskScore ?? -1),
  );
  const flaggedCount = assessments.filter(
    (a) => a.severity === "high" || a.severity === "critical",
  ).length;

  return (
    <div>
      <div className="mb-4 flex items-end justify-between border-b border-[var(--paper-edge)] pb-3">
        <div>
          <h2 className="text-2xl text-[var(--ink)]">Clause Explorer</h2>
          <p className="mt-0.5 text-sm text-[var(--ink-3)]">
            Sorted by risk · {flaggedCount} high/critical deviation{flaggedCount === 1 ? "" : "s"} detected
          </p>
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">No named clauses extracted.</p>
      ) : (
        <ul className="space-y-4">
          {ranked.map((c) => {
            const a = byClause.get(c.id);
            const risk = severityColor(a?.severity ?? null);
            const sectionNo = numberByNodeId.get(c.nodeIds[0] ?? "") ?? null;
            return (
              <li
                key={c.id}
                id={`clause-${c.id}`}
                className="group relative flex scroll-mt-20 overflow-hidden rounded-[var(--radius)] border border-[var(--paper-edge)] bg-[var(--paper-2)] shadow-[var(--shadow-page)]"
              >
                <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: risk }} aria-hidden />

                <div className="flex w-14 shrink-0 items-center justify-center border-r border-[var(--paper-edge)] bg-[var(--paper)]">
                  <span className="mono text-xs text-[var(--ink-3)]">{sectionNo ? `§ ${sectionNo}` : "—"}</span>
                </div>

                <div className="grid flex-1 gap-5 p-5 lg:grid-cols-3 max-md:grid-cols-1">
                  <div className="lg:col-span-2">
                    <p className="eyebrow">{CLAUSE_LABELS[c.clauseType]}</p>
                    <p className="mono mt-2 rounded border border-[var(--paper-edge)] bg-[var(--paper)] p-3 text-sm leading-[1.55] text-[var(--ink)]">
                      {c.verbatimText}
                    </p>
                    {a?.suggestedRedline && (
                      <div className="mt-3 rounded border border-dashed border-[var(--paper-edge)] p-3">
                        <p className="eyebrow mb-1" style={{ color: "var(--risk-standard)" }}>
                          Suggested revision
                        </p>
                        <p className="mono text-xs leading-[1.5] text-[var(--ink-2)]">{a.suggestedRedline}</p>
                      </div>
                    )}
                    {c.nodeIds.length > 0 && (
                      <a
                        href={`#node-${c.nodeIds[0]}`}
                        className="mt-3 inline-block text-sm text-[var(--claret)] underline-offset-4 hover:underline"
                      >
                        View in document →
                      </a>
                    )}
                  </div>

                  <aside className="flex flex-col gap-3 border-[var(--paper-edge)] lg:border-l lg:pl-5 max-md:border-t max-md:pt-4">
                    {a ? (
                      <>
                        <div className="flex items-start justify-between">
                          <span
                            className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs uppercase tracking-wide"
                            style={{ color: deviationColor(a.deviation), borderColor: deviationColor(a.deviation) }}
                          >
                            {a.deviation}
                          </span>
                          {a.severity && (
                            <span className="num text-2xl leading-none" style={{ color: risk }}>
                              {a.riskScore}
                              <span className="text-xs text-[var(--ink-3)]">/100</span>
                            </span>
                          )}
                        </div>
                        {a.severity && (
                          <span className="eyebrow" style={{ color: risk }}>
                            {a.severity} risk
                          </span>
                        )}
                        <p
                          className="text-[0.95rem] italic leading-relaxed text-[var(--ink-2)]"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {a.rationale}
                        </p>
                        {a.riskCategories.length > 0 && (
                          <p className="text-xs text-[var(--ink-3)]">
                            {a.riskCategories.map((cat) => RISK_CATEGORY_LABELS[cat]).join(" · ")}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="num text-xs text-[var(--ink-3)]">
                        {Math.round(c.confidence * 100)}% confidence
                      </span>
                    )}
                  </aside>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
