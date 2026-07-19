import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getConsultationDeliveryMode } from "@/lib/consultation/config";
import { isConsultationConsentCurrent } from "@/lib/consultation/consent";
import { parseConsultationRequest } from "@/lib/consultation/contract";
import { sendConsultationEmail } from "@/lib/consultation/email";
import { checkConsultationRateLimit } from "@/lib/consultation/rate-limit";
import type { ConsultationReceipt } from "@/lib/schemas";
import { redactSensitiveText } from "@/lib/safety/redact";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 16_000;
const responseHeaders = { "Cache-Control": "no-store, max-age=0" };

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { ...responseHeaders, ...headers },
  });
}

function createReceiptId() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `FORA-${date}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function clientIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

function receipt(value: ConsultationReceipt) {
  return value;
}

export async function GET() {
  const mode = getConsultationDeliveryMode();
  return json({
    mode,
    recipient: "FORA consultation mailbox",
    acceptsRealData: mode === "email",
  });
}

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    return json({ code: "REQUEST_TOO_LARGE", message: "The request is too large." }, 413);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) {
      return json({ code: "REQUEST_TOO_LARGE", message: "The request is too large." }, 413);
    }
    body = JSON.parse(raw) as unknown;
  } catch {
    return json({ code: "INVALID_JSON", message: "The request could not be read." }, 400);
  }

  const consent = (body as { consent?: unknown } | null)?.consent;
  if (!isConsultationConsentCurrent(consent)) {
    return json(
      { code: "CONSENT_REQUIRED", message: "A separate, current consultation consent is required." },
      403,
    );
  }

  const parsed = parseConsultationRequest(body, consent);
  if (!parsed.success) {
    return json(
      {
        code: "INVALID_REQUEST",
        message: "Check the consultation preview fields.",
      },
      400,
    );
  }

  const { preview, website } = parsed.data;

  const mode = getConsultationDeliveryMode();
  if (
    (mode === "demo" && consent.dataKind !== "fictional") ||
    (mode === "email" && consent.dataKind !== "real")
  ) {
    return json(
      {
        code: "DATA_MODE_MISMATCH",
        message: mode === "demo"
          ? "Demo mode accepts fictional contact details only."
          : "Email mode requires explicit consent for real contact details.",
      },
      403,
    );
  }

  const receiptId = createReceiptId();

  // A filled hidden field is treated as an automated submission. Return the same
  // neutral shape as a normal request but do not transmit or retain anything.
  if (website.trim()) {
    return json(receipt({
      status: mode === "email" ? "sent" : "demo",
      receiptId,
      delivered: mode === "email",
      message: "Request accepted.",
    }));
  }

  if (preview.summary && redactSensitiveText(preview.summary).detected.length > 0) {
    return json(
      {
        code: "SUMMARY_CONTAINS_CONTACT_OR_ID",
        message: "Remove contact details and document numbers from the summary.",
      },
      422,
    );
  }

  const limit = checkConsultationRateLimit(clientIdentifier(request));
  if (!limit.allowed) {
    return json(
      { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
      429,
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  if (mode === "demo") {
    return json(receipt({
      status: "demo",
      receiptId,
      delivered: false,
      message: "Demo completed. No email was sent and no request data was stored.",
    }));
  }

  const delivery = await sendConsultationEmail(receiptId, preview, consent);
  if (!delivery.sent) {
    return json(
      { code: "EMAIL_DELIVERY_FAILED", message: "The request could not be delivered. Please try again later." },
      502,
    );
  }

  return json(receipt({
    status: "sent",
    receiptId,
    delivered: true,
    message: "The request was sent to FORA.",
  }));
}
