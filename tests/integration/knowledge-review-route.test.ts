import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/knowledge-review/route";

describe("protected monthly knowledge reminder", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T09:00:00Z"));
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
    delete process.env.KNOWLEDGE_ALERT_EMAIL;
    delete process.env.KNOWLEDGE_ALERT_FROM;
  });

  afterEach(() => vi.useRealTimers());

  it("fails closed when no cron secret is configured", async () => {
    const response = await GET(new NextRequest("http://localhost/api/knowledge-review"));
    expect(response.status).toBe(503);
  });

  it("rejects a request without the matching bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await GET(new NextRequest("http://localhost/api/knowledge-review"));
    expect(response.status).toBe(401);
  });

  it("returns a due report without sending when email is not configured", async () => {
    process.env.CRON_SECRET = "test-secret";
    const response = await GET(new NextRequest("http://localhost/api/knowledge-review", { headers: { authorization: "Bearer test-secret" } }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.sent).toBe(false);
    expect(body.due).toBeGreaterThan(0);
    expect(body.reason).toBe("EMAIL_NOT_CONFIGURED");
  });
});
