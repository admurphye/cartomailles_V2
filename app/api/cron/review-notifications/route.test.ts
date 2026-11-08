import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ drain: vi.fn(), adapter: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../../lib/billing/reviewEmailWorker", () => ({ drainReviewNotifications: mocks.drain }));
vi.mock("../../../lib/billing/resendReviewEmail", () => ({ createResendReviewEmailTransport: mocks.adapter }));
import { GET, maxDuration } from "./route";
const secret = "test-cron-secret-abcdefghijklmnopqrstuvwxyz";
const request = (authorization = `Bearer ${secret}`, query = "") => new Request(`https://app.example.invalid/api/cron/review-notifications${query}`, { headers: { authorization } });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("CRON_SECRET", secret); vi.stubEnv("VERCEL_ENV", "production"); vi.stubEnv("REVIEW_EMAIL_ENABLED", "true");
  mocks.adapter.mockReturnValue({ id: "mock-only" }); mocks.drain.mockResolvedValue([{ status: "sent" }, { status: "retry_pending" }]);
  vi.spyOn(console, "info").mockImplementation(() => {}); vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("authenticated notification cron handler", () => {
  it.each(["", "Bearer wrong", `bearer ${secret}`, `Basic ${secret}`, `Bearer ${secret} extra`, `Bearer ${secret}, Bearer ${secret}`])("rejects an unauthorized header: %s", async (header) => {
    expect((await GET(request(header))).status).toBe(401); expect(mocks.drain).not.toHaveBeenCalled(); expect(mocks.adapter).not.toHaveBeenCalled();
  });
  it.each(["", "short", "spaces are forbidden in a cron secret"])("fails closed for missing or invalid secret configuration: %s", async (value) => {
    vi.stubEnv("CRON_SECRET", value); expect((await GET(request())).status).toBe(401); expect(mocks.drain).not.toHaveBeenCalled();
  });
  it("authenticates even when disabled and refuses URL-selected parameters", async () => {
    vi.stubEnv("REVIEW_EMAIL_ENABLED", "false");
    expect((await GET(request(""))).status).toBe(401);
    expect((await GET(request(`Bearer ${secret}`, "?limit=1000"))).status).toBe(400);
  });
  it.each(["", "false", "TRUE"])("returns disabled without instantiating a provider or touching the worker: %s", async (flag) => {
    vi.stubEnv("REVIEW_EMAIL_ENABLED", flag); const response = await GET(request());
    expect(await response.json()).toEqual({ status: "disabled", processed: 0 });
    expect(response.headers.get("cache-control")).toBe("private, no-store"); expect(mocks.adapter).not.toHaveBeenCalled(); expect(mocks.drain).not.toHaveBeenCalled();
  });
  it("uses a fixed two-item batch and a 40-second budget under the 60-second limit", async () => {
    expect(maxDuration).toBe(60); const response = await GET(request()); expect(response.status).toBe(200);
    expect(mocks.drain).toHaveBeenCalledWith({ id: "mock-only" }, 2, 40_000);
    expect(await response.json()).toEqual({ status: "completed", processed: 2, counts: { sent: 1, retry_pending: 1, blocked: 0, skipped: 0, disabled: 0, error: 0 } });
  });
  it("rejects preview invocations", async () => {
    vi.stubEnv("VERCEL_ENV", "preview"); expect((await GET(request())).status).toBe(403); expect(mocks.drain).not.toHaveBeenCalled();
  });
  it("reports sanitized technical and partial failures", async () => {
    mocks.drain.mockRejectedValueOnce(new Error("private credentials")); const response = await GET(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private credentials");
    mocks.drain.mockResolvedValue([{ status: "sent" }, { status: "error" }]); const partial = await GET(request());
    expect(partial.status).toBe(503); expect((await partial.json()).counts.error).toBe(1);
  });
  it("permits overlapping authenticated invocations and delegates leases to the existing worker", async () => {
    const responses = await Promise.all([GET(request()), GET(request())]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]); expect(mocks.drain).toHaveBeenCalledTimes(2);
  });
});
