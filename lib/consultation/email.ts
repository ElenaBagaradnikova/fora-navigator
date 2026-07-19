import type {
  ConsultationConsent,
  ConsultationPreview,
} from "@/lib/schemas";

export function consultationEmailSubject(receiptId: string, preview: ConsultationPreview) {
  return `FORA consultation ${receiptId} | ${preview.route} | ${preview.category}`;
}

export function formatConsultationEmail(
  receiptId: string,
  preview: ConsultationPreview,
  consent: ConsultationConsent,
) {
  return [
    "New FORA Navigator consultation request",
    "",
    `Receipt: ${receiptId}`,
    `Route: ${preview.route}`,
    `Category: ${preview.category}`,
    `Region: ${preview.region}, ${preview.country}`,
    `Preferred language: ${preview.preferredLanguage}`,
    `Reply channel: ${preview.contactChannel}`,
    `Reply contact: ${preview.contact}`,
    "",
    "User-edited summary:",
    preview.summary || "(not provided)",
    "",
    `Consent version: ${consent.version}`,
    `Privacy notice version: ${consent.privacyNoticeVersion}`,
    `Accepted at: ${consent.acceptedAt}`,
    "",
    "No full Case, plan, chat history, files, source IDs or analytics identifier is attached.",
    "Operational reminder: delete 90 days after closure or last substantive contact; spam/undelivered requests after 30 days.",
  ].join("\n");
}

export async function sendConsultationEmail(
  receiptId: string,
  preview: ConsultationPreview,
  consent: ConsultationConsent,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONSULTATION_EMAIL_TO;
  const sender = process.env.CONSULTATION_EMAIL_FROM;
  if (!apiKey || !recipient || !sender) return { sent: false as const, reason: "EMAIL_NOT_CONFIGURED" };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: consultationEmailSubject(receiptId, preview),
      text: formatConsultationEmail(receiptId, preview, consent),
    }),
  });

  return response.ok
    ? { sent: true as const }
    : { sent: false as const, reason: "EMAIL_PROVIDER_ERROR" };
}
