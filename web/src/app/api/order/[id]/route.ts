import { NextResponse } from "next/server";
import { db } from "@/lib/store";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const order = db.orders.get(params.id);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    order_id: order.orderId,
    config_id: order.configId,
    config: order.config,
    payment_rail: order.paymentRail,
    payment_txid: order.paymentTxid,
    invoice_id: order.invoiceId,
    inscription_txid: order.inscriptionTxid,
    access_token_inscription_id: order.accessTokenInscriptionId,
    user_ordinals_address: order.userOrdinalsAddress,
    status: order.status,
    vps_id: order.vpsId,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  });
}
