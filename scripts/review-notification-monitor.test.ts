import { createRequire } from "node:module";
import { describe, expect, it, vi } from "vitest";

const { inspectNotifications, main } = createRequire(import.meta.url)("./review-notification-monitor.cjs");
const now = Date.UTC(2026, 10, 11, 12);
const stamp = (value: number) => ({ toMillis: () => value });
const id = "a".repeat(64);
function record(patch = {}) {
  return { notificationId: id, caseId: "b".repeat(64), environment: "test", codes: ["REVIEW_REQUIRED"],
    status: "pending", attempts: 0, detectedAt: stamp(now - 6 * 3600000), createdAt: stamp(now - 6 * 3600000),
    updatedAt: stamp(now), nextAttemptAt: stamp(now), firstAttemptAt: null, leaseUntil: null, sentAt: null,
    lastErrorCode: null, sender: "private@example.invalid", sourceId: "sub_private", ...patch };
}
const attempted = { attempts: 1, firstAttemptAt: stamp(now - 1000), retentionMs: 86400000 };
async function scan(data = record()) {
  return inspectNotifications({ environment: "test", now, readPage: vi.fn().mockResolvedValue([{ id, data }]) });
}
describe("private read-only notification monitor", () => {
  it("detects old pending at the boundary even with sending disabled; redacts fields", async () => {
    const report = await scan();
    expect(report.complete).toBe(true);
    expect(report.anomalies[0].reasons).toEqual(["PENDING_TOO_LONG"]);
    const json = JSON.stringify(report);
    for (const secret of ["private@example.invalid", "sub_private", "sender", "sourceId"]) expect(json).not.toContain(secret);
    expect(report.anomalies[0].dates.detectedAt).toBe("2026-11-11T06:00:00.000Z");
  });
  it.each(["PROVIDER_REJECTED", "PROVIDER_CONFIGURATION", "IDEMPOTENCY_CONFLICT", "PROVIDER_CHANGED"])("detects permanent %s", async (lastErrorCode) => {
    const report = await scan(record({ ...attempted, status: "blocked", lastErrorCode }));
    expect(report.anomalies[0].reasons).toContain("BLOCKED");
    expect(report.anomalies[0].reasons).toContain("PERMANENT_ERROR");
  });
  it.each(["ACK_FAILED", "SEND_FAILED", "DELIVERY_UNCERTAIN"])("flags potentially ambiguous %s", async (lastErrorCode) => {
    expect((await scan(record({ ...attempted, lastErrorCode }))).anomalies[0].reasons).toContain("DELIVERY_UNCERTAIN");
  });
  it("detects safe-window expiry and retries scheduled beyond it", async () => {
    for (const patch of [{ firstAttemptAt: stamp(now - 86400000) }, { nextAttemptAt: stamp(now + 86400000) }]) {
      expect((await scan(record({ ...attempted, ...patch }))).anomalies[0].reasons).toContain("IDEMPOTENCY_WINDOW_EXHAUSTED");
    }
  });
  it("ignores sent and active leases, flags expired leases", async () => {
    expect((await scan(record({ ...attempted, status: "sent", sentAt: stamp(now) }))).anomalies).toEqual([]);
    expect((await scan(record({ ...attempted, status: "processing", leaseUntil: stamp(now + 1) }))).anomalies).toEqual([]);
    expect((await scan(record({ ...attempted, status: "processing", leaseUntil: stamp(now) }))).anomalies[0].reasons).toContain("LEASE_EXPIRED");
  });
  it("deduplicates pages and reports a bounded scan as incomplete", async () => {
    const docs = Array.from({ length: 100 }, (_, n) => {
      const key = n.toString(16).padStart(64, "0");
      return { id: key, data: record({ notificationId: key }) };
    });
    const readPage = vi.fn().mockResolvedValueOnce(docs).mockResolvedValueOnce([docs[99]]);
    const report = await inspectNotifications({ readPage, environment: "test", now });
    expect(report.scanned).toBe(100);
    expect(report.anomalies).toHaveLength(100);
    expect(readPage).toHaveBeenLastCalledWith(docs[99].id, 100);
    const truncated = await inspectNotifications({ readPage: async () => docs, environment: "test", now, maxPages: 1 });
    expect(truncated.complete).toBe(false);
    expect(truncated.nextCursor).toBe(docs[99].id);
  });
  it("retains partial results on Firestore failure without leaking exception", async () => {
    const docs = Array.from({ length: 100 }, (_, n) => {
      const key = n.toString(16).padStart(64, "0");
      return { id: key, data: record({ notificationId: key }) };
    });
    const readPage = vi.fn().mockResolvedValueOnce(docs).mockRejectedValueOnce(new Error("secret credential"));
    const report = await inspectNotifications({ environment: "test", now, readPage });
    expect(report.complete).toBe(false);
    expect(report.errorCode).toBe("FIRESTORE_SCAN_FAILED");
    expect(report.anomalies).toHaveLength(100);
    expect(JSON.stringify(report)).not.toContain("secret");
  });
  it("reports a complete empty or recently pending queue as healthy", async () => {
    expect((await inspectNotifications({ environment: "test", now, readPage: async () => [] })).complete).toBe(true);
    expect((await scan(record({ detectedAt: stamp(now - 1) }))).anomalies).toEqual([]);
  });
  it("reports invalid records rather than an apparently healthy queue", async () => {
    for (const patch of [{ environment: "live" }, { lastErrorCode: "secret" }, { detectedAt: null }, { codes: ["secret"] }]) {
      const report = await scan(record(patch));
      expect(report.anomalies[0].reasons).toEqual(["INVALID_RECORD"]);
      expect(JSON.stringify(report)).not.toContain("secret");
    }
  });
  it("allows concurrent readers and observes a worker transition without mutating it", async () => {
    const data = record();
    const before = JSON.stringify(data);
    const results = await Promise.all([scan(data), scan(data)]);
    expect(results[0]).toEqual(results[1]);
    expect(JSON.stringify(data)).toBe(before);
    expect((await scan(record({ ...attempted, status: "sent", sentAt: stamp(now) }))).anomalies).toEqual([]);
  });
  it("rejects missing or ambiguous targets before SDK access", async () => {
    await expect(main([])).rejects.toThrow("INVALID_CONFIGURATION");
    await expect(main(["--read-only", "project-test", "production"])).rejects.toThrow("INVALID_CONFIGURATION");
    await expect(inspectNotifications({ environment: "invalid", readPage: vi.fn() })).rejects.toThrow("INVALID_CONFIGURATION");
  });
});
