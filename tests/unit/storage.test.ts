// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoCases } from "@/lib/demo/cases";
import { createLiveAiConsent } from "@/lib/ai/consent";
import {
  clearLiveAiConsent,
  getStorageMode,
  loadCase,
  loadLiveAiConsent,
  saveCase,
  saveLiveAiConsent,
  setStorageMode,
} from "@/lib/storage";

describe("privacy-preserving case storage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });

  afterEach(() => vi.useRealTimers());

  it("expires a persistent case after 90 days of inactivity", () => {
    saveCase(demoCases[0].userCase);
    vi.setSystemTime(new Date("2026-04-02T12:00:01Z"));
    expect(loadCase()).toBeNull();
  });

  it("moves the case into session storage when the user chooses session-only", () => {
    saveCase(demoCases[0].userCase);
    setStorageMode("session");
    expect(getStorageMode()).toBe("session");
    expect(loadCase()?.id).toBe(demoCases[0].userCase.id);
    expect(localStorage.getItem("fora-navigator:case:v2")).toBeNull();
    expect(sessionStorage.getItem("fora-navigator:case:v2")).not.toBeNull();
  });

  it("keeps live consent in session storage and allows it to be cleared after one use", () => {
    const consent = createLiveAiConsent(demoCases[0].userCase.id, new Date());
    saveLiveAiConsent(consent);
    expect(loadLiveAiConsent()).toEqual(consent);
    expect(localStorage.length).toBe(0);

    clearLiveAiConsent();
    expect(loadLiveAiConsent()).toBeNull();
  });
});
