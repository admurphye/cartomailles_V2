import { createHash, timingSafeEqual } from "node:crypto";
import { drainReviewNotifications } from "../../../lib/billing/reviewEmailWorker";
import { createResendReviewEmailTransport } from "../../../lib/billing/resendReviewEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const BATCH_LIMIT = 2;
const BUDGET_MS = 40_000;
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  // Exact Bearer scheme and secret, with no trimming, cookie or query fallback.
  // Fixed-size hashes permit constant-time comparison regardless of input length.
  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret) || !authorization || authorization.length > 512 ||
      !timingSafeEqual(createHash("sha256").update(authorization).digest(), createHash("sha256").update(`Bearer ${secret}`).digest())) {
    return Response.json({ error: "Unauthorized." }, { status: 401, headers });
  }
  if (new URL(request.url).search) return Response.json({ error: "Unexpected parameters." }, { status: 400, headers });
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return Response.json({ error: "Production job only." }, { status: 403, headers });
  }
  if (process.env.REVIEW_EMAIL_ENABLED !== "true") {
    return Response.json({ status: "disabled", processed: 0 }, { headers });
  }
  try {
    const results = await drainReviewNotifications(createResendReviewEmailTransport(), BATCH_LIMIT, BUDGET_MS);
    const counts = { sent: 0, retry_pending: 0, blocked: 0, skipped: 0, disabled: 0, error: 0 };
    for (const result of results) counts[result.status]++;
    console.info({ event: "review_notification_cron", processed: results.length, ...counts });
    return Response.json({ status: counts.error ? "partial_failure" : "completed", processed: results.length, counts }, { status: counts.error ? 503 : 200, headers });
  } catch {
    console.error({ event: "review_notification_cron", code: "JOB_FAILED" });
    return Response.json({ error: "Notification job unavailable." }, { status: 503, headers });
  }
}
