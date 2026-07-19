import { describe, expect, it } from "vitest";
import {
  NAVIGATION_PIPELINE_STAGES,
  NAVIGATION_PIPELINE_VERSION,
} from "@/lib/ai/pipeline";

describe("navigation pipeline contract", () => {
  it("has seven narrow, uniquely named stages", () => {
    expect(NAVIGATION_PIPELINE_VERSION).toBe("3.0");
    expect(NAVIGATION_PIPELINE_STAGES).toHaveLength(7);
    expect(new Set(NAVIGATION_PIPELINE_STAGES).size).toBe(7);
  });
});
