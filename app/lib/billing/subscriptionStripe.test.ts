import { Timestamp } from "firebase-admin/firestore";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { collectStripePages, createSubscriptionStripe } from "./subscriptionStripe";
import type { StoredRecord } from "../firestore/types";
import type { SubscriptionPolicy } from "./subscriptionPolicy";

const policy: SubscriptionPolicy = { pastDue: "paid_coverage", unpaid: "suspend", canceled: "revoke", pausedCollection: "suspend", refunds: "manual_review", disputes: "manual_review", nonCashInvoices: "exclude_invoice" };
const page = <T,>(items: T[]) => (async function* () { for (const item of items) yield item; })();
const metadata = { firebaseUid: "uid1", orderId: "order1", environment: "test" };
const price = { id: "price_example", livemode: false, type: "recurring", recurring: { usage_type: "licensed" } };
function subscription(overrides: Record<string, unknown> = {}) {
  return { id: "sub_one", livemode: false, customer: "cus_one", metadata, status: "active", pause_collection: null, cancel_at_period_end: false, canceled_at: null, latest_invoice: "in_one",
    items: { has_more: false, data: [{ id: "si_one", price, quantity: 1, current_period_start: 10, current_period_end: 20 }] }, ...overrides } as unknown as Stripe.Subscription;
}
function invoice(overrides: Record<string, unknown> = {}) {
  return { id: "in_one", livemode: false, customer: "cus_one", parent: { type: "subscription_details", subscription_details: { subscription: "sub_one" } },
    status: "paid", currency: "eur", total: 1000, amount_paid: 1000, amount_remaining: 0, pre_payment_credit_notes_amount: 0, post_payment_credit_notes_amount: 0, status_transitions: { paid_at: 10 }, ...overrides };
}
const order = { orderId: "order1", uid: "uid1", sessionId: "cs_one", customerId: "cus_one", subscriptionId: null, status: "pending", paidAt: null, expiresAt: Timestamp.fromMillis(50_000),
  environment: "test", createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.fromMillis(1) } as StoredRecord<"checkoutOrders">;
let api: ReturnType<typeof setup>;
function setup() {
  return {
    events: { retrieve: vi.fn() }, customers: { retrieve: vi.fn().mockResolvedValue({ id: "cus_one", livemode: false, metadata: { firebaseUid: "uid1", environment: "test" } }) },
    subscriptions: { retrieve: vi.fn().mockResolvedValue(subscription()), list: vi.fn(() => page([subscription()])) },
    checkout: { sessions: { retrieve: vi.fn().mockResolvedValue({ id: "cs_one", livemode: false, mode: "subscription", status: "complete", customer: "cus_one", subscription: "sub_one", client_reference_id: "order1", metadata,
      line_items: { has_more: false, data: [{ price: { id: "price_example" }, quantity: 1 }] } }) } },
    invoices: { list: vi.fn(() => page([invoice()])), retrieve: vi.fn().mockResolvedValue(invoice()),
      listLineItems: vi.fn(() => page([{ id: "il_one", invoice: "in_one", livemode: false, amount: 1000, currency: "eur", quantity: 1,
        parent: { type: "subscription_item_details", subscription_item_details: { subscription: "sub_one", subscription_item: "si_one", proration: false } },
        pricing: { price_details: { price: "price_example" } }, period: { start: 10, end: 20 } }])) },
    invoicePayments: { list: vi.fn(() => page([{ id: "inpay_one", invoice: "in_one", livemode: false, currency: "eur", status: "paid", amount_paid: 1000, payment: { type: "payment_intent", payment_intent: "pi_one" } }])) },
    paymentIntents: { retrieve: vi.fn().mockResolvedValue({ id: "pi_one", customer: "cus_one", livemode: false, currency: "eur", status: "succeeded", amount_received: 1000, latest_charge: "ch_one" }) },
    charges: { retrieve: vi.fn().mockResolvedValue({ id: "ch_one", customer: "cus_one", payment_intent: "pi_one", livemode: false, currency: "eur", paid: true, captured: true, status: "succeeded", amount_captured: 1000, amount_refunded: 0, refunded: false, disputed: false }) },
    refunds: { list: vi.fn(() => page([] as unknown[])), retrieve: vi.fn() }, disputes: { retrieve: vi.fn() },
  };
}
const gateway = () => createSubscriptionStripe(api as unknown as Stripe, "test", "price_example");
const read = (sub = subscription(), choices = policy) => gateway().snapshot(sub, "uid1", order, choices);
beforeEach(() => { api = setup(); });

