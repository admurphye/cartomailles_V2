import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createResendReviewEmailTransport } from "./resendReviewEmail";
const fetchMock = vi.fn();
const receipt = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794";
function message() {
  return { to: "contact@cartomailles.com" as const, from: "notifications@cartomailles.com", subject: "Intervention manuelle nécessaire", text: "Dossier à vérifier.",
    idempotencyKey: `cartomailles-review-${"a".repeat(64)}`, signal: new AbortController().signal, sendBefore: Date.now() + 30_000 };
}
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset();
  vi.stubEnv("REVIEW_EMAIL_ENABLED", "true"); vi.stubEnv("RESEND_API_KEY", "re_fake_for_tests");
  fetchMock.mockResolvedValue(Response.json({ id: receipt }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("server-only Resend fetch adapter, with network mocked", () => {
  it("uses the fixed endpoint, stable key, signal and 24h retention without installing a dependency", async () => {
    const adapter = createResendReviewEmailTransport(); const input = message();
    expect(adapter.retentionMs).toBe(86_400_000);
    expect(await adapter.send(input)).toEqual({ messageId: receipt });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails"); expect(options.signal).toBe(input.signal);
    expect(options.redirect).toBe("error"); expect(options.headers["Idempotency-Key"]).toBe(input.idempotencyKey);
    expect(JSON.parse(options.body)).toEqual({ from: "notifications@cartomailles.com", to: ["contact@cartomailles.com"], subject: input.subject, text: input.text });
  });
  it.each(["", "false", "TRUE"])("makes no network request when disabled (%s)", async (enabled) => {
    vi.stubEnv("REVIEW_EMAIL_ENABLED", enabled);
    await expect(createResendReviewEmailTransport().send(message())).rejects.toMatchObject({ permanent: true, code: "PROVIDER_CONFIGURATION" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("constructs lazily even without credentials", () => {
    vi.stubEnv("RESEND_API_KEY", ""); createResendReviewEmailTransport(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("refuses missing credentials, wrong sender or an expired deadline before fetch", async () => {
    vi.stubEnv("RESEND_API_KEY", ""); await expect(createResendReviewEmailTransport().send(message())).rejects.toThrow();
    vi.stubEnv("RESEND_API_KEY", "re_fake_for_tests");
    await expect(createResendReviewEmailTransport().send({ ...message(), from: "other@example.invalid" })).rejects.toMatchObject({ permanent: true });
    await expect(createResendReviewEmailTransport().send({ ...message(), sendBefore: Date.now() - 1 })).rejects.toMatchObject({ permanent: true, code: "DELIVERY_UNCERTAIN" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never fetches with an already aborted signal", async () => {
    const controller = new AbortController(); controller.abort();
    await expect(createResendReviewEmailTransport().send({ ...message(), signal: controller.signal })).rejects.toMatchObject({ permanent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([
    [409, "concurrent_idempotent_requests", false, "CONCURRENT_REQUEST"],
    [409, "invalid_idempotent_request", true, "IDEMPOTENCY_CONFLICT"],
    [409, "unknown_conflict", true, "PROVIDER_REJECTED"],
    [429, "rate_limit_exceeded", false, "RATE_LIMIT"], [500, "application_error", false, "SEND_FAILED"],
    [503, "service_unavailable", false, "SEND_FAILED"], [401, "missing_api_key", true, "PROVIDER_CONFIGURATION"],
    [403, "validation_error", true, "PROVIDER_CONFIGURATION"], [422, "validation_error", true, "PROVIDER_REJECTED"],
    [400, "invalid_idempotency_key", true, "PROVIDER_REJECTED"],
  ])("classifies HTTP %s / %s without exposing the response body", async (status, name, permanent, code) => {
    fetchMock.mockResolvedValue(Response.json({ name, message: "private provider detail" }, { status: status as number }));
    await expect(createResendReviewEmailTransport().send(message())).rejects.toMatchObject({ permanent, code });
    await expect(createResendReviewEmailTransport().send(message())).rejects.not.toThrow("private provider detail");
  });
  it("passes a bounded Retry-After delay to the durable worker", async () => {
    fetchMock.mockResolvedValue(Response.json({ name: "rate_limit_exceeded" }, { status: 429, headers: { "Retry-After": "120" } }));
    await expect(createResendReviewEmailTransport().send(message())).rejects.toMatchObject({ retryAfterMs: 120_000 });
  });
  it.each([new DOMException("timeout", "TimeoutError"), new TypeError("private network detail")])("treats network failures as retryable", async (error) => {
    fetchMock.mockRejectedValue(error);
    await expect(createResendReviewEmailTransport().send(message())).rejects.toMatchObject({ permanent: false, code: "SEND_FAILED" });
  });
  it("does not acknowledge malformed success responses", async () => {
    fetchMock.mockResolvedValue(Response.json({ id: "invalid\r\nsecret" }));
    await expect(createResendReviewEmailTransport().send(message())).rejects.toMatchObject({ permanent: false, code: "SEND_FAILED" });
  });
});
