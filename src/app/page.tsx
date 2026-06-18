import { SignInButton, SignUpButton } from "@clerk/nextjs";

const VALUE_PROPS = [
  {
    eyebrow: "Clause extraction",
    title: "Structure the noise",
    body: "CasePilot parses long agreements into typed clauses—liability caps, indemnity, termination—so you review what matters, not page count.",
  },
  {
    eyebrow: "Risk scoring",
    title: "Surface the 10%",
    body: "Each clause is assessed against your standards. High and critical flags rise to the top so counsel focuses on decisions, not discovery.",
  },
  {
    eyebrow: "Comparison",
    title: "Align across deals",
    body: "Compare the same clause type side by side across contracts. Spot drift, outliers, and negotiation gaps before they become surprises.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <section className="py-8 text-center max-md:py-4">
        <p className="eyebrow">Legal Document Intelligence</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-5xl leading-[1.05] text-[var(--ink)] max-md:text-4xl">
          Find the risk before your lawyer does.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--ink-2)]">
          Upload a contract. CasePilot structures it, extracts the clauses that matter, and surfaces
          the 10% that needs a human decision.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <SignUpButton mode="modal" forceRedirectUrl="/contracts">
            <button
              type="button"
              className="rounded-md bg-[var(--claret)] px-5 py-2.5 text-sm font-medium text-[var(--paper)] transition-colors hover:bg-[var(--claret-soft)]"
            >
              Get started
            </button>
          </SignUpButton>
          <SignInButton mode="modal" forceRedirectUrl="/contracts">
            <button
              type="button"
              className="rounded-md border border-[var(--paper-edge)] bg-[var(--paper-2)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] transition-colors hover:border-[var(--ink-3)]"
            >
              Sign in
            </button>
          </SignInButton>
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3 max-md:mt-10">
        {VALUE_PROPS.map((item) => (
          <article
            key={item.eyebrow}
            className="rounded-lg border border-[var(--paper-edge)] bg-[var(--paper-2)] p-6"
            style={{ boxShadow: "var(--shadow-page)" }}
          >
            <p className="eyebrow">{item.eyebrow}</p>
            <h2 className="mt-2 text-xl text-[var(--ink)]">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 rounded-lg border border-[var(--paper-edge)] bg-[var(--paper-2)] px-8 py-10 text-center max-md:mt-10 max-md:px-5">
        <h2 className="text-2xl text-[var(--ink)]">Ready to review smarter?</h2>
        <p className="mx-auto mt-2 max-w-md text-[var(--ink-2)]">
          Start with a single upload. No setup required—your docket is waiting.
        </p>
        <div className="mt-6">
          <SignUpButton mode="modal" forceRedirectUrl="/contracts">
            <button
              type="button"
              className="rounded-md bg-[var(--claret)] px-5 py-2.5 text-sm font-medium text-[var(--paper)] transition-colors hover:bg-[var(--claret-soft)]"
            >
              Sign up free
            </button>
          </SignUpButton>
        </div>
        <p className="mt-4 text-sm text-[var(--ink-3)]">
          Already have an account?{" "}
          <SignInButton mode="modal" forceRedirectUrl="/contracts">
            <button type="button" className="text-[var(--claret)] underline-offset-2 hover:underline">
              Sign in
            </button>
          </SignInButton>
        </p>
      </section>
    </div>
  );
}
