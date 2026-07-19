import { describe, expect, it } from "vitest";
import { formatReviewEmail, getSourcesDueWithin } from "@/lib/knowledge/freshness";
import { knowledgeSources } from "@/lib/knowledge/asturias";

describe("knowledge freshness", () => {
  it("reports sources due within the monthly review window", () => {
    const due = getSourcesDueWithin(new Date("2026-08-01T09:00:00Z"), 31);
    expect(due.length).toBeGreaterThan(0);
    expect(due.some((source) => source.id === "src-temporary-protection")).toBe(true);
    expect(formatReviewEmail(due)).toContain("https://");
  });

  it("marks an elapsed review date overdue", () => {
    const due = getSourcesDueWithin(new Date("2026-08-20T09:00:00Z"));
    expect(due.every((source) => source.overdue)).toBe(true);
  });

  it("uses the verified Ministerio del Interior page for international protection", () => {
    const source = knowledgeSources().find((item) => item.id === "src-international-protection");

    expect(source).toMatchObject({
      url: "https://www.interior.gob.es/opencms/es/servicios-al-ciudadano/tramites-y-gestiones/oficina-de-asilo-y-refugio/",
      lastVerifiedDate: "2026-07-19",
    });
  });
});
