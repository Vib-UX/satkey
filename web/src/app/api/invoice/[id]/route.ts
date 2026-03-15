import { NextResponse } from "next/server";
import { db } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const invoice = db.invoices.get(params.id);
  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  if (invoice.status === "pending" && Date.now() > invoice.expiresAt) {
    invoice.status = "expired";
  }

  return NextResponse.json({
    invoice_id: invoice.invoiceId,
    config_id: invoice.configId,
    amount_sats: invoice.amountSats,
    bolt11: invoice.bolt11,
    status: invoice.status,
    expires_at: Math.floor(invoice.expiresAt / 1000),
    settled_at: invoice.settledAt ? Math.floor(invoice.settledAt / 1000) : null,
  });
}
