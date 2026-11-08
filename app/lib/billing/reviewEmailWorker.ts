import "server-only";
import { createReviewNotificationStore } from "./reviewNotificationStore";
import { renderReviewEmail } from "./reviewEmail";
import type { StripeEnvironment } from "../firestore/types";

/** Future approved provider adapter. It MUST deduplicate the same immutable
 * payload by idempotencyKey for retentionMs, including after ambiguous timeouts,
 * and honor the abort signal. No real adapter is installed in this step. */
export interface ReviewEmailTransport {
  id: string;
  retentionMs: number;
  send(message: { to: "contact@cartomailles.com"; from: string; subject: string; text: string; idempotencyKey: string; signal: AbortSignal }): Promise<void>;
}
function settings(): { environment: StripeEnvironment; from: string } | null {
  if (process.env.REVIEW_EMAIL_ENABLED !== "true") return null;
  const environment = process.env.STRIPE_ENVIRONMENT;
  const from = process.env.REVIEW_EMAIL_FROM;
  if ((environment !== "test" && environment !== "live") || !from ||
      !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(from) || from.length > 254) throw new Error("Review email configuration unavailable.");
  return { environment, from };
}

async function processOne(id: string, transport: ReviewEmailTransport) {
  const config = settings();
  if (!config) return { status: "disabled" as const };
  const store = createReviewNotificationStore(config.environment);
  const claim = await store.claim(id, config.from, transport.id, transport.retentionMs);
  if (!claim) return { status: "skipped" as const };
  let delivered = false;
  try {
    const email = renderReviewEmail(claim.message, config.environment);
    // This external operation is deliberately outside every Firestore transaction.
    await transport.send({ ...email, from: claim.message.sender!, idempotencyKey: `cartomailles-review-${id}`, signal: AbortSignal.timeout(10_000) });
    delivered = true;
    if (!await store.sent(id, claim.leaseId)) throw new Error("Notification acknowledgement unavailable.");
    return { status: "sent" as const };
  } catch {
    try { await store.retry(id, claim.leaseId, delivered ? "ACK_FAILED" : "SEND_FAILED"); }
    catch { throw new Error("Review notification persistence unavailable."); }
    return { status: "retry_pending" as const };
  }
}

export async function processReviewNotification(id: string, transport: ReviewEmailTransport) {
  try { return await processOne(id, transport); }
  catch { throw new Error("Review notification processing unavailable."); }
}

/** Future trusted scheduler entry point. No scheduler or public route is added. */
export async function drainReviewNotifications(transport: ReviewEmailTransport, limit = 20) {
  try {
    const config = settings();
    if (!config) return [];
    const ids = await createReviewNotificationStore(config.environment).ready(limit);
    const results = [];
    for (const id of ids) results.push(await processReviewNotification(id, transport));
    return results;
  } catch { throw new Error("Review notification batch unavailable."); }
}
