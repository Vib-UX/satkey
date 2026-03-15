import { NextResponse } from "next/server";
import { db, type Challenge } from "@/lib/store";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    const order = db.orders.get(order_id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "ready") {
      return NextResponse.json(
        { error: `Order not ready (status: ${order.status})` },
        { status: 400 }
      );
    }

    if (!order.accessTokenInscriptionId) {
      return NextResponse.json(
        { error: "Inscription ID not yet available" },
        { status: 400 }
      );
    }

    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const timestamp = Date.now();
    const resourceId = `satkey-vps-${order.configId}`;
    const message = `satkey|${resourceId}|${order.accessTokenInscriptionId}|${timestamp}|${nonce}`;

    const challengeId = `ch_${nonce.slice(0, 16)}`;

    const challenge: Challenge = {
      challengeId,
      orderId: order_id,
      resourceId,
      inscriptionId: order.accessTokenInscriptionId,
      timestamp,
      nonce,
      message,
      expiresAt: timestamp + CHALLENGE_TTL_MS,
    };

    db.challenges.set(challengeId, challenge);

    return NextResponse.json({
      challenge_id: challengeId,
      challenge: message,
      expires_at: Math.floor(challenge.expiresAt / 1000),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
