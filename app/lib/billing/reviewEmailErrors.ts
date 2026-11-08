import "server-only";
export type ReviewDeliveryErrorCode = "SEND_FAILED" | "ACK_FAILED" | "DELIVERY_UNCERTAIN" | "PROVIDER_CHANGED" | "IDEMPOTENCY_CONFLICT" | "PROVIDER_REJECTED" | "PROVIDER_CONFIGURATION" | "RATE_LIMIT" | "CONCURRENT_REQUEST";
export class ReviewEmailDeliveryError extends Error {
  constructor(public readonly code: ReviewDeliveryErrorCode, public readonly permanent: boolean, public readonly retryAfterMs = 0) {
    super(`Review email delivery failed: ${code}`);
  }
}
