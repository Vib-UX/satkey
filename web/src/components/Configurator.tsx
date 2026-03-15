"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import { createInscription, BitcoinNetworkType } from "sats-connect";
import { QRCodeSVG } from "qrcode.react";
import {
  CPU_OPTIONS,
  RAM_OPTIONS,
  STORAGE_OPTIONS,
  REGIONS,
  STACK_PRESETS,
  type VpsConfig,
  type StackPreset,
  type Region,
} from "@/lib/types";
import { estimateMonthlyPriceSats, formatSats } from "@/lib/pricing";
import { buildAccessResourceFromConfig, buildAccessTokenForResource } from "@/lib/protocol-helpers";
import { useWallet } from "@/hooks/useWallet";

type FlowStep =
  | "configure"
  | "quoting"
  | "choose_rail"
  | "ln_invoice"
  | "ln_settled"
  | "inscribing"
  | "provisioning"
  | "submitted"
  | "success_fallback";

type PaymentRail = "onchain" | "lightning";

const NETWORK = BitcoinNetworkType.Testnet4;
const IS_TESTNET = (NETWORK as string) !== "Mainnet";
const APP_FEE_ADDRESS = "tb1qcjq0a9a0ytjvudqp6amzmx32avhushp7qvu2z6";
const MEMPOOL_BASE = IS_TESTNET
  ? "https://mempool.space/testnet4"
  : "https://mempool.space";

interface QuoteData {
  config_id: string;
  btc_price: string;
  price_sats: number;
  app_fee_sats: number;
}

interface InvoiceData {
  invoice_id: string;
  amount_sats: number;
  bolt11: string;
  status: string;
}

interface SshCreds {
  ssh_user: string;
  ssh_password: string;
  ssh_host: string;
  ssh_port: number;
}

