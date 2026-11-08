import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { renderReviewEmail } from "./reviewEmail";
import type { ReviewNotificationRecord } from "../firestore/types";

describe("French review notification", () => {
  it("contains actionable diagnostics and a fixed recipient without personal data", () => {
    const message = { notificationId: "a".repeat(64), caseId: "b".repeat(64), templateVersion: "v1", detectedAt: Timestamp.fromMillis(0),
      codes: ["PARTIAL_REFUND", "DISPUTE"], sourceType: "subscription", sourceId: "sub_private" } as ReviewNotificationRecord;
    const email = renderReviewEmail(message, "test");
    expect(email.to).toBe("contact@cartomailles.com");
    expect(email.text).toContain("Remboursement partiel"); expect(email.text).toContain("PARTIAL_REFUND");
    expect(email.text).toContain("1970-01-01T00:00:00.000Z"); expect(email.text).toContain("intervention manuelle est nécessaire");
    expect(email.text).toContain(message.caseId); expect(email.text).not.toContain("sub_private");
  });
});
