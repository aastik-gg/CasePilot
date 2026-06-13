import { CLAUSE_LABELS, type Clause } from "@/domain/schemas/clause";

/** Extracted clauses: mono verbatim text + jump-to-source (PRD F2, FRONTEND_DESIGN §7.3). Risk lands in P2. */
export function ClauseList({ clauses }: { clauses: Clause[] }) {
  if (clauses.length === 0) {
    return <p className="text-sm text-[var(--ink-3)]">No named clauses extracted.</p>;
  }
  return (
    <ul className="space-y-4">
      {clauses.map((c) => (
        <li
          key={c.id}
          id={`clause-${c.id}`}
          className="scroll-mt-20 rounded-[var(--radius)] border border-[var(--paper-edge)] bg-[var(--paper-2)] p-5 shadow-[var(--shadow-page)]"
        >
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">{CLAUSE_LABELS[c.clauseType]}</p>
            <span className="num text-xs text-[var(--ink-3)]">
              {Math.round(c.confidence * 100)}% confidence
            </span>
          </div>
          <p className="mono mt-2 text-sm leading-[1.55] text-[var(--ink)]">{c.verbatimText}</p>
          {c.nodeIds.length > 0 && (
            <a
              href={`#node-${c.nodeIds[0]}`}
              className="mt-3 inline-block text-sm text-[var(--claret)] underline-offset-4 hover:underline"
            >
              View in document →
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
