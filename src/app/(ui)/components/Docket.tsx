"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { id: string; title: string; pageCount: number | null; status: string };

/** The contracts list with client-side search by title. */
export function Docket({ contracts }: { contracts: Item[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? contracts.filter((c) => c.title.toLowerCase().includes(query))
    : contracts;

  return (
    <section className="mt-16">
      <div className="mb-3 flex items-center justify-between gap-4 border-b border-[var(--paper-edge)] pb-2">
        <p className="eyebrow">Docket</p>
        {contracts.length > 0 && (
          <label className="relative flex items-center">
            <svg
              className="pointer-events-none absolute left-2.5"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--ink-3)"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contracts…"
              aria-label="Search contracts"
              className="w-56 rounded-md border border-[var(--paper-edge)] bg-[var(--paper-2)] py-1.5 pl-8 pr-3 text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] focus:border-[var(--claret)] max-sm:w-40"
            />
          </label>
        )}
      </div>

      {contracts.length === 0 ? (
        <p className="py-6 text-sm text-[var(--ink-3)]">No contracts yet — drop one above to begin.</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-sm text-[var(--ink-3)]">
          No contracts match &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--paper-edge)]">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/contracts/${c.id}`}
                className="group flex items-center justify-between gap-4 px-2 py-4 transition-colors hover:bg-[var(--paper-2)]"
              >
                <span
                  className="truncate text-lg text-[var(--ink)] group-hover:text-[var(--claret)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {c.title}
                </span>
                <span className="mono shrink-0 text-xs text-[var(--ink-3)]">
                  {c.pageCount ? `${c.pageCount}p · ` : ""}
                  {c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
