import { FirebaseIdTokenError, verifyFirebaseIdToken } from "../../../lib/firebaseAdmin";
import { createSubscriptionCheckout, getCheckoutConfig } from "../../../lib/billing/checkout";
import { CheckoutConflictError } from "../../../lib/billing/checkoutStore";

export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store" };
export async function POST(request: Request) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/i);
  if (!bearer) return Response.json({ error: "Authentication required." }, { status: 401, headers });
  try {
    const { appUrl } = getCheckoutConfig();
    const origin = request.headers.get("origin");
    if (origin && origin !== appUrl) return Response.json({ error: "Forbidden origin." }, { status: 403, headers });
    // There are no client-selected checkout parameters, including UID or price.
    if (new URL(request.url).search) return Response.json({ error: "Unexpected parameters." }, { status: 400, headers });
    const body = await request.text();
    if (body.trim() && body.trim() !== "{}") return Response.json({ error: "Unexpected parameters." }, { status: 400, headers });
    const uid = await verifyFirebaseIdToken(bearer[1]);
    const url = await createSubscriptionCheckout(uid);
    return Response.json({ url }, { headers });
  } catch (error) {
    if (error instanceof FirebaseIdTokenError) return Response.json({ error: "Invalid authentication." }, { status: 401, headers });
    if (error instanceof CheckoutConflictError) return Response.json({ error: "Checkout cannot be resumed safely. Retry or contact support." }, { status: 409, headers });
    return Response.json({ error: "Checkout temporarily unavailable." }, { status: 503, headers });
  }
}
