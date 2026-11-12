import { checkCartomaillesAccess } from "../../../lib/billing/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };

/** Own rights only: no browser-selected UID, environment or entitlement. */
export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization && authorization.length <= 8192 ? authorization.match(/^Bearer ([^\s]+)$/i) : null;
  if (!bearer) return Response.json({ authorized: false, status: "unauthenticated" }, { status: 401, headers });
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return Response.json({ authorized: false, status: "forbidden" }, { status: 403, headers });
  if (url.search) return Response.json({ authorized: false, status: "invalid_request" }, { status: 400, headers });
  try {
    const result = await checkCartomaillesAccess(bearer[1]);
    if (result.authorized) return Response.json({ authorized: true, validUntil: result.validUntil.toMillis() }, { headers });
    if (result.kind === "unauthenticated") return Response.json({ authorized: false, status: "unauthenticated" }, { status: 401, headers });
    if (result.kind === "denied") return Response.json({ authorized: false, status: "subscription_required" }, { status: 403, headers });
  } catch { /* Never expose tokens, internal references or SDK error text. */ }
  return Response.json({ authorized: false, status: "unavailable" }, { status: 503, headers });
}
