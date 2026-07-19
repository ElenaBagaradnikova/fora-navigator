import { describe, expect, it } from "vitest";
import { auditModelPlan } from "@/lib/ai/audit";
import { demoCases, getDemoCases } from "@/lib/demo/cases";
import { createFallbackPlan } from "@/lib/demo/fallback-plan";
import { FinalNavigationPlanSchema } from "@/lib/schemas";

describe("safe fallback navigation plan", () => {
  it("passes the complete runtime schema and contains bilingual drafts", () => {
    const plan = createFallbackPlan(demoCases[0].userCase);
    expect(FinalNavigationPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.mode).toBe("demo");
    expect(plan.drafts.some((draft) => draft.bodyRu.length > 30 && draft.bodyEs.length > 30)).toBe(true);
  });

  it("has evidence metadata for every administrative action", () => {
    const plan = createFallbackPlan(demoCases[0].userCase);
    for (const action of plan.actions) {
      expect(action.verification.confidence).toBeTruthy();
      expect(action.verification.sourceIds.length > 0 || action.verification.needsHumanVerification).toBe(true);
    }
  });

  it("creates complete Russian, Ukrainian and English pathways", () => {
    for (const locale of ["ru", "uk", "en"] as const) {
      const userCase = getDemoCases(locale)[0].userCase;
      const plan = createFallbackPlan(userCase, undefined, locale);
      expect(plan.locale).toBe(locale);
      expect(plan.schemaVersion).toBe("2.0");
      expect(plan.drafts.every((draft) => draft.bodyRu && draft.bodyUk && draft.bodyEn && draft.bodyEs)).toBe(true);
    }
  });

  it("keeps every action dependency resolvable and every source reviewable", () => {
    const plan = createFallbackPlan(demoCases[0].userCase);
    const ids = new Set(plan.actions.map((action) => action.id));
    for (const action of plan.actions) {
      expect(action.dependsOnActionIds).not.toContain(action.id);
      expect(action.dependsOnActionIds.every((id) => ids.has(id))).toBe(true);
    }
    for (const source of plan.sources) {
      expect(source.nextReviewDate >= source.lastVerifiedDate).toBe(true);
      expect(source.verificationMethod).toBeTruthy();
    }
  });

  it("changes the status route for temporary protection", () => {
    const plan = createFallbackPlan(demoCases[0].userCase);
    const status = plan.actions.find((action) => action.id === "action-status");
    expect(status?.verification.sourceIds).toContain("src-temporary-protection");
    expect(status?.action).toContain("Временная защита");
  });

  it("never marks apostille as universally required", () => {
    const plan = createFallbackPlan(demoCases[2].userCase);
    const item = plan.documents.find((document) => document.id === "doc-legalisation-check");
    expect(item?.status).toBe("apostille_maybe");
    expect(item?.note).toContain("не всегда");
  });

  it("rejects malformed model output", () => {
    expect(() => auditModelPlan({ schemaVersion: "2.0", actions: [] })).toThrow();
  });
});
