import { describe, expect, it } from "vitest";
import { demoCases } from "@/lib/demo/cases";
import { UserCaseSchema } from "@/lib/schemas";

describe("UserCase schema", () => {
  it("accepts all three fictitious demo cases", () => {
    for (const demo of demoCases) expect(UserCaseSchema.safeParse(demo.userCase).success).toBe(true);
  });

  it("rejects an incomplete narrative", () => {
    const result = UserCaseSchema.safeParse({ ...demoCases[0].userCase, narrative: "мало" });
    expect(result.success).toBe(false);
  });

  it("allows an explicitly unknown immigration status", () => {
    const result = UserCaseSchema.parse({ ...demoCases[0].userCase, immigrationStatus: "unknown" });
    expect(result.immigrationStatus).toBe("unknown");
  });
});
