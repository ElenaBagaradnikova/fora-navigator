export const NAVIGATION_PIPELINE_VERSION = "3.0" as const;

export const NAVIGATION_PIPELINE_STAGES = [
  "consent_and_feature_gate",
  "redaction_and_safety",
  "official_knowledge_grounding",
  "structured_generation",
  "schema_validation",
  "evidence_and_dependency_audit",
  "safe_delivery_or_local_fallback",
] as const;

export type NavigationPipelineStage = (typeof NAVIGATION_PIPELINE_STAGES)[number];
