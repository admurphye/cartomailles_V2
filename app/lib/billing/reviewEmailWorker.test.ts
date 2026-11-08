import { Timestamp } from "firebase-admin/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../firebaseAdmin", () => ({ getFirebaseAdminFirestore: mocks.db }));
import { createReviewNotificationStore } from "./reviewNotificationStore";
import { drainReviewNotifications, processReviewNotification, type ReviewEmailTransport } from "./reviewEmailWorker";
import type { ReviewNotificationRecord } from "../firestore/types";
import { createResendReviewEmailTransport } from "./resendReviewEmail";

type Data = Record<string, unknown>;
type Ref = { path: string; filters: [string, string, unknown][]; maximum: number };
let documents: Map<string, Data>;
let failSentCommit: boolean;
const prefix = "stripeEnvironments/test/reviewNotifications/";
const id = "a".repeat(64);
const now = 1_800_000_000_000;
function read(ref: Ref) {
  if (ref.path.includes("/reviewNotifications/")) {
    const data = documents.get(ref.path); return { exists: Boolean(data), data: () => data };
  }
  const comparable = (v: unknown) => v instanceof Timestamp ? v.toMillis() : v;
  return { docs: [...documents.entries()].filter(([path, data]) => path.startsWith(`${ref.path}/`) && ref.filters.every(([field, operator, value]) => {
    const current = comparable(data[field]); const expected = comparable(value);
    return operator === "==" ? current === expected : (current as number) <= (expected as number);
  })).slice(0, ref.maximum).map(([path, data]) => ({ id: path.split("/").at(-1)!, data: () => data })) };
}
function reference(path: string, filters: Ref["filters"] = [], maximum = 100) {
  const ref = { path, filters, maximum };
  return { ...ref, collection: (name: string) => reference(`${path}/${name}`), doc: (key: string) => reference(`${path}/${key}`),
    where: (field: string, operator: string, value: unknown) => reference(path, [...filters, [field, operator, value]], maximum),
    orderBy: () => reference(path, filters, maximum), limit: (limit: number) => reference(path, filters, limit), get: async () => read(ref) };
}
function put(notificationId = id) {
  const record: ReviewNotificationRecord = { notificationId, caseId: "b".repeat(64), sourceType: "subscription", sourceId: "sub_private", codes: ["DISPUTE"],
    detectedAt: Timestamp.fromMillis(now), templateVersion: "v1", status: "pending", attempts: 0, nextAttemptAt: Timestamp.fromMillis(now), leaseId: null, leaseUntil: null,
    firstAttemptAt: null, sender: null, providerId: null, retentionMs: null, sentAt: null, lastErrorCode: null };
  documents.set(`${prefix}${notificationId}`, { ...record, environment: "test", createdAt: Timestamp.fromMillis(now), updatedAt: Timestamp.fromMillis(now) });
}
let provider: ReviewEmailTransport & { send: ReturnType<typeof vi.fn> };
let deliveries: Set<string>;
const fetchMock = vi.fn();
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("REVIEW_EMAIL_ENABLED", "true");
  vi.stubEnv("REVIEW_EMAIL_FROM", "notifications@example.invalid"); vi.stubEnv("STRIPE_ENVIRONMENT", "test");
  vi.stubEnv("RESEND_API_KEY", "re_fake_for_tests"); vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset(); fetchMock.mockRejectedValue(new Error("Unmocked network access forbidden"));
  documents = new Map(); failSentCommit = false; deliveries = new Set();
  let tail = Promise.resolve();
  mocks.db.mockReturnValue({ collection: (name: string) => reference(name), runTransaction: (callback: (tx: unknown) => Promise<unknown>) => {
    const run = tail.then(async () => {
      const writes: { ref: Ref; data: Data }[] = [];
      const result = await callback({ get: async (ref: Ref) => read(ref), set: (ref: Ref, data: Data) => writes.push({ ref, data }) });
      if (failSentCommit && writes.some((w) => w.data.status === "sent")) { failSentCommit = false; throw new Error("private SDK detail"); }
      for (const { ref, data } of writes) documents.set(ref.path, { ...data, updatedAt: Timestamp.now() });
      return result;
    }); tail = run.then(() => undefined, () => undefined); return run;
  } });
  provider = { id: "fake", retentionMs: 24 * 3_600_000, send: vi.fn(async (message: { idempotencyKey: string }) => { deliveries.add(message.idempotencyKey); }) };
  put();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("durable provider-neutral review email worker", () => {
  it("sends once and persists the acknowledgement", async () => {
    expect(await processReviewNotification(id, provider)).toEqual({ status: "sent" });
    expect(documents.get(`${prefix}${id}`)?.status).toBe("sent");
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ to: "contact@cartomailles.com", from: "notifications@example.invalid", idempotencyKey: `cartomailles-review-${id}` }));
    expect(await processReviewNotification(id, provider)).toEqual({ status: "skipped" }); expect(provider.send).toHaveBeenCalledTimes(1);
  });
  it("allows only one concurrent worker to send a given notification", async () => {
    await Promise.all(Array.from({ length: 5 }, () => processReviewNotification(id, provider)));
    expect(provider.send).toHaveBeenCalledTimes(1); expect(deliveries.size).toBe(1);
  });
  it("sends independent notifications concurrently", async () => {
    const second = "c".repeat(64); put(second);
    await Promise.all([processReviewNotification(id, provider), processReviewNotification(second, provider)]);
    expect(provider.send).toHaveBeenCalledTimes(2); expect(deliveries.size).toBe(2);
  });
  it("retries a delivery error after the persisted backoff without storing raw errors", async () => {
    provider.send.mockRejectedValueOnce(new Error("secret provider details"));
    expect(await processReviewNotification(id, provider)).toEqual({ status: "retry_pending" });
    expect(documents.get(`${prefix}${id}`)?.lastErrorCode).toBe("SEND_FAILED");
    expect(JSON.stringify(documents.get(`${prefix}${id}`))).not.toContain("secret provider details");
    await processReviewNotification(id, provider); expect(provider.send).toHaveBeenCalledTimes(1);
    vi.setSystemTime(now + 30_001); await processReviewNotification(id, provider);
    expect(provider.send).toHaveBeenCalledTimes(2); expect(documents.get(`${prefix}${id}`)?.status).toBe("sent");
  });
  it("uses the same provider key after a lost acknowledgement", async () => {
    failSentCommit = true;
    expect(await processReviewNotification(id, provider)).toEqual({ status: "retry_pending" });
    expect(documents.get(`${prefix}${id}`)?.lastErrorCode).toBe("ACK_FAILED");
    vi.setSystemTime(now + 30_001); await processReviewNotification(id, provider);
    expect(provider.send).toHaveBeenCalledTimes(2); expect(deliveries.size).toBe(1);
  });
  it("uses the same provider key after a timeout where delivery actually succeeded", async () => {
    provider.send.mockImplementationOnce(async (message: { idempotencyKey: string }) => { deliveries.add(message.idempotencyKey); throw new Error("response lost"); });
    await processReviewNotification(id, provider); vi.setSystemTime(now + 30_001); await processReviewNotification(id, provider);
    expect(deliveries.size).toBe(1); expect(documents.get(`${prefix}${id}`)?.status).toBe("sent");
  });
  it("recovers an abandoned lease and rejects acknowledgement by its former owner", async () => {
    const store = createReviewNotificationStore("test"); const first = await store.claim(id, "notifications@example.invalid", provider.id, provider.retentionMs);
    vi.setSystemTime(now + 60_001); await processReviewNotification(id, provider);
    expect(await store.sent(id, first!.leaseId)).toBe(false); expect(provider.send).toHaveBeenCalledTimes(1);
  });
  it("blocks uncertain retries after the provider idempotency window", async () => {
    await createReviewNotificationStore("test").claim(id, "notifications@example.invalid", provider.id, provider.retentionMs);
    vi.setSystemTime(now + 24 * 3_600_000); await processReviewNotification(id, provider);
    expect(provider.send).not.toHaveBeenCalled(); expect(documents.get(`${prefix}${id}`)?.status).toBe("blocked");
    expect(documents.get(`${prefix}${id}`)?.lastErrorCode).toBe("DELIVERY_UNCERTAIN");
  });
  it("blocks a provider change during an uncertain delivery and freezes the sender", async () => {
    provider.send.mockRejectedValueOnce(new Error("timeout")); await processReviewNotification(id, provider);
    vi.setSystemTime(now + 30_001); vi.stubEnv("REVIEW_EMAIL_FROM", "new@example.invalid");
    await processReviewNotification(id, provider); expect(provider.send.mock.calls[1][0].from).toBe("notifications@example.invalid");
    put("c".repeat(64)); await createReviewNotificationStore("test").claim("c".repeat(64), "notifications@example.invalid", "old", provider.retentionMs);
    vi.setSystemTime(now + 120_000); await processReviewNotification("c".repeat(64), provider);
    expect(documents.get(`${prefix}${"c".repeat(64)}`)?.lastErrorCode).toBe("PROVIDER_CHANGED");
  });
  it("stays disabled by default without reading Firestore or calling a provider", async () => {
    vi.stubEnv("REVIEW_EMAIL_ENABLED", ""); mocks.db.mockClear();
    expect(await processReviewNotification(id, provider)).toEqual({ status: "disabled" });
    expect(mocks.db).not.toHaveBeenCalled(); expect(provider.send).not.toHaveBeenCalled();
  });
  it("refuses incomplete configuration and a transport without safe idempotency retention", async () => {
    vi.stubEnv("REVIEW_EMAIL_FROM", "invalid\r\nheader"); await expect(processReviewNotification(id, provider)).rejects.toThrow("processing unavailable");
    vi.stubEnv("REVIEW_EMAIL_FROM", "notifications@example.invalid"); provider.retentionMs = 0;
    await expect(processReviewNotification(id, provider)).rejects.toThrow("processing unavailable"); expect(provider.send).not.toHaveBeenCalled();
  });
  it("drains only due notifications from the selected environment", async () => {
    put("c".repeat(64)); documents.get(`${prefix}${"c".repeat(64)}`)!.nextAttemptAt = Timestamp.fromMillis(now + 1000);
    expect(await drainReviewNotifications(provider)).toEqual([{ status: "sent" }]);
    vi.stubEnv("STRIPE_ENVIRONMENT", "live"); expect(await drainReviewNotifications(provider)).toEqual([]);
  });
  it("persists the Resend receipt and prevents concurrent duplicate HTTP calls", async () => {
    vi.stubEnv("REVIEW_EMAIL_FROM", "notifications@cartomailles.com");
    const receipt = "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794";
    fetchMock.mockResolvedValue(Response.json({ id: receipt }));
    const transport = createResendReviewEmailTransport();
    await Promise.all([processReviewNotification(id, transport), processReviewNotification(id, transport)]);
    expect(fetchMock).toHaveBeenCalledOnce(); expect(documents.get(`${prefix}${id}`)?.providerMessageId).toBe(receipt);
  });
  it.each(["concurrent_idempotent_requests", "invalid_idempotent_request"])("handles Resend 409 %s durably", async (name) => {
    vi.stubEnv("REVIEW_EMAIL_FROM", "notifications@cartomailles.com");
    fetchMock.mockResolvedValueOnce(Response.json({ name }, { status: 409 }));
    const transport = createResendReviewEmailTransport();
    const result = await processReviewNotification(id, transport);
    const permanent = name === "invalid_idempotent_request";
    expect(result.status).toBe(permanent ? "blocked" : "retry_pending");
    expect(documents.get(`${prefix}${id}`)?.status).toBe(permanent ? "blocked" : "pending");
    vi.setSystemTime(now + 30_001);
    fetchMock.mockResolvedValue(Response.json({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }));
    await processReviewNotification(id, transport); expect(fetchMock).toHaveBeenCalledTimes(permanent ? 1 : 2);
    if (!permanent) expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]);
  });
  it("respects Resend rate limiting and blocks retries beyond the safe window", async () => {
    vi.stubEnv("REVIEW_EMAIL_FROM", "notifications@cartomailles.com");
    fetchMock.mockResolvedValue(Response.json({ name: "rate_limit_exceeded" }, { status: 429, headers: { "Retry-After": "120" } }));
    await processReviewNotification(id, createResendReviewEmailTransport());
    expect((documents.get(`${prefix}${id}`)!.nextAttemptAt as Timestamp).toMillis()).toBe(now + 120_000);
    vi.setSystemTime(now + 24 * 3_600_000); await processReviewNotification(id, createResendReviewEmailTransport());
    expect(fetchMock).toHaveBeenCalledOnce(); expect(documents.get(`${prefix}${id}`)?.status).toBe("blocked");
  });
  it("rechecks leases and the safe deadline immediately before sending", async () => {
    const store = createReviewNotificationStore("test");
    const first = (await store.claim(id, "notifications@example.invalid", provider.id, provider.retentionMs))!;
    vi.setSystemTime(now + 60_001); expect(await store.preflight(id, first.leaseId, provider.id, provider.retentionMs)).toBeNull();
    const next = (await store.claim(id, "notifications@example.invalid", provider.id, provider.retentionMs))!;
    expect(await store.preflight(id, first.leaseId, provider.id, provider.retentionMs)).toBeNull();
    // Simulate a worker resuming at the end of the safe provider window.
    const entry = documents.get(`${prefix}${id}`)!; entry.firstAttemptAt = Timestamp.fromMillis(now - 24 * 3_600_000 + 65_000);
    expect(await store.preflight(id, next.leaseId, provider.id, provider.retentionMs)).toBeNull();
    expect(documents.get(`${prefix}${id}`)?.lastErrorCode).toBe("DELIVERY_UNCERTAIN"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps Resend entirely offline when notifications are disabled", async () => {
    vi.stubEnv("REVIEW_EMAIL_ENABLED", "false"); mocks.db.mockClear();
    expect(await processReviewNotification(id, createResendReviewEmailTransport())).toEqual({ status: "disabled" });
    expect(await drainReviewNotifications(createResendReviewEmailTransport())).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.db).not.toHaveBeenCalled();
  });
  it("retries a Resend timeout with the identical HTTP payload and idempotency key", async () => {
    vi.stubEnv("REVIEW_EMAIL_FROM", "notifications@cartomailles.com");
    fetchMock.mockRejectedValueOnce(new DOMException("timeout", "TimeoutError"));
    const transport = createResendReviewEmailTransport();
    await processReviewNotification(id, transport); vi.setSystemTime(now + 30_001);
    fetchMock.mockResolvedValue(Response.json({ id: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794" }));
    await processReviewNotification(id, transport);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].body).toBe(fetchMock.mock.calls[1][1].body);
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe(fetchMock.mock.calls[1][1].headers["Idempotency-Key"]);
  });
  it("does not schedule a rate-limit retry outside the Resend retention window", async () => {
    vi.stubEnv("REVIEW_EMAIL_FROM", "notifications@cartomailles.com");
    fetchMock.mockResolvedValue(Response.json({ name: "rate_limit_exceeded" }, { status: 429, headers: { "Retry-After": "86400" } }));
    expect(await processReviewNotification(id, createResendReviewEmailTransport())).toEqual({ status: "blocked" });
    expect(documents.get(`${prefix}${id}`)?.lastErrorCode).toBe("DELIVERY_UNCERTAIN");
  });
  it("stops a batch before reserving more work when the execution budget is low", async () => {
    const second = "c".repeat(64); put(second);
    provider.send.mockImplementation(async () => { vi.setSystemTime(now + 25_000); });
    expect(await drainReviewNotifications(provider, 2, 40_000)).toEqual([{ status: "sent" }]);
    expect(documents.get(`${prefix}${second}`)?.status).toBe("pending");
    expect(documents.get(`${prefix}${second}`)?.attempts).toBe(0);
  });
  it("continues with the next notification after an isolated persistence error", async () => {
    const second = "c".repeat(64); put(second);
    const db = mocks.db(); const original = db.runTransaction;
    db.runTransaction = vi.fn().mockRejectedValueOnce(new Error("private database detail")).mockImplementation(original);
    expect(await drainReviewNotifications(provider, 2, 40_000)).toEqual([{ status: "error" }, { status: "sent" }]);
    expect(documents.get(`${prefix}${id}`)?.status).toBe("pending");
    expect(documents.get(`${prefix}${second}`)?.status).toBe("sent");
  });
  it("deduplicates overlapping cron batches through the existing notification leases", async () => {
    put("c".repeat(64));
    await Promise.all([drainReviewNotifications(provider, 2, 40_000), drainReviewNotifications(provider, 2, 40_000)]);
    expect(provider.send).toHaveBeenCalledTimes(2); expect(deliveries.size).toBe(2);
  });
  it("releases a claimed notification for retry if database work consumes the send budget", async () => {
    const db = mocks.db(); const original = db.runTransaction;
    let first = true;
    db.runTransaction = async (...args: unknown[]) => {
      const result = await original(...args);
      if (first) { first = false; vi.setSystemTime(now + 35_000); }
      return result;
    };
    expect(await drainReviewNotifications(provider, 2, 40_000)).toEqual([{ status: "retry_pending" }]);
    expect(provider.send).not.toHaveBeenCalled(); expect(documents.get(`${prefix}${id}`)?.status).toBe("pending");
  });
});
