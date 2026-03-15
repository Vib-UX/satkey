import { NextResponse } from "next/server";
import { db, type Order, type PaymentRail } from "@/lib/store";
import type { VpsConfig } from "@/lib/types";

function generateId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      config_id,
      txid,
      ordinals_address,
      payment_address,
      payment_rail,
      invoice_id,
      config: clientConfig,
    } = body;

    if (!txid || !ordinals_address || !payment_rail) {
      return NextResponse.json(
        { error: "Missing required fields: txid, ordinals_address, payment_rail" },
        { status: 400 }
      );
    }

    const quote = config_id ? db.quotes.get(config_id) : null;

    if (payment_rail === "lightning" && invoice_id) {
      const invoice = db.invoices.get(invoice_id);
      if (invoice && invoice.status !== "settled") {
        return NextResponse.json({ error: "Invoice not settled" }, { status: 400 });
      }
    }

    const resolvedConfig: VpsConfig = quote?.config ?? clientConfig ?? {
      cpu: 0,
      ramGb: 0,
      storageGb: 0,
      region: "unknown",
      stack: "bare",
    };

    const orderId = generateId("ord");
    const now = Date.now();

    const order: Order = {
      orderId,
      configId: config_id ?? "unknown",
      config: resolvedConfig,
      paymentRail: payment_rail as PaymentRail,
      paymentTxid: payment_rail === "onchain" ? txid : null,
      invoiceId: invoice_id ?? null,
      inscriptionTxid: txid,
      accessTokenInscriptionId: null,
      userOrdinalsAddress: ordinals_address,
      userPaymentAddress: payment_address ?? ordinals_address,
      status: "pending_inscription",
      vpsId: null,
      sshUser: null,
      sshHost: null,
      sshPort: null,
      createdAt: now,
      updatedAt: now,
    };

    db.orders.set(orderId, order);

    console.log("[SatKey] Order created:", {
      orderId,
      txid,
      configId: config_id,
      quoteFound: !!quote,
      paymentRail: payment_rail,
    });

    return NextResponse.json({
      order_id: orderId,
      status: order.status,
      inscription_txid: txid,
    });
  } catch (err) {
    console.error("[SatKey] order-complete error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
