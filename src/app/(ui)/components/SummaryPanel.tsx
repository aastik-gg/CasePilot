import type { Analysis } from "@/domain/schemas/analysis";
import { RiskGauge } from "@/app/(ui)/components/RiskGauge";
import { RiskCategoryBar } from "@/app/(ui)/components/RiskCategoryBar";

/** The one-page executive summary — editorial serif, top-3 issues as numbered filing tabs (PRD F5). */
export function SummaryPanel({ analysis }: { analysis: Analysis | null }) {
  if (!analysis) {
    return <p className="text-sm text-[var(--ink-3)]">Summary not generated yet.</p>;
  }
  return (
    <div className="grid grid-cols-[minmax(0,68ch)_320px] gap-12 max-md:grid-cols-1">
      <div>
        <p
          className="text-lg leading-relaxed text-[var(--ink)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {analysis.overview}
        </p>

        <div className="mt-6">
          <p className="eyebrow mb-2">Who carries the risk</p>
          <p className="text-[var(--ink-2)]">{analysis.whoCarriesRisk}</p>
        </div>

        <div className="mt-6">
          <p className="eyebrow mb-3">Top issues to negotiate</p>
          <ol className="space-y-4">
            {analysis.topIssues.map((issue, i) => (
              <li key={i} className="border-l-2 border-[var(--claret)] pl-4">
                <div className="flex items-baseline gap-2">
                  <span className="mono text-xs text-[var(--claret)]">{i + 1}</span>
                  <h3 className="text-[var(--ink)]">{issue.title}</h3>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-2)]">{issue.detail}</p>
                {issue.clauseIds.length > 0 && (
                  <a
                    href={`#clause-${issue.clauseIds[0]}`}
                    className="mt-1 inline-block text-xs text-[var(--claret)] underline-offset-4 hover:underline"
                  >
                    See clause →
                  </a>
                )}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <aside className="border-l border-[var(--paper-edge)] pl-6 max-md:border-l-0 max-md:pl-0">
        <div className="flex justify-center">
          <RiskGauge score={analysis.overallRiskScore} />
        </div>

        <div className="mt-6">
          <p className="eyebrow mb-3">Risk by category</p>
          <RiskCategoryBar byCategory={analysis.riskByCategory} />
        </div>

        <div className="mt-6">
          <p className="eyebrow mb-3">Key commercial terms</p>
          <dl className="space-y-2">
            {analysis.keyTerms.map((t, i) => (
              <div key={i}>
                <dt className="text-xs text-[var(--ink-3)]">{t.label}</dt>
                <dd className="mono text-sm text-[var(--ink)]">{t.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
