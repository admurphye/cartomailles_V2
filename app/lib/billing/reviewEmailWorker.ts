import "server-only";
import { createReviewNotificationStore } from "./reviewNotificationStore";
import { renderReviewEmail } from "./reviewEmail";
import type { StripeEnvironment } from "../firestore/types";
import { ReviewEmailDeliveryError } from "./reviewEmailErrors";

/** Future approved provider adapter. It MUST deduplicate the same immutable
 * payload by idempotencyKey for retentionMs, including after ambiguous timeouts,
 * and honor the abort signal. */
export interface ReviewEmailTransport {
  id: string;
  retentionMs: number;
  send(message: { to: "contact@cartomailles.com"; from: string; subject: string; text: string; idempotencyKey: string; signal: AbortSignal; sendBefore: number }): Promise<void | { messageId: string }>;
}
function settings(): { environment: StripeEnvironment; from: string } | null {
  if (process.env.REVIEW_EMAIL_ENABLED !== "true") return null;
  const environment = process.env.STRIPE_ENVIRONMENT;
  const from = process.env.REVIEW_EMAIL_FROM;
  if ((environment !== "test" && environment !== "live") || !from ||
      !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(from) || from.length > 254) throw new Error("Review email configuration unavailable.");
  return { environment, from };
}

async function processOne(id: string, transport: ReviewEmailTransport, deadlineAt = Infinity) {
  const config = settings();
  if (!config) return { status: "disabled" as const };
  if (Date.now() + 15_000 >= deadlineAt) return { status: "skipped" as const };
  const store = createReviewNotificationStore(config.environment);
  const claim = await store.claim(id, config.from, transport.id, transport.retentionMs);
  if (!claim) return { status: "skipped" as const };
  let delivered = false;
  try {
    const email = renderReviewEmail(claim.message, config.environment);
    const leaseDeadline = await store.preflight(id, claim.leaseId, transport.id, transport.retentionMs);
    if (leaseDeadline === null) return { status: "skipped" as const };
    const sendBefore = Math.min(leaseDeadline, deadlineAt - 5000);
    if (Date.now() + 10_000 >= sendBefore) throw new ReviewEmailDeliveryError("SEND_FAILED", false);
    // This external operation is deliberately outside every Firestore transaction.
    const receipt = await transport.send({ ...email, from: claim.message.sender!, idempotencyKey: `cartomailles-review-${id}`, signal: AbortSignal.timeout(10_000), sendBefore });
    delivered = true;
    if (!await store.sent(id, claim.leaseId, receipt?.messageId)) throw new Error("Notification acknowledgement unavailable.");
    return { status: "sent" as const };
  } catch (error) {
    try {
      if (!delivered && error instanceof ReviewEmailDeliveryError && error.permanent) {
        await store.block(id, claim.leaseId, error.code);
        return { status: "blocked" as const };
      }
      const result = await store.retry(id, claim.leaseId, delivered ? "ACK_FAILED" : error instanceof ReviewEmailDeliveryError ? error.code : "SEND_FAILED", error instanceof ReviewEmailDeliveryError ? error.retryAfterMs : 0);
      if (result === "blocked") return { status: "blocked" as const };
      if (result === "skipped") return { status: "skipped" as const };
    }
    catch { throw new Error("Review notification persistence unavailable."); }
    return { status: "retry_pending" as const };
  }
}

export async function processReviewNotification(id: string, transport: ReviewEmailTransport, deadlineAt = Infinity) {
  try { return await processOne(id, transport, deadlineAt); }
  catch { throw new Error("Review notification processing unavailable."); }
}

/** Trusted scheduler entry point. No cron schedule is installed here. */
export async function drainReviewNotifications(transport: ReviewEmailTransport, limit = 20, budgetMs = 40_000) {
  try {
    const config = settings();
    if (!config) return [];
    if (!Number.isSafeInteger(budgetMs) || budgetMs < 20_000 || budgetMs > 45_000) throw new Error("Invalid notification time budget.");
    const deadlineAt = Date.now() + budgetMs;
    const ids = await createReviewNotificationStore(config.environment).ready(limit);
    const results: ({ status: "error" } | Awaited<ReturnType<typeof processReviewNotification>>)[] = [];
    for (const id of ids) {
      // Do not reserve work that cannot start with enough time for sending and ack.
      if (Date.now() + 20_000 >= deadlineAt) break;
      try { results.push(await processReviewNotification(id, transport, deadlineAt)); }
      catch { results.push({ status: "error" }); }
    }
    return results;
  } catch { throw new Error("Review notification batch unavailable."); }
}
