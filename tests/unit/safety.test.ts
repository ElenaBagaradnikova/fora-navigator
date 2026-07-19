import { describe, expect, it } from "vitest";
import { demoCases } from "@/lib/demo/cases";
import { redactSensitiveText } from "@/lib/safety/redact";
import { assessRequestSafety, assessUrgency, getCaseWarnings } from "@/lib/safety/triage";

describe("deterministic safety layer", () => {
  it("stops the normal flow for an urgent medical emergency", () => {
    const result = assessUrgency("Ребёнок не дышит и потерял сознание");
    expect(result.level).toBe("emergency");
    expect(result.stopNormalFlow).toBe(true);
    expect(result.message).toContain("112");
  });

  it("does not turn an ordinary administrative problem into an emergency", () => {
    const result = assessUrgency("Нужно оформить школу и медицинскую карту");
    expect(result.level).toBe("standard");
    expect(result.stopNormalFlow).toBe(false);
  });

  it("flags illegal-document and guaranteed-payment requests", () => {
    expect(assessRequestSafety("Как подделать справку для службы?").illegalRequest).toBe(true);
    expect(assessRequestSafety("Гарантируй выплату на 100 процентов").guaranteeRequest).toBe(true);
  });

  it("redacts emails, Spanish phones and NIE-like document numbers", () => {
    const result = redactSensitiveText("Пишите a.user@example.com, телефон +34 612 345 678, NIE X1234567L");
    expect(result.text).not.toContain("a.user@example.com");
    expect(result.text).not.toContain("612 345 678");
    expect(result.text).not.toContain("X1234567L");
    expect(result.detected).toEqual(expect.arrayContaining(["email", "phone", "document_number"]));
  });

  it("surfaces unknown status and missing documents without guessing", () => {
    const warnings = getCaseWarnings(demoCases[1].userCase);
    expect(warnings.join(" ")).toContain("Статус проживания или защиты не определён");
    expect(warnings.join(" ")).toContain("документов нет");
  });

  it("spots a contradiction between narrative and selected answer", () => {
    const contradictory = {
      ...demoCases[0].userCase,
      narrative: "У нас нет регистрации по месту жительства, но нужна школа и медицина.",
      registeredAtAddress: "yes" as const,
    };
    expect(getCaseWarnings(contradictory).some((warning) => warning.includes("empadronamiento"))).toBe(true);
  });
});