export function Configurator() {
  const router = useRouter();
  const wallet = useWallet();

  const [config, setConfig] = useState<VpsConfig>({
    cpu: 2,
    ramGb: 2,
    storageGb: 50,
    region: "us-east",
    stack: "bare",
  });
  const [modelId, setModelId] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [flowStep, setFlowStep] = useState<FlowStep>("configure");
  const [rail, setRail] = useState<PaymentRail>("onchain");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successTxid, setSuccessTxid] = useState<string | null>(null);
  const [sshCreds, setSshCreds] = useState<SshCreds | null>(null);
  const invoicePollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const effectiveConfig = useMemo<VpsConfig>(
    () => ({
      ...config,
      modelManifestId: config.stack === "llm_runtime" && modelId ? modelId : undefined,
    }),
    [config, modelId]
  );

  const price = useMemo(() => estimateMonthlyPriceSats(effectiveConfig), [effectiveConfig]);

  const accessTokenJson = useMemo(() => {
    const resource = buildAccessResourceFromConfig(
      effectiveConfig,
      wallet.ordinalsAddress?.publicKey ?? "02" + "00".repeat(32)
    );
    const token = buildAccessTokenForResource(resource, "pending_inscription", {
      display_name: `SatKey VPS Access – ${effectiveConfig.region}`,
    });
    return JSON.stringify(token, null, 2);
  }, [effectiveConfig, wallet.ordinalsAddress]);

  useEffect(() => {
    return () => {
      if (invoicePollRef.current) clearInterval(invoicePollRef.current);
    };
  }, []);

  const resetFlow = useCallback(() => {
    setFlowStep("configure");
    setQuote(null);
    setInvoice(null);
    setError(null);
    setRail("onchain");
    if (invoicePollRef.current) clearInterval(invoicePollRef.current);
  }, []);

  // ── Step 1: Get quote ──────────────────────────────────────────────
  const handleGetQuote = useCallback(async () => {
    setFlowStep("quoting");
    setError(null);
    try {
      const res = await fetch("/api/quote-vps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(effectiveConfig),
      });
      if (!res.ok) throw new Error("Quote request failed");
      const data: QuoteData = await res.json();
      setQuote(data);
      setFlowStep("choose_rail");
    } catch (err: any) {
      setError(err.message);
      setFlowStep("configure");
    }
  }, [effectiveConfig]);

  // ── Step 2a: On-chain → show confirm step
  const handleOnchainProceed = useCallback(async () => {
    setRail("onchain");
  }, []);

  // ── Step 2b: Lightning → create invoice → poll → then inscribe
  const handleLightningProceed = useCallback(async () => {
    if (!quote) return;
    setRail("lightning");
    setError(null);
    setFlowStep("ln_invoice");

    try {
      const res = await fetch("/api/create-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config_id: quote.config_id }),
      });
      if (!res.ok) throw new Error("Failed to create Lightning invoice");
      const data: InvoiceData = await res.json();
      setInvoice(data);

      if (invoicePollRef.current) clearInterval(invoicePollRef.current);
      invoicePollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(`/api/invoice/${data.invoice_id}`);
          const inv = await poll.json();
          if (inv.status === "settled") {
            if (invoicePollRef.current) clearInterval(invoicePollRef.current);
            setInvoice((prev) => prev ? { ...prev, status: "settled" } : prev);
            setFlowStep("ln_settled");
          } else if (inv.status === "expired") {
            if (invoicePollRef.current) clearInterval(invoicePollRef.current);
            setError("Invoice expired. Please try again.");
            setFlowStep("choose_rail");
          }
        } catch { /* ignore poll errors */ }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setFlowStep("choose_rail");
    }
  }, [quote]);

  // ── Core inscription logic ──────────────────────────────────────────
  const doInscribe = useCallback(async (paymentRail: PaymentRail) => {
    if (!quote || !wallet.ordinalsAddress) {
      setError("Missing quote or wallet. Please connect your wallet and try again.");
      setFlowStep("choose_rail");
      return;
    }

    setFlowStep("inscribing");
    setError(null);

    // Log balance vs required
    const bal = await wallet.fetchBalance();
    console.log("[SatKey] === Pre-inscription balance check ===");
    console.log("[SatKey] Required (appFee):", quote.price_sats, "sats");
    console.log("[SatKey] Wallet balance:", bal ? {
      confirmed: `${bal.confirmed} sats`,
      unconfirmed: `${bal.unconfirmed} sats`,
      total: `${bal.total} sats`,
    } : "UNKNOWN (failed to fetch)");
    if (bal) {
      console.log("[SatKey] Sufficient?", bal.confirmed >= quote.price_sats ? "YES" : "NO — need more funds");
    }

    try {
      const resource = buildAccessResourceFromConfig(
        effectiveConfig,
        wallet.ordinalsAddress.publicKey
      );
      const token = buildAccessTokenForResource(resource, "pending_inscription", {
        display_name: `SatKey VPS Access – ${effectiveConfig.region}`,
      });

      const isOnchain = paymentRail === "onchain";
      const includeAppFee = isOnchain && APP_FEE_ADDRESS;

      console.log("[SatKey] createInscription payload:", {
        network: NETWORK,
        contentType: "application/json",
        payloadType: "PLAIN_TEXT",
        includeAppFee: !!includeAppFee,
        appFeeAddress: includeAppFee ? APP_FEE_ADDRESS : undefined,
        appFee: includeAppFee ? quote.price_sats : undefined,
        suggestedMinerFeeRate: 10,
      });

      await createInscription({
        payload: {
          network: { type: NETWORK },
          contentType: "application/json",
          content: JSON.stringify(token),
          payloadType: "PLAIN_TEXT",
          ...(includeAppFee
            ? {
                appFeeAddress: APP_FEE_ADDRESS,
                appFee: quote.price_sats,
              }
            : {}),
          suggestedMinerFeeRate: 10,
        },
        onFinish: async (response) => {
          console.log("[SatKey] Inscription success! txId:", response.txId);
          setSuccessTxid(response.txId);
          setFlowStep("provisioning");

          try {
            const res = await fetch("/api/order-complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                config_id: quote.config_id,
                txid: response.txId,
                ordinals_address: wallet.ordinalsAddress!.address,
                payment_address: wallet.paymentAddress?.address,
                payment_rail: paymentRail,
                invoice_id: paymentRail === "lightning" ? invoice?.invoice_id : undefined,
                config: effectiveConfig,
              }),
            });

            if (!res.ok) throw new Error("API returned " + res.status);
            const data = await res.json();

            if (data.ssh_user && data.ssh_password) {
              setSshCreds({
                ssh_user: data.ssh_user,
                ssh_password: data.ssh_password,
                ssh_host: data.ssh_host,
                ssh_port: data.ssh_port,
              });
            }

            setFlowStep("submitted");

            if (data.status === "failed") {
              setError(data.error ?? "VPS provisioning failed");
            }
          } catch (err) {
            console.warn("[SatKey] order-complete failed, showing fallback:", err);
            setFlowStep("success_fallback");
          }
        },
        onCancel: () => {
          setError("Inscription cancelled.");
          setFlowStep("choose_rail");
        },
      });
    } catch (err: any) {
      console.error("[SatKey] Inscription error:", err);
      setError(err.message ?? "Inscription failed");
      setFlowStep("choose_rail");
    }
  }, [wallet, quote, effectiveConfig, invoice, router]);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <section id="configurator" className="scroll-mt-20 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="section-heading">Configure your VPS</h2>
          <p className="mt-3 text-zinc-400">
            Pick your specs, choose how to pay, then inscribe your Access Token.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* ── Left column: Config controls ── */}
          <div className="card p-6 space-y-6">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-zinc-300">Stack Preset</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {STACK_PRESETS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setConfig((c) => ({ ...c, stack: s.value as StackPreset }))}
                    className={clsx(
                      "rounded-lg border p-3 text-left transition-all",
                      config.stack === s.value
                        ? "border-btc-500 bg-btc-500/5"
                        : "border-zinc-800 bg-zinc-800/40 hover:border-zinc-700"
                    )}
                  >
                    <p className={clsx("text-sm font-semibold", config.stack === s.value ? "text-btc-400" : "text-zinc-200")}>
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">{s.description}</p>
                  </button>
                ))}
              </div>
            </fieldset>

            {config.stack === "llm_runtime" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Model Manifest ID</label>
                <input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder="e.g. mixtral-8x7b-v0.1"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">CPU Cores</label>
              <div className="flex gap-2">
                {CPU_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, cpu: n }))}
                    className={clsx(
                      "flex-1 rounded-lg border py-2 text-sm font-medium transition-all",
                      config.cpu === n
                        ? "border-btc-500 bg-btc-500/10 text-btc-400"
                        : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">RAM (GB)</label>
              <div className="flex flex-wrap gap-2">
                {RAM_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, ramGb: n }))}
                    className={clsx(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      config.ramGb === n
                        ? "border-btc-500 bg-btc-500/10 text-btc-400"
                        : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Storage (GB)</label>
              <div className="flex flex-wrap gap-2">
                {STORAGE_OPTIONS.map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig((c) => ({ ...c, storageGb: n }))}
                    className={clsx(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
                      config.storageGb === n
                        ? "border-btc-500 bg-btc-500/10 text-btc-400"
                        : "border-zinc-800 bg-zinc-800/40 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    {n >= 1000 ? `${n / 1000} TB` : n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Region</label>
              <select
                value={config.region}
                onChange={(e) => setConfig((c) => ({ ...c, region: e.target.value as Region }))}
                className="input-field"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Right column: Price + Flow ── */}
          <div className="space-y-4">
            <div className="card p-6">
              {/* Price display */}
              <p className="text-sm font-medium text-zinc-400">Estimated monthly cost</p>
              <p className="mt-2 text-4xl font-bold font-mono text-btc-400">{formatSats(price)}</p>
              <p className="mt-1 text-xs text-zinc-500">&asymp; {(price / 100_000_000).toFixed(6)} BTC / month</p>

              {/* Wallet not connected notice */}
              {!wallet.connected && flowStep !== "configure" && (
                <div className="mt-3 rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2">
                  <p className="text-xs text-amber-400">Connect your wallet in the navbar to proceed.</p>
                </div>
              )}

              {/* Error */}
              {(error || wallet.error) && (
                <div className="mt-3 rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2">
                  <p className="text-xs text-red-400">{error || wallet.error}</p>
                </div>
              )}

              {/* ── Flow steps ── */}
              <div className="mt-6 space-y-3">

                {/* STEP: Configure */}
                {flowStep === "configure" && (
                  <button onClick={handleGetQuote} className="btn-primary w-full">
                    Get Quote &amp; Deploy
                  </button>
                )}

                {flowStep === "quoting" && (
                  <button disabled className="btn-primary w-full"><Spinner /> Getting quote&hellip;</button>
                )}

                {/* STEP: Choose payment rail */}
                {flowStep === "choose_rail" && quote && (
                  <>
                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2 text-center">
                      <p className="text-xs text-zinc-500">Quote valid for 15 min</p>
                      <p className="text-lg font-mono font-bold text-btc-400">{formatSats(quote.price_sats)}</p>
                    </div>

                    {wallet.balance && (
                      <div className="rounded-lg bg-zinc-800/30 px-3 py-2 text-center">
                        <p className="text-xs text-zinc-500">
                          Your balance: <span className="font-mono text-zinc-300">{formatSats(wallet.balance.confirmed)}</span>
                          {wallet.balance.confirmed < quote.price_sats && (
                            <span className="ml-1 text-amber-400">(insufficient)</span>
                          )}
                        </p>
                      </div>
                    )}

                    {!wallet.connected && (
                      <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-center">
                        <p className="text-xs text-amber-400">Connect your wallet in the navbar to continue</p>
                      </div>
                    )}

                    {rail === "onchain" ? (
                      <>
                        <div className="rounded-lg bg-zinc-800/50 px-3 py-2 text-center">
                          <p className="text-xs text-zinc-500">On-chain: inscription + payment in one tx</p>
                          <p className="text-sm font-mono font-semibold text-zinc-200">
                            {formatSats(quote.price_sats)} VPS + miner fee
                          </p>
                        </div>
                        <button
                          onClick={() => doInscribe("onchain")}
                          disabled={!wallet.connected}
                          className={clsx("btn-primary w-full", !wallet.connected && "opacity-50 cursor-not-allowed")}
                        >
                          Inscribe &amp; Pay ({formatSats(quote.price_sats)})
                        </button>
                        <button
                          onClick={() => setRail("lightning")}
                          className="btn-ghost w-full text-xs"
                        >
                          Switch to Lightning
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-medium text-zinc-400 text-center pt-1">Choose payment method</p>

                        <button onClick={handleOnchainProceed} disabled={!wallet.connected} className={clsx("btn-primary w-full text-left flex items-center gap-3 py-3", !wallet.connected && "opacity-50 cursor-not-allowed")}>
                          <OnchainIcon />
                          <div>
                            <span className="font-semibold">On-chain Bitcoin</span>
                            <span className="block text-[10px] opacity-70 font-normal">
                              Single tx: inscription + VPS payment via appFee
                            </span>
                          </div>
                        </button>

                        <button onClick={handleLightningProceed} disabled={!wallet.connected} className={clsx("btn-secondary w-full text-left flex items-center gap-3 py-3", !wallet.connected && "opacity-50 cursor-not-allowed")}>
                          <LightningIcon />
                          <div>
                            <span className="font-semibold">Lightning Network</span>
                            <span className="block text-[10px] opacity-70 font-normal">
                              Pay LN invoice first, then inscribe separately
                            </span>
                          </div>
                        </button>
                      </>
                    )}

                    <button onClick={resetFlow} className="btn-ghost w-full text-xs">Back to configurator</button>
                  </>
                )}

                {/* STEP: Lightning invoice */}
                {flowStep === "ln_invoice" && (
                  <div className="space-y-4">
                    {!invoice ? (
                      <div className="flex items-center justify-center py-6">
                        <Spinner /><span className="ml-2 text-sm text-zinc-400">Creating invoice&hellip;</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-center">
                          <p className="text-sm text-zinc-400">
                            Pay <span className="font-mono font-bold text-btc-400">{formatSats(invoice.amount_sats)}</span> via Lightning
                          </p>
                        </div>
                        <div className="flex justify-center">
                          <div className="rounded-xl bg-white p-3">
                            <QRCodeSVG value={invoice.bolt11} size={180} level="M" />
                          </div>
                        </div>
                        <code className="block rounded-lg bg-zinc-800 px-3 py-2 text-[10px] text-zinc-400 font-mono break-all select-all text-center">
                          {invoice.bolt11}
                        </code>
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-btc-500" />
                          <p className="text-xs text-zinc-500">Waiting for payment&hellip;</p>
                        </div>
                      </>
                    )}
                    <button onClick={resetFlow} className="btn-ghost w-full text-xs">Cancel</button>
                  </div>
                )}

                {/* STEP: Lightning settled → inscribe */}
                {flowStep === "ln_settled" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-emerald-400">Lightning payment received</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400 text-center">
                      Now inscribe the Access Token (miner fee only, no VPS payment).
                    </p>
                    <button onClick={() => doInscribe("lightning")} disabled={!wallet.connected} className="btn-primary w-full">
                      {wallet.connected ? "Inscribe Access Token" : "Connect wallet in navbar first"}
                    </button>
                    <button onClick={resetFlow} className="btn-ghost w-full text-xs">Cancel</button>
                  </div>
                )}

                {/* STEP: Inscribing */}
                {flowStep === "inscribing" && (
                  <button disabled className="btn-primary w-full"><Spinner /> Waiting for Xverse approval&hellip;</button>
                )}

                {/* STEP: Provisioning */}
                {flowStep === "provisioning" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-btc-500/5 border border-btc-500/20 px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Spinner />
                        <span className="text-sm font-medium text-btc-400">Provisioning your VPS&hellip;</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 text-center">
                      Creating your server account. This takes a few seconds.
                    </p>
                  </div>
                )}

                {/* STEP: Submitted (with optional creds) */}
                {flowStep === "submitted" && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-emerald-400">
                          {sshCreds ? "VPS Ready!" : "Order submitted"}
                        </span>
                      </div>
                    </div>

                    {sshCreds && <CredentialsCard creds={sshCreds} />}

                    {successTxid && (
                      <a
                        href={`${MEMPOOL_BASE}/tx/${successTxid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs font-mono text-btc-400 hover:text-btc-300 underline break-all"
                      >
                        View inscription on mempool.space
                      </a>
                    )}

                    <button onClick={resetFlow} className="btn-ghost w-full text-xs">
                      Configure another VPS
                    </button>
                  </div>
                )}

                {/* STEP: Fallback success (API failed but inscription succeeded) */}
                {flowStep === "success_fallback" && successTxid && (
                  <div className="space-y-3">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-medium text-emerald-400">Inscription broadcast!</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
                      <p className="text-[10px] font-medium text-zinc-500 mb-1">Transaction ID</p>
                      <p className="font-mono text-xs text-zinc-300 break-all select-all">{successTxid}</p>
                    </div>

                    <a
                      href={`${MEMPOOL_BASE}/tx/${successTxid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary w-full inline-flex items-center justify-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5-6H18m0 0v4.5m0-4.5L10.5 13.5" />
                      </svg>
                      View on mempool.space
                    </a>

                    <p className="text-xs text-zinc-500 text-center">
                      Your inscription is on-chain. Provisioning couldn&apos;t complete (server issue), but your transaction is safe.
                    </p>

                    <button onClick={resetFlow} className="btn-ghost w-full text-xs">
                      Configure another VPS
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* JSON preview */}
            <div className="card overflow-hidden">
              <button
                onClick={() => setShowJson((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Access Token JSON
                <svg className={clsx("h-4 w-4 transition-transform", showJson && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showJson && (
                <pre className="max-h-80 overflow-auto border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-xs text-zinc-400 font-mono">
                  {accessTokenJson}
                </pre>
              )}
            </div>

            <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
              <p className="text-xs text-zinc-500 leading-relaxed">
                <strong className="text-zinc-400">On-chain:</strong> Xverse builds one inscription tx that
                pays the VPS cost via <code className="text-btc-500/80">appFee</code> and mints your Access Token in a single broadcast.
                <br />
                <strong className="text-zinc-400">Lightning:</strong> Pay the VPS cost via LN invoice first,
                then inscribe the Access Token in a separate tx (miner fee only).
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function OnchainIcon() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-btc-500/10">
      <svg className="h-5 w-5 text-btc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </div>
  );
}

function LightningIcon() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
      <svg className="h-5 w-5 text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    </div>
  );
}

function CredentialsCard({ creds }: { creds: SshCreds }) {
  const sshCommand = `ssh ${creds.ssh_user}@${creds.ssh_host} -p ${creds.ssh_port}`;

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-zinc-950 p-4 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span className="text-sm font-semibold text-emerald-400">SSH Credentials</span>
      </div>

      <div className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-sm">
        <span className="text-zinc-500">$ </span>
        <span className="text-zinc-200 select-all">{sshCommand}</span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-zinc-500">Host</dt>
        <dd className="font-mono text-zinc-300 select-all">{creds.ssh_host}</dd>
        <dt className="text-zinc-500">Port</dt>
        <dd className="font-mono text-zinc-300">{creds.ssh_port}</dd>
        <dt className="text-zinc-500">User</dt>
        <dd className="font-mono text-zinc-300 select-all">{creds.ssh_user}</dd>
        <dt className="text-zinc-500">Password</dt>
        <dd className="font-mono text-btc-400 select-all">{creds.ssh_password}</dd>
      </dl>

      <p className="text-[10px] text-zinc-600">
        Save these credentials. Your sat is your key &mdash; access persists while you hold the ordinal.
      </p>
    </div>
  );
}
