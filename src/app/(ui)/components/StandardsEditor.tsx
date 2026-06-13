"use client";

import { useState } from "react";
import { CLAUSE_LABELS } from "@/domain/schemas/clause";
import type { MarketStandard } from "@/domain/schemas/marketStandard";

/** Edit the org's market-standard baseline (PRD F3.4 — configurable baseline). */
export function StandardsEditor({ initial }: { initial: MarketStandard[] }) {
  const editable = initial.filter((s) => s.clauseType !== "other");
  return (
    <div className="space-y-5">
      {editable.map((s) => (
        <StandardCard key={`${s.clauseType}:${s.perspective}`} standard={s} />
      ))}
    </div>
  );
}

function StandardCard({ standard }: { standard: MarketStandard }) {
  const [position, setPosition] = useState(standard.standardPosition);
  const [range, setRange] = useState(standard.acceptableRange ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const isDefault = standard.id.startsWith("default:");

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/market-standards", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clauseType: standard.clauseType,
          perspective: standard.perspective,
          title: standard.title,
          standardPosition: position,
          acceptableRange: range || null,
          referenceLanguage: standard.referenceLanguage,
          sourceNote: standard.sourceNote,
          active: true,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--paper-edge)] bg-[var(--paper-2)] p-5">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow">{CLAUSE_LABELS[standard.clauseType]}</p>
        <span className="text-xs text-[var(--ink-3)]">{isDefault ? "default" : "custom"}</span>
      </div>
      <label className="mt-3 block text-xs text-[var(--ink-3)]">Standard position</label>
      <textarea
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        rows={3}
        className="mt-1 block w-full rounded border border-[var(--paper-edge)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]"
      />
      <label className="mt-2 block text-xs text-[var(--ink-3)]">Acceptable range</label>
      <input
        value={range}
        onChange={(e) => setRange(e.target.value)}
        className="mt-1 block w-full rounded border border-[var(--paper-edge)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)]"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-[var(--claret)] px-3 py-1.5 text-sm text-[var(--paper)] disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save override"}
        </button>
        {saved && <span className="text-xs text-[var(--risk-standard)]">Saved ✓</span>}
      </div>
    </div>
  );
}
