export type ConsultationDeliveryMode = "demo" | "email";

export function getConsultationDeliveryMode(): ConsultationDeliveryMode {
  const emailReady =
    process.env.ENABLE_CONSULTATION_HANDOFF === "true" &&
    Boolean(process.env.RESEND_API_KEY) &&
    Boolean(process.env.CONSULTATION_EMAIL_TO) &&
    Boolean(process.env.CONSULTATION_EMAIL_FROM);
  return emailReady ? "email" : "demo";
}
