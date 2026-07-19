import { z } from "zod";
import {
  CONSULTATION_CONSENT_VERSION,
  CONSULTATION_PRIVACY_VERSION,
} from "@/lib/consultation/consent";

export { CONSULTATION_CONSENT_VERSION, CONSULTATION_PRIVACY_VERSION };

export const AppLocaleSchema = z.enum(["ru", "uk", "en"]);

export const ImmigrationStatusSchema = z.enum([
  "eu_eea_swiss",
  "residence_or_visa",
  "asylum_applicant",
  "international_protection",
  "temporary_protection",
  "no_current_authorization",
  "unknown",
]);

export const NeedCategorySchema = z.enum([
  "healthcare",
  "disability_recognition",
  "education",
  "social",
  "documents",
  "language",
]);

export const NeedSchema = z.object({
  category: NeedCategorySchema,
  priority: z.enum(["urgent", "high", "normal"]),
  detail: z.string().min(3).max(500),
});

export const HouseholdMemberSchema = z.object({
  id: z.string().min(1).max(120),
  role: z.enum(["child", "young_adult", "caregiver"]),
  ageRange: z.enum(["0-5", "6-11", "12-17", "18-25", "adult"]),
  supportNeeds: z.array(z.string().min(2).max(120)).max(8),
});

export const UrgencyAssessmentSchema = z.object({
  level: z.enum(["emergency", "urgent", "standard"]),
  signals: z.array(z.string().max(240)).max(10),
  stopNormalFlow: z.boolean(),
  message: z.string().min(3).max(800),
});

export const UserCaseSchema = z.object({
  id: z.string().min(1).max(120),
  locale: AppLocaleSchema,
  country: z.literal("ES"),
  region: z.literal("Asturias"),
  municipality: z.string().min(2).max(100),
  narrative: z.string().trim().min(20, "Опишите ситуацию хотя бы в 20 символах").max(4000),
  household: z.array(HouseholdMemberSchema).min(1).max(6),
  immigrationStatus: ImmigrationStatusSchema,
  healthcareCoverage: z.enum(["yes", "no", "unknown"]),
  registeredAtAddress: z.enum(["yes", "no", "unknown"]),
  diagnosticDocuments: z.enum(["originals", "copies", "none", "unknown"]),
  spanishLevel: z.enum(["none", "basic", "conversational"]),
  mainProblem: z.string().min(3).max(800),
  needs: z.array(NeedSchema).min(1).max(8),
  urgency: UrgencyAssessmentSchema,
});

export const LIVE_AI_CONSENT_VERSION = "2026-07-19.v1" as const;

export const LiveAiConsentSchema = z.object({
  version: z.literal(LIVE_AI_CONSENT_VERSION),
  decision: z.literal("accepted"),
  dataKind: z.literal("fictional"),
  caseId: z.string().min(1).max(120),
  acceptedAt: z.string().datetime(),
}).strict();

export const NavigationRequestSchema = z.object({
  userCase: UserCaseSchema,
  consent: LiveAiConsentSchema,
}).strict();

export const ConsultationPreviewSchema = z.object({
  route: z.enum(["peer_consultant", "specialist"]),
  category: z.enum([
    "healthcare",
    "disability_recognition",
    "education",
    "social_support",
    "residence_protection",
    "documents",
    "other",
  ]),
  country: z.literal("ES"),
  region: z.literal("Asturias"),
  preferredLanguage: AppLocaleSchema,
  contactChannel: z.enum(["email", "phone"]),
  contact: z.string().trim().min(5).max(254),
  summary: z.string().trim().max(500),
}).strict().superRefine((value, context) => {
  if (value.contactChannel === "email" && !z.string().email().safeParse(value.contact).success) {
    context.addIssue({ code: "custom", path: ["contact"], message: "Введите корректный email." });
  }
  if (value.contactChannel === "phone" && !/^\+?[0-9()\s-]{7,24}$/.test(value.contact)) {
    context.addIssue({ code: "custom", path: ["contact"], message: "Введите корректный телефон." });
  }
});

export const ConsultationConsentSchema = z.object({
  version: z.literal(CONSULTATION_CONSENT_VERSION),
  privacyNoticeVersion: z.literal(CONSULTATION_PRIVACY_VERSION),
  decision: z.literal("accepted"),
  dataKind: z.enum(["fictional", "real"]),
  confirmedAdult: z.literal(true),
  authorizedToShare: z.literal(true),
  acceptedAt: z.string().datetime(),
}).strict();

export const ConsultationRequestSchema = z.object({
  preview: ConsultationPreviewSchema,
  consent: ConsultationConsentSchema,
  website: z.string().max(200),
}).strict();

export const ConsultationReceiptSchema = z.object({
  status: z.enum(["sent", "demo"]),
  receiptId: z.string().min(8).max(80),
  delivered: z.boolean(),
  message: z.string().min(3).max(500),
});

export const ClarifyingQuestionSchema = z.object({
  id: z.string().min(1).max(120),
  field: z.string().min(1).max(120),
  prompt: z.string().min(3).max(300),
  reason: z.string().min(3).max(400),
  kind: z.enum(["single", "multi", "text"]),
  options: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
        help: z.string().max(240).optional(),
      }),
    )
    .optional(),
  required: z.boolean(),
});

