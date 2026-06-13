/** Persistent legal/ethical disclaimer — required on every surface (PRD §5, FRONTEND_DESIGN §8). */
export function Disclaimer() {
  return (
    <footer className="border-t border-[var(--paper-edge)] px-8 py-3 text-xs text-[var(--ink-3)] max-md:px-5">
      CasePilot is decision support, not legal advice. Always have a qualified lawyer review flagged
      clauses before acting.
    </footer>
  );
}
