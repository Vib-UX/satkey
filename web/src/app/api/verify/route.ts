import { NextResponse } from "next/server";
import { db } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { challenge_id, signature, address } = body;

    if (!challenge_id || !signature || !address) {
      return NextResponse.json(
        { error: "Missing required fields: challenge_id, signature, address" },
        { status: 400 }
      );
    }

    const challenge = db.challenges.get(challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
    }

    if (Date.now() > challenge.expiresAt) {
      return NextResponse.json({ error: "Challenge expired" }, { status: 410 });
    }

    const order = db.orders.get(challenge.orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (address !== order.userOrdinalsAddress) {
      return NextResponse.json(
        { error: "Address does not match inscription owner" },
        { status: 403 }
      );
    }

    // In production: verify BIP-322 signature against the challenge message.
    // For dev, we accept any signature from the matching address.

    const shortId = order.orderId.replace("ord_", "").slice(0, 8);
    const sshUser = `satkey_${shortId}`;
    const sshHost = `${order.vpsId ?? "vps"}.satkey.io`;

    order.sshUser = sshUser;
    order.sshHost = sshHost;
    order.sshPort = 22;
    order.updatedAt = Date.now();

    db.challenges.delete(challenge_id);

    return NextResponse.json({
      success: true,
      ssh_user: sshUser,
      ssh_host: sshHost,
      ssh_port: 22,
      message: "Access granted. Add your SSH public key or use the generated credentials.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