export const SourceReferenceSchema = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(3).max(240),
  url: z.string().url(),
  sourceType: z.enum(["official", "fora", "model", "specialist"]),
  jurisdiction: z.enum(["Spain", "Asturias", "Oviedo", "FORA"]),
  lastVerifiedDate: z.string().date(),
  nextReviewDate: z.string().date(),
  verificationMethod: z.enum(["manual_official_page", "automated_link_check", "fora_content_review"]),
  contentOwner: z.enum(["fora", "official_authority"]),
});

export const VerificationStatusSchema = z.object({
  confidence: z.enum(["high", "medium", "low"]),
  needsHumanVerification: z.boolean(),
  caveat: z.string().max(600).optional(),
  sourceIds: z.array(z.string().min(1).max(120)).max(8),
});

export const RequiredDocumentSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(2).max(240),
  status: z.enum(["available", "obtain", "translate_recommended", "verify", "apostille_maybe"]),
  appliesTo: z.array(z.string().min(1).max(120)).min(1).max(12),
  note: z.string().min(3).max(600),
  verification: VerificationStatusSchema,
});

export const ActionStepSchema = z.object({
  id: z.string().min(1).max(120),
  timeframe: z.enum(["now", "seven_days", "month", "later"]),
  priority: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  title: z.string().min(3).max(160),
  action: z.string().min(10).max(1200),
  why: z.string().min(10).max(800),
  destination: z.string().min(3).max(500),
  owner: z.enum(["family", "fora", "authority", "specialist"]),
  documentIds: z.array(z.string().min(1).max(120)).max(20),
  dependsOnActionIds: z.array(z.string().min(1).max(120)).max(12),
  expectedResult: z.string().min(5).max(700),
  failureModes: z.array(z.string().min(3).max(400)).min(1).max(8),
  channel: z.enum(["online", "in_person", "both", "verify"]),
  verification: VerificationStatusSchema,
});

export const DraftDocumentSchema = z.object({
  id: z.string().min(1).max(120),
  kind: z.enum(["social_service", "healthcare", "school", "appointment", "case_summary"]),
  title: z.string().min(3).max(180),
  recipient: z.string().min(2).max(200),
  subjectRu: z.string().min(3).max(240),
  subjectUk: z.string().min(3).max(240),
  subjectEn: z.string().min(3).max(240),
  subjectEs: z.string().min(3).max(240),
  bodyRu: z.string().min(30).max(5000),
  bodyUk: z.string().min(30).max(5000),
  bodyEn: z.string().min(30).max(5000),
  bodyEs: z.string().min(30).max(5000),
  placeholders: z.array(z.string().max(120)).max(20),
  requiresUserReview: z.literal(true),
});

export const ModelNavigationPlanSchema = z.object({
  schemaVersion: z.literal("2.0"),
  locale: AppLocaleSchema,
  caseSummary: z.string().min(20).max(1800),
  urgency: UrgencyAssessmentSchema,
  missingInformation: z.array(ClarifyingQuestionSchema).max(8),
  immediateFocus: z.array(z.string().min(3).max(240)).min(1).max(3),
  actions: z.array(ActionStepSchema).min(3).max(12),
  documents: z.array(RequiredDocumentSchema).min(3).max(24),
  drafts: z.array(DraftDocumentSchema).min(1).max(8),
  sources: z.array(SourceReferenceSchema).min(1).max(20),
  safetyNotes: z.array(z.string().min(3).max(500)).min(1).max(12),
});

export const FinalNavigationPlanSchema = ModelNavigationPlanSchema.extend({
  generatedAt: z.string().datetime(),
  mode: z.enum(["live", "demo"]),
});

export type Need = z.infer<typeof NeedSchema>;
export type AppLocale = z.infer<typeof AppLocaleSchema>;
export type ImmigrationStatus = z.infer<typeof ImmigrationStatusSchema>;
export type HouseholdMember = z.infer<typeof HouseholdMemberSchema>;
export type UrgencyAssessment = z.infer<typeof UrgencyAssessmentSchema>;
export type UserCase = z.infer<typeof UserCaseSchema>;
export type LiveAiConsent = z.infer<typeof LiveAiConsentSchema>;
export type NavigationRequest = z.infer<typeof NavigationRequestSchema>;
export type ConsultationPreview = z.infer<typeof ConsultationPreviewSchema>;
export type ConsultationConsent = z.infer<typeof ConsultationConsentSchema>;
export type ConsultationRequest = z.infer<typeof ConsultationRequestSchema>;
export type ConsultationReceipt = z.infer<typeof ConsultationReceiptSchema>;
export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;
export type SourceReference = z.infer<typeof SourceReferenceSchema>;
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;
export type RequiredDocument = z.infer<typeof RequiredDocumentSchema>;
export type ActionStep = z.infer<typeof ActionStepSchema>;
export type DraftDocument = z.infer<typeof DraftDocumentSchema>;
export type ModelNavigationPlan = z.infer<typeof ModelNavigationPlanSchema>;
export type FinalNavigationPlan = z.infer<typeof FinalNavigationPlanSchema>;

export const preliminaryCaveat =
  "Это предварительная рекомендация. Перед действием необходимо проверить её в соответствующем органе.";

export const preliminaryCaveats: Record<AppLocale, string> = {
  ru: preliminaryCaveat,
  uk: "Це попередня рекомендація. Перед дією її потрібно перевірити у відповідному органі.",
  en: "This is preliminary guidance. Check it with the relevant authority before acting.",
};

export function getPreliminaryCaveat(locale: AppLocale) {
  return preliminaryCaveats[locale];
}
