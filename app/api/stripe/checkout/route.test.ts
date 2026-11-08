import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ verify: vi.fn(), checkout: vi.fn(), config: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../../../lib/firebaseAdmin", async (original) => ({ ...await original<typeof import("../../../lib/firebaseAdmin")>(), verifyFirebaseIdToken: mocks.verify }));
vi.mock("../../../lib/billing/checkout", () => ({ createSubscriptionCheckout: mocks.checkout, getCheckoutConfig: mocks.config }));
import { FirebaseIdTokenError, FirebaseAuthServiceError } from "../../../lib/firebaseAdmin";
import { CheckoutConflictError } from "../../../lib/billing/checkoutStore";
import { POST } from "./route";

function request(body?: string, authorization = "Bearer test-token", origin = "https://app.example.invalid", query = "") {
  return new Request(`https://app.example.invalid/api/stripe/checkout${query}`, { method: "POST", body, headers: { authorization, origin } });
}
beforeEach(() => {
  vi.resetAllMocks(); mocks.config.mockReturnValue({ appUrl: "https://app.example.invalid" });
  mocks.verify.mockResolvedValue("verified-user"); mocks.checkout.mockResolvedValue("https://checkout.stripe.com/example");
});
describe("POST /api/stripe/checkout", () => {
  it("returns only the checkout URL after verifying the token", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ url: "https://checkout.stripe.com/example" });
    expect(mocks.verify).toHaveBeenCalledWith("test-token"); expect(mocks.checkout).toHaveBeenCalledWith("verified-user");
  });
  it.each(["", "Basic token", "Bearer", "Bearer token extra"])("rejects malformed authentication %s", async (auth) => {
    expect((await POST(request(undefined, auth))).status).toBe(401); expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it.each(['{"uid":"attacker"}', '{"priceId":"price_other"}', '{"customerId":"cus_other"}', '{"environment":"live"}', "bad-json"])("rejects browser-selected parameters: %s", async (body) => {
    expect((await POST(request(body))).status).toBe(400); expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("rejects unexpected URL parameters", async () => {
    expect((await POST(request(undefined, "Bearer token", "https://app.example.invalid", "?uid=other"))).status).toBe(400);
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("rejects a foreign origin", async () => {
    expect((await POST(request(undefined, "Bearer token", "https://evil.example.invalid"))).status).toBe(403);
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it.each([
    [new FirebaseIdTokenError(), 401], [new FirebaseAuthServiceError(), 503],
    [new CheckoutConflictError(), 409], [new Error("private-key-secret"), 503],
  ])("sanitizes authentication and service failures (%s)", async (error, status) => {
    mocks.verify.mockRejectedValue(error);
    const response = await POST(request()); expect(response.status).toBe(status);
    expect(await response.text()).not.toContain("private-key-secret"); expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("sanitizes Stripe and Firestore failures", async () => {
    mocks.checkout.mockRejectedValue(new Error("private-key-secret"));
    const response = await POST(request()); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-key-secret");
  });
});
