import { z } from "zod";
import {
  FinalNavigationPlanSchema,
  LiveAiConsentSchema,
  UserCaseSchema,
  type FinalNavigationPlan,
  type LiveAiConsent,
  type UserCase,
} from "@/lib/schemas";

const CASE_KEY = "fora-navigator:case:v2";
const PLAN_KEY = "fora-navigator:plan:v2";
const MODE_KEY = "fora-navigator:storage-mode:v1";
const LIVE_AI_CONSENT_KEY = "fora-navigator:live-ai-consent:v1";
const LEGACY_KEYS = ["fora-navigator:case:v1", "fora-navigator:plan:v1"];
const RECORD_VERSION = 2 as const;
export const INACTIVITY_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type StorageMode = "persistent" | "session";

const StoredRecordSchema = <T extends z.ZodType>(valueSchema: T) =>
  z.object({
    recordVersion: z.literal(RECORD_VERSION),
    savedAt: z.string().datetime(),
    lastAccessedAt: z.string().datetime(),
    value: valueSchema,
  });

function browserStorage(mode = getStorageMode()): Storage | null {
  if (typeof window === "undefined") return null;
  return mode === "session" ? window.sessionStorage : window.localStorage;
}

export function getStorageMode(): StorageMode {
  if (typeof window === "undefined") return "persistent";
  return window.localStorage.getItem(MODE_KEY) === "session" ? "session" : "persistent";
}

export function setStorageMode(mode: StorageMode) {
  if (typeof window === "undefined") return;
  const current = getStorageMode();
  if (current === mode) return;

  const existingCase = loadCase();
  const existingPlan = loadPlan();
  window.localStorage.setItem(MODE_KEY, mode);
  window.localStorage.removeItem(CASE_KEY);
  window.localStorage.removeItem(PLAN_KEY);
  window.sessionStorage.removeItem(CASE_KEY);
  window.sessionStorage.removeItem(PLAN_KEY);
  if (existingCase) saveCase(existingCase);
  if (existingPlan) savePlan(existingPlan);
}

function saveRecord<T>(key: string, value: T) {
  const now = new Date().toISOString();
  browserStorage()?.setItem(key, JSON.stringify({ recordVersion: RECORD_VERSION, savedAt: now, lastAccessedAt: now, value }));
}

function loadRecord<T>(key: string, schema: z.ZodType<T>): T | null {
  const storage = browserStorage();
  const raw = storage?.getItem(key);
  if (!raw || !storage) return null;

  try {
    const record = StoredRecordSchema(schema).parse(JSON.parse(raw));
    const lastAccessed = new Date(record.lastAccessedAt).getTime();
    if (!Number.isFinite(lastAccessed) || Date.now() - lastAccessed > INACTIVITY_TTL_MS) {
      storage.removeItem(key);
      return null;
    }
    storage.setItem(key, JSON.stringify({ ...record, lastAccessedAt: new Date().toISOString() }));
    return record.value;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function saveCase(value: UserCase) {
  saveRecord(CASE_KEY, value);
}

export function loadCase(): UserCase | null {
  return loadRecord(CASE_KEY, UserCaseSchema);
}

export function savePlan(value: FinalNavigationPlan) {
  saveRecord(PLAN_KEY, value);
}

export function loadPlan(): FinalNavigationPlan | null {
  return loadRecord(PLAN_KEY, FinalNavigationPlanSchema);
}

export function saveLiveAiConsent(value: LiveAiConsent) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(LIVE_AI_CONSENT_KEY, JSON.stringify(LiveAiConsentSchema.parse(value)));
}

export function loadLiveAiConsent(): LiveAiConsent | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(LIVE_AI_CONSENT_KEY);
  if (!raw) return null;

  try {
    return LiveAiConsentSchema.parse(JSON.parse(raw));
  } catch {
    window.sessionStorage.removeItem(LIVE_AI_CONSENT_KEY);
    return null;
  }
}

export function clearLiveAiConsent() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LIVE_AI_CONSENT_KEY);
}

export function clearLocalCase() {
  if (typeof window === "undefined") return;
  for (const storage of [window.localStorage, window.sessionStorage]) {
    storage.removeItem(CASE_KEY);
    storage.removeItem(PLAN_KEY);
    for (const key of LEGACY_KEYS) storage.removeItem(key);
  }
  window.sessionStorage.removeItem(LIVE_AI_CONSENT_KEY);
}
