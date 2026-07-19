import { NextRequest, NextResponse } from "next/server";
import { formatReviewEmail, getSourcesDueWithin } from "@/lib/knowledge/freshness";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ code: "REMINDER_NOT_CONFIGURED" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ code: "UNAUTHORIZED" }, { status: 401 });
  }

  const due = getSourcesDueWithin(new Date(), 31);
  if (due.length === 0) return NextResponse.json({ sent: false, due: 0, reason: "NOTHING_DUE" });

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.KNOWLEDGE_ALERT_EMAIL;
  const sender = process.env.KNOWLEDGE_ALERT_FROM;
  if (!apiKey || !recipient || !sender) {
    return NextResponse.json({ sent: false, due: due.length, reason: "EMAIL_NOT_CONFIGURED" });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject: `FORA Navigator: ${due.length} sources need review`,
      text: formatReviewEmail(due),
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ sent: false, due: due.length, reason: "EMAIL_PROVIDER_ERROR" }, { status: 502 });
  }
  return NextResponse.json({ sent: true, due: due.length });
}
