import { beforeAll, describe, expect, it } from "vitest";
import { AiSdkLlmAdapter } from "@/infrastructure/llm/AiSdkLlmAdapter";
import { ModelRouter } from "@/infrastructure/llm/ModelRouter";
import { StructureBuilder } from "@/infrastructure/parsing/StructureBuilder";
import { ExtractStage } from "@/application/pipeline/ExtractStage";
import { BenchmarkStage } from "@/application/pipeline/BenchmarkStage";
import { ScoreStage } from "@/application/pipeline/ScoreStage";
import { SummariseStage } from "@/application/pipeline/SummariseStage";
import { CompareClausesUseCase } from "@/application/CompareClausesUseCase";
import { isOk } from "@/domain/result";
import type { Contract } from "@/domain/schemas/contract";
import type { Clause } from "@/domain/schemas/clause";
import type { ClauseAssessment } from "@/domain/schemas/assessment";
import type { Analysis } from "@/domain/schemas/analysis";
import {
  FakeAnalysisRepo,
  FakeAssessmentRepo,
  FakeClauseRepo,
  FakeContractRepo,
  FakeDocumentNodeRepo,
  FakeMarketStandardRepo,
} from "./fakes";
import { ALL_TYPES_CONTRACT, COMPARE_CONTRACTS } from "./corpus/contracts";

const RUN = Boolean(process.env.ANTHROPIC_API_KEY);
const ORG = "eval-org";

function makeContract(id: string, title: string): Contract {
  return {
    id,
    orgId: ORG,
    ownerId: "eval",
    title,
    partyPerspective: "us",
    originalFilename: `${title}.txt`,
    mimeType: "application/pdf",
    r2Key: "",
    pageCount: 1,
    status: "ready",
    createdAt: new Date(),
  };
}

// The integration eval makes live model calls — only runs when ANTHROPIC_API_KEY is set.
(RUN ? describe : describe.skip)("CasePilot eval scorecard (M1–M5)", () => {
  const nodes = new FakeDocumentNodeRepo();
  const clausesRepo = new FakeClauseRepo();
  const assessmentsRepo = new FakeAssessmentRepo();
  const analysesRepo = new FakeAnalysisRepo();
  const standards = new FakeMarketStandardRepo();
  const contractsRepo = new FakeContractRepo();
  const llm = new AiSdkLlmAdapter(new ModelRouter());
  const structure = new StructureBuilder();

  const main = makeContract("eval-main", ALL_TYPES_CONTRACT.title);
  let clauses: Clause[] = [];
  let assessments: ClauseAssessment[] = [];
  let analysis: Analysis | null = null;

  beforeAll(async () => {
    contractsRepo.seed(main);
    await nodes.saveTree(main.id, structure.build([ALL_TYPES_CONTRACT.text]));

    const extract = await new ExtractStage(llm, nodes, clausesRepo).run({ contract: main });
    expect(isOk(extract)).toBe(true);
    await new BenchmarkStage(llm, clausesRepo, assessmentsRepo, standards).run({ contract: main });
    await new ScoreStage(llm, clausesRepo, assessmentsRepo).run({ contract: main });
    await new SummariseStage(llm, clausesRepo, assessmentsRepo, analysesRepo).run({ contract: main });

    clauses = await clausesRepo.listByContract(main.id);
    assessments = await assessmentsRepo.listByContract(main.id);
    analysis = await analysesRepo.getByContract(main.id);

    // Print a human-readable scorecard.
    const types = new Set(clauses.map((c) => c.clauseType));
    const covered = ALL_TYPES_CONTRACT.expectedClauseTypes.filter((t) => types.has(t)).length;
    const aByClause = new Map(assessments.map((a) => [a.clauseId, a] as const));
    const flagged = ALL_TYPES_CONTRACT.landmineTypes.filter((t) => {
      const c = clauses.find((x) => x.clauseType === t);
      const a = c && aByClause.get(c.id);
      return a && (a.severity === "high" || a.severity === "critical");
    }).length;
    console.log(
      `\n── CasePilot Scorecard ─────────────────────────\n` +
        `M1 clause coverage: ${covered}/${ALL_TYPES_CONTRACT.expectedClauseTypes.length}\n` +
        `M2 landmines flagged high/critical: ${flagged}/${ALL_TYPES_CONTRACT.landmineTypes.length}\n` +
        `M3 summary: ${analysis ? "generated" : "MISSING"} · overall risk ${analysis?.overallRiskScore}\n` +
        `────────────────────────────────────────────────\n`,
    );
  });

  it("M1 — extracts all named clause types", () => {
    const types = new Set(clauses.map((c) => c.clauseType));
    for (const t of ALL_TYPES_CONTRACT.expectedClauseTypes) {
      expect(types.has(t), `missing clause type: ${t}`).toBe(true);
    }
  });

  it("M4 — flags the customer-hostile clauses as deviating from standard", () => {
    const aByClause = new Map(assessments.map((a) => [a.clauseId, a] as const));
    for (const t of ALL_TYPES_CONTRACT.landmineTypes) {
      const clause = clauses.find((c) => c.clauseType === t);
      expect(clause, `no clause for ${t}`).toBeTruthy();
      const a = aByClause.get(clause!.id);
      expect(a, `no assessment for ${t}`).toBeTruthy();
      expect(["unfavourable", "unusual"], `${t} should deviate`).toContain(a!.deviation);
    }
  });

  it("M2 — scores the landmine clauses as high/critical risk", () => {
    const aByClause = new Map(assessments.map((a) => [a.clauseId, a] as const));
    for (const t of ALL_TYPES_CONTRACT.landmineTypes) {
      const clause = clauses.find((c) => c.clauseType === t)!;
      const a = aByClause.get(clause.id)!;
      expect(["high", "critical"], `${t} severity was ${a.severity}`).toContain(a.severity);
    }
  });

  it("M3 — produces a grounded, comprehensible summary", () => {
    expect(analysis).toBeTruthy();
    expect(analysis!.overview.length).toBeGreaterThan(40);
    expect(analysis!.topIssues.length).toBeGreaterThanOrEqual(1);
    expect(analysis!.overallRiskScore).toBeGreaterThan(0);
    // Faithfulness: every cited clause id resolves to a real extracted clause.
    const ids = new Set(clauses.map((c) => c.id));
    for (const issue of analysis!.topIssues) {
      for (const cid of issue.clauseIds) expect(ids.has(cid)).toBe(true);
    }
  });

  it(
    "M5 — surfaces differences and ranks a clause across contracts",
    async () => {
      const ids: string[] = [];
      for (const spec of COMPARE_CONTRACTS) {
        const c = makeContract(`cmp-${spec.title}`, spec.title);
        contractsRepo.seed(c);
        await nodes.saveTree(c.id, structure.build([spec.text]));
        await new ExtractStage(llm, nodes, clausesRepo).run({ contract: c });
        ids.push(c.id);
      }

      const result = await new CompareClausesUseCase(contractsRepo, clausesRepo, assessmentsRepo, llm).execute(
        ORG,
        "liability_limit",
        ids,
      );
      expect(isOk(result)).toBe(true);
      if (!isOk(result)) return;

      expect(result.value.ranking.length).toBe(3);
      expect(result.value.differences.length).toBeGreaterThan(0);
      // The "unlimited customer liability" contract must not rank as most favourable.
      const hostileId = ids[1]; // Vendor B (hostile)
      expect(result.value.ranking[0]).not.toBe(hostileId);
    },
    300_000,
  );
});
