import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return Response.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return Response.json({ error: "Missing signature." }, { status: 400 });
  }

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;

  try {
    // Signature verification requires the original, unparsed request body.
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid webhook." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.info({
      sessionId: session.id,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      customerId: typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
    });
  }

  return Response.json({ received: true });
}
