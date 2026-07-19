import type { ConsultationConsent, ConsultationPreview, ConsultationRequest } from "@/lib/schemas";

const routes = new Set(["peer_consultant", "specialist"]);
const categories = new Set([
  "healthcare",
  "disability_recognition",
  "education",
  "social_support",
  "residence_protection",
  "documents",
  "other",
]);
const languages = new Set(["ru", "uk", "en"]);
const channels = new Set(["email", "phone"]);

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

function parsePreview(value: unknown): ConsultationPreview | null {
  if (!plainObject(value) || !exactKeys(value, ["route", "category", "country", "region", "preferredLanguage", "contactChannel", "contact", "summary"])) return null;
  if (
    typeof value.route !== "string" || !routes.has(value.route) ||
    typeof value.category !== "string" || !categories.has(value.category) ||
    value.country !== "ES" || value.region !== "Asturias" ||
    typeof value.preferredLanguage !== "string" || !languages.has(value.preferredLanguage) ||
    typeof value.contactChannel !== "string" || !channels.has(value.contactChannel) ||
    typeof value.contact !== "string" || typeof value.summary !== "string"
  ) return null;

  const contact = value.contact.trim();
  const summary = value.summary.trim();
  if (contact.length < 5 || contact.length > 254 || summary.length > 500) return null;
  if (value.contactChannel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return null;
  if (value.contactChannel === "phone" && !/^\+?[0-9()\s-]{7,24}$/.test(contact)) return null;

  return {
    route: value.route as ConsultationPreview["route"],
    category: value.category as ConsultationPreview["category"],
    country: "ES",
    region: "Asturias",
    preferredLanguage: value.preferredLanguage as ConsultationPreview["preferredLanguage"],
    contactChannel: value.contactChannel as ConsultationPreview["contactChannel"],
    contact,
    summary,
  };
}

export function parseConsultationRequest(
  value: unknown,
  validatedConsent: ConsultationConsent,
): { success: true; data: ConsultationRequest } | { success: false } {
  if (!plainObject(value) || !exactKeys(value, ["preview", "consent", "website"])) return { success: false };
  if (value.consent !== validatedConsent || typeof value.website !== "string" || value.website.length > 200) return { success: false };
  const preview = parsePreview(value.preview);
  if (!preview) return { success: false };
  return { success: true, data: { preview, consent: validatedConsent, website: value.website } };
}
