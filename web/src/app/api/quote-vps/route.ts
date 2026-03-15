import { NextResponse } from "next/server";
import { estimateMonthlyPriceSats, satsToBtc } from "@/lib/pricing";
import { db, type Quote } from "@/lib/store";
import type { VpsConfig } from "@/lib/types";

function generateId(prefix: string): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${prefix}_${hex}`;
}

const PLATFORM_FEE_SATS = 200;
const QUOTE_TTL_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config: VpsConfig = {
      cpu: Number(body.cpu),
      ramGb: Number(body.ramGb),
      storageGb: Number(body.storageGb),
      region: body.region,
      stack: body.stack,
      modelManifestId: body.modelManifestId,
    };

    if (!config.cpu || !config.ramGb || !config.storageGb || !config.region || !config.stack) {
      return NextResponse.json({ error: "Missing required config fields" }, { status: 400 });
    }

    const priceSats = estimateMonthlyPriceSats(config);
    const configId = generateId("cfg");
    const validUntil = Date.now() + QUOTE_TTL_MS;

    const appFeeSats = priceSats + PLATFORM_FEE_SATS;

    const quote: Quote = {
      configId,
      config,
      btcPrice: satsToBtc(appFeeSats),
      priceSats,
      appFeeSats,
      validUntil,
    };

    db.quotes.set(configId, quote);

    return NextResponse.json({
      config_id: configId,
      btc_price: satsToBtc(priceSats),
      price_sats: priceSats,
      app_fee_sats: appFeeSats,
      platform_fee_sats: PLATFORM_FEE_SATS,
      min_confirmations: 1,
      valid_until: Math.floor(validUntil / 1000),
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
