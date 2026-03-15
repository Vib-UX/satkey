import { NextResponse } from "next/server";
import { db, type Order, type PaymentRail } from "@/lib/store";
import type { VpsConfig } from "@/lib/types";
import { provisionUser } from "@/lib/provision";

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
      cpu: 2,
      ramGb: 2,
      storageGb: 50,
      region: "us-east",
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
      status: "provisioning",
      vpsId: null,
      sshUser: null,
      sshPassword: null,
      sshHost: null,
      sshPort: null,
      createdAt: now,
      updatedAt: now,
    };

    db.orders.set(orderId, order);

    console.log("[SatKey] Order created, starting provisioning:", {
      orderId,
      txid,
      config: resolvedConfig,
    });

    // Provision immediately
    try {
      const creds = await provisionUser(orderId, resolvedConfig);

      order.sshUser = creds.username;
      order.sshPassword = creds.password;
      order.sshHost = creds.host;
      order.sshPort = creds.port;
      order.status = "ready";
      order.updatedAt = Date.now();
      db.orders.set(orderId, order);

      console.log("[SatKey] Provisioning complete:", {
        orderId,
        username: creds.username,
        host: creds.host,
      });

      return NextResponse.json({
        order_id: orderId,
        status: "ready",
        inscription_txid: txid,
        ssh_user: creds.username,
        ssh_password: creds.password,
        ssh_host: creds.host,
        ssh_port: creds.port,
      });
    } catch (provErr: any) {
      console.error("[SatKey] Provisioning failed:", provErr);

      order.status = "failed";
      order.updatedAt = Date.now();
      db.orders.set(orderId, order);

      return NextResponse.json({
        order_id: orderId,
        status: "failed",
        inscription_txid: txid,
        error: `Provisioning failed: ${provErr.message}`,
      });
    }
  } catch (err) {
    console.error("[SatKey] order-complete error:", err);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
