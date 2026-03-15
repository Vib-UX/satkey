import { NextResponse } from "next/server";
import { db, type Invoice } from "@/lib/store";

function generateId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `${prefix}_${Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

const INVOICE_TTL_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { config_id } = body;

    if (!config_id) {
      return NextResponse.json({ error: "Missing config_id" }, { status: 400 });
    }

    const quote = db.quotes.get(config_id);
    if (!quote) {
      return NextResponse.json({ error: "Quote not found or expired" }, { status: 404 });
    }

    if (Date.now() > quote.validUntil) {
      return NextResponse.json({ error: "Quote expired" }, { status: 410 });
    }

    const invoiceId = generateId("inv");
    const now = Date.now();
    const amountSats = quote.priceSats;

    // In production: call your LN node (LND/CLN/etc.) to generate a real BOLT11 invoice.
    // For now, store the invoice shell — settlement comes from your LN backend webhook.
    const invoice: Invoice = {
      invoiceId,
      configId: config_id,
      amountSats,
      bolt11: `lnbc${amountSats}n1_REPLACE_WITH_REAL_BOLT11`,
      status: "pending",
      createdAt: now,
      expiresAt: now + INVOICE_TTL_MS,
      settledAt: null,
    };

    db.invoices.set(invoiceId, invoice);

    return NextResponse.json({
      invoice_id: invoiceId,
      amount_sats: amountSats,
      bolt11: invoice.bolt11,
      status: invoice.status,
      expires_at: Math.floor(invoice.expiresAt / 1000),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
