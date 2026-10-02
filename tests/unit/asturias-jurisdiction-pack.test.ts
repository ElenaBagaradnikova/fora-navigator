import { describe, expect, it } from "vitest";
import { AsturiasJurisdictionPack } from "@/jurisdictions/es/asturias";
import { AsturiasRules } from "@/jurisdictions/es/asturias/rules";

describe("ES-ASTURIAS jurisdiction pack boundary", () => {
  it("starts as a draft pack rather than claiming validation", () => {
    expect(AsturiasJurisdictionPack.id).toBe("ES-ASTURIAS");
    expect(AsturiasJurisdictionPack.status).toBe("draft");
  });

  it("does not ship invented Asturias rules before source review", () => {
    expect(AsturiasRules).toEqual([]);
  });
});
