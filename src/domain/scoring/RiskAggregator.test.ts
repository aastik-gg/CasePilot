import { describe, expect, it } from "vitest";
import { aggregateRisk } from "@/domain/scoring/RiskAggregator";
import type { ClauseAssessment } from "@/domain/schemas/assessment";
import type { ClauseType } from "@/domain/schemas/clause";

function mk(
  clauseId: string,
  riskScore: number | null,
  severity: ClauseAssessment["severity"],
  riskCategories: ClauseAssessment["riskCategories"] = [],
): ClauseAssessment {
  return {
    clauseId,
    contractId: "c",
    marketStandardId: null,
    deviation: "standard",
    rationale: "",
    riskScore,
    severity,
    riskCategories,
  };
}

describe("aggregateRisk", () => {
  it("returns zero when nothing is scored", () => {
    const r = aggregateRisk([mk("a", null, null)], new Map());
    expect(r.overall).toBe(0);
    expect(r.byCategory).toEqual({ financial: 0, operational: 0, legal: 0, reputational: 0 });
  });

  it("weights by clause-type importance", () => {
    const types = new Map<string, ClauseType>([
      ["a", "liability_limit"], // importance 1.0
      ["b", "governing_law"], // importance 0.4
    ]);
    const r = aggregateRisk([mk("a", 80, "critical"), mk("b", 0, "low")], types);
    // weighted avg (80*1.0 + 0*0.4)/1.4 ≈ 57, but critical floor (80) dominates
    expect(r.overall).toBe(80);
  });

  it("applies the critical floor so one critical clause isn't diluted", () => {
    const types = new Map<string, ClauseType>([
      ["a", "confidentiality"],
      ["b", "governing_law"],
      ["c", "payment_terms"],
    ]);
    const r = aggregateRisk(
      [mk("a", 90, "critical"), mk("b", 5, "low"), mk("c", 10, "low")],
      types,
    );
    expect(r.overall).toBeGreaterThanOrEqual(80); // floor, not the low average
  });

  it("averages per category over clauses tagged with it", () => {
    const types = new Map<string, ClauseType>([
      ["a", "indemnity"],
      ["b", "payment_terms"],
    ]);
    const r = aggregateRisk(
      [mk("a", 60, "high", ["legal"]), mk("b", 40, "medium", ["financial", "legal"])],
      types,
    );
    expect(r.byCategory.financial).toBe(40);
    expect(r.byCategory.legal).toBe(50); // (60 + 40) / 2
    expect(r.byCategory.operational).toBe(0);
  });

  it("clamps the overall score to 0–100", () => {
    const types = new Map<string, ClauseType>([["a", "liability_limit"]]);
    const r = aggregateRisk([mk("a", 100, "critical")], types);
    expect(r.overall).toBeLessThanOrEqual(100);
    expect(r.overall).toBeGreaterThanOrEqual(0);
  });
});