describe("current Stripe subscription and cash payment verification", () => {
  it("uses paid invoice lines as period evidence, not checkout completion", async () => {
    const snapshot = await read();
    expect(snapshot.periods).toEqual([{ start: 10_000, end: 20_000 }]); expect(snapshot.record.paidThrough?.toMillis()).toBe(20_000);
    expect(api.paymentIntents.retrieve).toHaveBeenCalledWith("pi_one"); expect(api.charges.retrieve).toHaveBeenCalledWith("ch_one");
    api.invoices.list.mockImplementation(() => page([]));
    expect((await read()).periods).toEqual([]);
  });
  it.each([
    { metadata: { ...metadata, firebaseUid: "other" } }, { metadata: { ...metadata, orderId: "other" } },
    { customer: "cus_other" }, { livemode: true }, { items: { has_more: true, data: [] } },
  ])("rejects conflicting subscription data: %j", async (override) => {
    await expect(read(subscription(override))).rejects.toThrow();
  });
  it.each([{ customer: "cus_other" }, { subscription: "sub_other" }, { client_reference_id: "other" }, { livemode: true }, { status: "open" }, { metadata: { ...metadata, environment: "live" } }])("rejects conflicting checkout proof: %j", async (override) => {
    const current = await api.checkout.sessions.retrieve(); api.checkout.sessions.retrieve.mockResolvedValue({ ...current, ...override });
    await expect(read()).rejects.toThrow();
  });
  it("requires the exact recorded session and does not use an email", async () => {
    await expect(gateway().snapshot(subscription(), "uid1", { ...order, sessionId: null }, policy)).rejects.toThrow();
    expect(api.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });
  it.each([{ amount_paid: 0, total: 0 }, { amount_paid: 500 }, { post_payment_credit_notes_amount: 100 }])("does not infer cash payment for %j", async (override) => {
    api.invoices.retrieve.mockResolvedValue(invoice(override)); expect((await read()).periods).toEqual([]);
  });
  it("requires manual review of non-cash settlement when selected", async () => {
    api.invoicePayments.list.mockImplementation(() => page([]));
    expect((await read()).reviews).toEqual([{ invoiceId: "in_one", code: "PAYMENT_UNCONFIRMED" }]);
  });
  it.each(["requires_action", "processing", "canceled"])("never grants for PaymentIntent %s", async (status) => {
    const intent = await api.paymentIntents.retrieve(); api.paymentIntents.retrieve.mockResolvedValue({ ...intent, status });
    expect((await read()).periods).toEqual([]);
  });
  it("does not accept merely marked-paid invoices without successful cash payments", async () => {
    api.invoicePayments.list.mockImplementation(() => page([])); expect((await read()).periods).toEqual([]);
  });
  it.each([{ captured: false }, { paid: false }, { amount_captured: 100 }])("rejects unconfirmed charge coverage %j", async (override) => {
    const charge = await api.charges.retrieve(); api.charges.retrieve.mockResolvedValue({ ...charge, ...override });
    expect((await read()).periods).toEqual([]);
  });
  it.each([{ livemode: true }, { customer: "cus_other" }, { currency: "usd" }])("rejects charge association/environment conflicts %j", async (override) => {
    const charge = await api.charges.retrieve(); api.charges.retrieve.mockResolvedValue({ ...charge, ...override }); await expect(read()).rejects.toThrow();
  });
  it("requires an explicit refund decision, including partial refunds", async () => {
    const charge = await api.charges.retrieve(); api.charges.retrieve.mockResolvedValue({ ...charge, amount_refunded: 1 });
    api.refunds.list.mockImplementation(() => page([{ id: "re_partial", charge: "ch_one", status: "succeeded", amount: 1, currency: "eur" }]));
    const result = await read();
    expect(result.periods).toEqual([]); expect(result.reviews).toEqual([{ invoiceId: "in_one", code: "PARTIAL_REFUND" }]);
  });
  it("checks the charge actually belongs to the confirmed PaymentIntent", async () => {
    const charge = await api.charges.retrieve(); api.charges.retrieve.mockResolvedValue({ ...charge, payment_intent: "pi_other" });
    await expect(read()).rejects.toThrow("ASSOCIATION_CONFLICT");
  });
  it("excludes an entire prorated invoice instead of retaining its positive line", async () => {
    const lines = await collectStripePages(api.invoices.listLineItems());
    const credit = { ...lines[0], id: "il_credit", amount: -100, parent: { ...lines[0].parent, subscription_item_details: { ...lines[0].parent.subscription_item_details, proration: true } } };
    api.invoices.listLineItems.mockImplementation(() => page([lines[0], credit]));
    expect((await read()).periods).toEqual([]);
    expect((await read()).reviews).toEqual([{ invoiceId: "in_one", code: "PRORATION" }]);
  });
  it("uses the real renewal line period instead of the subscription current period", async () => {
    const lines = await collectStripePages(api.invoices.listLineItems());
    api.invoices.listLineItems.mockImplementation(() => page([{ ...lines[0], period: { start: 20, end: 30 } }]));
    const result = await read();
    expect(result.periods).toEqual([{ start: 20_000, end: 30_000 }]); expect(result.record.currentPeriodEnd.toMillis()).toBe(20_000);
  });
  it("detects pending refunds as well as succeeded ones", async () => {
    api.refunds.list.mockImplementation(() => page([{ id: "re_one", charge: "ch_one", status: "pending" }]));
    expect((await read()).reviews).toEqual([{ invoiceId: "in_one", code: "REFUND_PENDING" }]);
  });
  it("removes coverage only for a fully confirmed refund, including an accompanying credit note", async () => {
    const charge = await api.charges.retrieve();
    api.charges.retrieve.mockResolvedValue({ ...charge, amount_refunded: 1000, refunded: true });
    api.refunds.list.mockImplementation(() => page([{ id: "re_full", charge: "ch_one", status: "succeeded", amount: 1000, currency: "eur" }]));
    api.invoices.retrieve.mockResolvedValue(invoice({ post_payment_credit_notes_amount: 1000 }));
    const result = await read();
    expect(result.refundedInvoices).toEqual(["in_one"]); expect(result.reviews).toEqual([]); expect(result.periods).toEqual([]);
  });
  it("does not treat an incomplete refund history as proof of a total refund", async () => {
    const charge = await api.charges.retrieve(); api.charges.retrieve.mockResolvedValue({ ...charge, amount_refunded: 1000, refunded: true });
    const result = await read(); expect(result.refundedInvoices).toEqual([]);
    expect(result.reviews).toEqual([{ invoiceId: "in_one", code: "REFUND_AMBIGUOUS" }]);
  });
  it("removes an unambiguously fully refunded period even if the same payment also has a dispute to review", async () => {
    const charge = await api.charges.retrieve();
    api.charges.retrieve.mockResolvedValue({ ...charge, amount_refunded: 1000, refunded: true, disputed: true });
    api.refunds.list.mockImplementation(() => page([{ id: "re_full", charge: "ch_one", status: "succeeded", amount: 1000, currency: "eur" }]));
    const result = await read(); expect(result.refundedInvoices).toEqual(["in_one"]);
    expect(result.reviews).toEqual([{ invoiceId: "in_one", code: "DISPUTE" }]); expect(result.periods).toEqual([]);
  });
  it("does not revoke for a failed refund", async () => {
    api.refunds.list.mockImplementation(() => page([{ id: "re_failed", charge: "ch_one", status: "failed", amount: 1000, currency: "eur" }]));
    expect((await read()).periods).toEqual([{ start: 10_000, end: 20_000 }]);
  });
  it.each(["full", "partial"])("keeps another confirmed invoice when the first has a %s refund", async (kind) => {
    api.invoices.list.mockImplementation(() => page([invoice(), invoice({ id: "in_two" })]));
    api.invoices.retrieve.mockResolvedValueOnce(invoice()).mockResolvedValueOnce(invoice({ id: "in_two", status_transitions: { paid_at: 20 } }));
    const payment = { livemode: false, currency: "eur", status: "paid", amount_paid: 1000 };
    api.invoicePayments.list.mockImplementationOnce(() => page([{ ...payment, id: "inpay_one", invoice: "in_one", payment: { type: "payment_intent", payment_intent: "pi_one" } }]))
      .mockImplementationOnce(() => page([{ ...payment, id: "inpay_two", invoice: "in_two", payment: { type: "payment_intent", payment_intent: "pi_two" } }]));
    const intent = await api.paymentIntents.retrieve();
    api.paymentIntents.retrieve.mockResolvedValueOnce(intent).mockResolvedValueOnce({ ...intent, id: "pi_two", latest_charge: "ch_two" });
    const charge = await api.charges.retrieve();
    api.charges.retrieve.mockResolvedValueOnce({ ...charge, amount_refunded: kind === "full" ? 1000 : 100, refunded: kind === "full" })
      .mockResolvedValueOnce({ ...charge, id: "ch_two", payment_intent: "pi_two" });
    api.refunds.list.mockImplementationOnce(() => page([{ id: "re_one", charge: "ch_one", status: "succeeded", amount: kind === "full" ? 1000 : 100, currency: "eur" }]))
      .mockImplementationOnce(() => page([]));
    const [line] = await collectStripePages(api.invoices.listLineItems());
    api.invoices.listLineItems.mockImplementation(() => page([{ ...line, invoice: "in_two", period: { start: 20, end: 30 } }]));
    const result = await read();
    expect(result.evidence).toEqual([{ invoiceId: "in_two", start: 20_000, end: 30_000 }]);
    expect(result.refundedInvoices).toEqual(kind === "full" ? ["in_one"] : []);
    expect(result.reviews).toEqual(kind === "full" ? [] : [{ invoiceId: "in_one", code: "PARTIAL_REFUND" }]);
  });
  it("rechecks previously confirmed invoices missing from the paid list and requests review", async () => {
    api.invoices.list.mockImplementation(() => page([])); api.invoices.retrieve.mockResolvedValue(invoice({ status: "void" }));
    const result = await gateway().snapshot(subscription(), "uid1", order, policy, ["in_one"]);
    expect(result.reviews).toEqual([{ invoiceId: "in_one", code: "PAYMENT_UNCONFIRMED" }]); expect(result.periods).toEqual([]);
  });
  it("requires an explicit dispute decision", async () => {
    const charge = await api.charges.retrieve(); api.charges.retrieve.mockResolvedValue({ ...charge, disputed: true });
    const result = await read();
    expect(result.periods).toEqual([]); expect(result.reviews).toEqual([{ invoiceId: "in_one", code: "DISPUTE" }]);
  });
  it("refuses stale Stripe snapshots during a payment-history scan", async () => {
    api.subscriptions.retrieve.mockResolvedValue(subscription({ status: "canceled" })); await expect(read()).rejects.toThrow("STALE_SYNC");
  });
  it("enumerates every page and fails rather than silently truncating evidence", async () => {
    expect(await collectStripePages(page([1, 2, 3]))).toEqual([1, 2, 3]);
    await expect(collectStripePages(page([1, 2, 3]), 2)).rejects.toThrow("LIMIT_EXCEEDED");
  });
  it("rejects test/live and Connect event confusion", async () => {
    api.events.retrieve.mockResolvedValue({ id: "evt_one", livemode: true }); await expect(gateway().event("evt_one")).rejects.toThrow();
    api.events.retrieve.mockResolvedValue({ id: "evt_one", livemode: false, account: "acct_other" }); await expect(gateway().event("evt_one")).rejects.toThrow();
  });
});
