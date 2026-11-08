import "server-only";
import { ReviewEmailDeliveryError } from "./reviewEmailErrors";
import type { ReviewEmailTransport } from "./reviewEmailWorker";

/** No I/O at construction/import; network access is gated again at send time. */
export function createResendReviewEmailTransport(): ReviewEmailTransport {
  return {
    id: "resend-cartomailles-v1", retentionMs: 24 * 60 * 60 * 1000,
    async send(message) {
      if (process.env.REVIEW_EMAIL_ENABLED !== "true") throw new ReviewEmailDeliveryError("PROVIDER_CONFIGURATION", true);
      const key = process.env.RESEND_API_KEY;
      if (!key || !/^re_[A-Za-z0-9_-]+$/.test(key)) throw new ReviewEmailDeliveryError("PROVIDER_CONFIGURATION", true);
      if (message.to !== "contact@cartomailles.com" || message.from !== "notifications@cartomailles.com" ||
          !/^cartomailles-review-[a-f0-9]{64}$/.test(message.idempotencyKey)) throw new ReviewEmailDeliveryError("PROVIDER_REJECTED", true);
      let response: Response;
      try {
        message.signal.throwIfAborted();
        if (!Number.isFinite(message.sendBefore) || Date.now() >= message.sendBefore) throw new ReviewEmailDeliveryError("DELIVERY_UNCERTAIN", true);
        response = await fetch("https://api.resend.com/emails", {
          method: "POST", redirect: "error", cache: "no-store", signal: message.signal,
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": message.idempotencyKey },
          body: JSON.stringify({ from: message.from, to: ["contact@cartomailles.com"], subject: message.subject, text: message.text }),
        });
      } catch (error) {
        if (error instanceof ReviewEmailDeliveryError) throw error;
        throw new ReviewEmailDeliveryError("SEND_FAILED", false);
      }
      let body: unknown;
      try { body = await response.json(); } catch { body = null; }
      const name = body && typeof body === "object" && "name" in body ? body.name : null;
      if (!response.ok) {
        const retryHeader = response.headers.get("retry-after");
        const seconds = retryHeader === null ? NaN : Number(retryHeader);
        const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryHeader ?? "") - Date.now();
        const retryAfter = Number.isFinite(delay) ? Math.max(0, Math.min(24 * 3_600_000, delay)) : 0;
        if (response.status === 409 && name === "concurrent_idempotent_requests") throw new ReviewEmailDeliveryError("CONCURRENT_REQUEST", false, retryAfter);
        if (response.status === 409 && name === "invalid_idempotent_request") throw new ReviewEmailDeliveryError("IDEMPOTENCY_CONFLICT", true);
        if (response.status === 429) throw new ReviewEmailDeliveryError("RATE_LIMIT", false, retryAfter);
        if (response.status === 408 || response.status >= 500) throw new ReviewEmailDeliveryError("SEND_FAILED", false, retryAfter);
        if (response.status === 401 || response.status === 403) throw new ReviewEmailDeliveryError("PROVIDER_CONFIGURATION", true);
        throw new ReviewEmailDeliveryError("PROVIDER_REJECTED", true);
      }
      const id = body && typeof body === "object" && "id" in body ? body.id : null;
      if (typeof id !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) throw new ReviewEmailDeliveryError("SEND_FAILED", false);
      return { messageId: id };
    },
  };
}
