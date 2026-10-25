import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Random local test values; no Stripe account or network calls are used.
const secret = randomUUID();
const stripe = new Stripe(randomUUID());
const payload = JSON.stringify({
  id: "evt_example",
  type: "checkout.session.completed",
  data: {
    object: {
      id: "cs_example",
      customer_details: { email: "customer@example.com" },
      customer: "cus_example",
    },
  },
});

function request(body: string, signature?: string) {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body,
    headers: signature ? { "stripe-signature": signature } : {},
  });
}

function signedRequest(body: string) {
  return request(body, stripe.webhooks.generateTestHeaderString({ payload: body, secret }));
}

describe("Stripe webhook", () => {
  beforeEach(() => {
    vi.stubEnv("STRIPE_SECRET_KEY", randomUUID());
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", secret);
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each(["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"])("fails closed without %s", async (name) => {
    vi.stubEnv(name, "");
    expect((await POST(signedRequest(payload))).status).toBe(500);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("rejects a missing signature", async () => {
    expect((await POST(request(payload))).status).toBe(400);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("rejects a body changed after signing", async () => {
    const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect((await POST(request(payload.replace("cs_example", "cs_changed"), signature))).status).toBe(400);
    expect(console.info).not.toHaveBeenCalled();
  });

  it("logs only the three requested fields for a verified checkout", async () => {
    const response = await POST(signedRequest(payload));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
    expect(console.info).toHaveBeenCalledExactlyOnceWith({
      sessionId: "cs_example",
      customerEmail: "customer@example.com",
      customerId: "cus_example",
    });
  });

  it("acknowledges other signed events without logging", async () => {
    const body = payload.replace("checkout.session.completed", "checkout.session.expired");
    expect((await POST(signedRequest(body))).status).toBe(200);
    expect(console.info).not.toHaveBeenCalled();
  });
});
