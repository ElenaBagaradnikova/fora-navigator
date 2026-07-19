import { describe, expect, it } from "vitest";
import { auditModelPlan } from "@/lib/ai/audit";
import { createFallbackPlan } from "@/lib/demo/fallback-plan";
import { demoCases } from "@/lib/demo/cases";
import { ModelNavigationPlanSchema, type ModelNavigationPlan } from "@/lib/schemas";

function validModelPlan(): ModelNavigationPlan {
  return structuredClone(ModelNavigationPlanSchema.parse(createFallbackPlan(demoCases[0].userCase)));
}

describe("model plan postflight audit", () => {
  it("accepts the canonical local fixture with matching deterministic context", () => {
    expect(auditModelPlan(validModelPlan(), demoCases[0].userCase).schemaVersion).toBe("2.0");
  });

  it("rejects spoofed canonical source metadata", () => {
    const plan = validModelPlan();
    plan.sources[0].title = "Plausible but model-invented title";
    expect(() => auditModelPlan(plan)).toThrow(/не совпадает/);
  });

  it("rejects unknown document sources and missing uncertainty caveats", () => {
    const unknown = validModelPlan();
    unknown.documents[0].verification.sourceIds = ["src-invented"];
    expect(() => auditModelPlan(unknown)).toThrow(/неизвестный источник/);

    const caveat = validModelPlan();
    caveat.documents[0].verification.confidence = "medium";
    caveat.documents[0].verification.caveat = "Check later";
    expect(() => auditModelPlan(caveat)).toThrow(/оговорку/);
  });

  it("rejects duplicate IDs and unknown documents", () => {
    const duplicate = validModelPlan();
    duplicate.actions[1].id = duplicate.actions[0].id;
    expect(() => auditModelPlan(duplicate)).toThrow(/повторяющийся/);

    const unknownDocument = validModelPlan();
    unknownDocument.actions[0].documentIds = ["doc-invented"];
    expect(() => auditModelPlan(unknownDocument)).toThrow(/неизвестный документ/);
  });

  it("rejects missing, self-referential and cyclic dependencies", () => {
    const missing = validModelPlan();
    missing.actions[0].dependsOnActionIds = ["action-invented"];
    expect(() => auditModelPlan(missing)).toThrow(/неизвестного шага/);

    const self = validModelPlan();
    self.actions[0].dependsOnActionIds = [self.actions[0].id];
    expect(() => auditModelPlan(self)).toThrow(/самого себя/);

    const cycle = validModelPlan();
    cycle.actions[0].dependsOnActionIds = [cycle.actions[1].id];
    cycle.actions[1].dependsOnActionIds = [cycle.actions[0].id];
    expect(() => auditModelPlan(cycle)).toThrow(/цикл/);
  });

  it("rejects changes to locale or server-determined urgency", () => {
    const locale = validModelPlan();
    locale.locale = "en";
    expect(() => auditModelPlan(locale, demoCases[0].userCase)).toThrow(/Язык плана/);

    const urgency = validModelPlan();
    urgency.urgency.message = "Model changed the server result";
    expect(() => auditModelPlan(urgency, demoCases[0].userCase)).toThrow(/срочности/);
  });

  it("rejects personal identifiers and positive guarantees in output", () => {
    const pii = validModelPlan();
    pii.caseSummary += " NIE X1234567L";
    expect(() => auditModelPlan(pii)).toThrow(/идентификатор/);

    const guarantee = validModelPlan();
    guarantee.actions[0].expectedResult = "Мы гарантируем выплату после подачи.";
    expect(() => auditModelPlan(guarantee)).toThrow(/обещание/);
  });
});
