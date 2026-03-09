"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Listing, CheckoutStep } from "@/lib/types";
import { formatSats, satsToBtc } from "@/lib/pricing";
import { clsx } from "clsx";

interface BidModalProps {
  listing: Listing;
  open: boolean;
  onClose: () => void;
}

const MOCK_BTC_ADDRESS = "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

const STEP_LABELS: Record<CheckoutStep, string> = {
  review: "Review",
  awaiting_payment: "Payment",
  confirming: "Confirming",
  transferring: "Transferring",
  ready: "Ready",
};

const STEPS: CheckoutStep[] = [
  "review",
  "awaiting_payment",
  "confirming",
  "transferring",
  "ready",
];

export function BidModal({ listing, open, onClose }: BidModalProps) {
  const [step, setStep] = useState<CheckoutStep>("review");
  const [bidAmount, setBidAmount] = useState("");

  const isAuction = listing.saleMode === "auction";
  const minBid = (listing.currentBidSats ?? listing.priceSats) + 10_000;
  const paymentAmount = isAuction ? Number(bidAmount) || minBid : listing.priceSats;

  useEffect(() => {
    if (open) {
      setStep("review");
      setBidAmount("");
    }
  }, [open]);

  const simulatePayment = useCallback(() => {
    setStep("awaiting_payment");
    setTimeout(() => setStep("confirming"), 4000);
    setTimeout(() => setStep("transferring"), 7000);
    setTimeout(() => setStep("ready"), 10000);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg card border-zinc-700 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isAuction ? "Place Bid" : "Buy Now"}
          </h2>
          <button onClick={onClose} className="btn-ghost p-1">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-1 border-b border-zinc-800/60 px-6 py-3">
          {STEPS.map((s, i) => {
            const idx = STEPS.indexOf(step);
            const done = i < idx;
            const active = i === idx;
            return (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div
                  className={clsx(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                    done && "bg-btc-500 text-zinc-950",
                    active && "bg-btc-500/20 text-btc-400 ring-2 ring-btc-500",
                    !done && !active && "bg-zinc-800 text-zinc-600"
                  )}
                >
                  {done ? "✓" : i + 1}
                </div>
                <span
                  className={clsx(
                    "hidden text-[10px] font-medium sm:inline",
                    active ? "text-zinc-300" : "text-zinc-600"
                  )}
                >
                  {STEP_LABELS[s]}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={clsx(
                      "mx-1 h-px flex-1",
                      done ? "bg-btc-500" : "bg-zinc-800"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {step === "review" && (
            <>
              <div className="rounded-lg bg-zinc-800/50 p-4">
                <p className="text-sm font-medium text-zinc-300">{listing.name}</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {listing.config.cpu} vCPU &middot; {listing.config.ramGb} GB RAM
                  &middot; {listing.config.storageGb} GB storage &middot;{" "}
                  {listing.config.region}
                </p>
              </div>

              {isAuction ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                    Your bid (sats)
                  </label>
                  <input
                    type="number"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`Minimum: ${minBid.toLocaleString()}`}
                    min={minBid}
                    className="input-field font-mono"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Current highest: {formatSats(listing.currentBidSats ?? listing.priceSats)}
                    &nbsp;&middot;&nbsp;Min increment: 10,000 sats
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-zinc-400">Amount</p>
                  <p className="text-3xl font-bold font-mono text-btc-400">
                    {formatSats(listing.priceSats)}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs leading-relaxed text-amber-400/80">
                  This is a non-custodial, experimental protocol. Payment is
                  on-chain BTC. The access ordinal will be transferred to your
                  address after confirmation. Verify all details before sending.
                </p>
              </div>

              <button
                onClick={simulatePayment}
                disabled={isAuction && (!bidAmount || Number(bidAmount) < minBid)}
                className="btn-primary w-full"
              >
                {isAuction ? "Place Bid" : "Proceed to Payment"}
              </button>
            </>
          )}

          {step === "awaiting_payment" && (
            <div className="flex flex-col items-center space-y-4">
              <p className="text-sm text-zinc-400">
                Send exactly{" "}
                <span className="font-mono font-bold text-btc-400">
                  {satsToBtc(paymentAmount)} BTC
                </span>{" "}
                to:
              </p>
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={`bitcoin:${MOCK_BTC_ADDRESS}?amount=${satsToBtc(paymentAmount)}`}
                  size={180}
                  level="M"
                />
              </div>
              <code className="block rounded-lg bg-zinc-800 px-3 py-2 text-xs text-zinc-300 font-mono break-all select-all">
                {MOCK_BTC_ADDRESS}
              </code>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-btc-500" />
                <p className="text-sm text-zinc-500">Waiting for payment&hellip;</p>
              </div>
            </div>
          )}

          {step === "confirming" && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-btc-500" />
              <p className="text-sm text-zinc-400">
                Payment detected. Waiting for confirmation&hellip;
              </p>
              <p className="text-xs text-zinc-600">
                Typically 1-3 blocks (~10-30 min)
              </p>
            </div>
          )}

          {step === "transferring" && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-btc-500" />
              <p className="text-sm text-zinc-400">
                Confirmed. Transferring Access Token ordinal&hellip;
              </p>
              <p className="text-xs text-zinc-600">
                Inscription {listing.accessTokenInscriptionId.slice(0, 16)}&hellip;
              </p>
            </div>
          )}

          {step === "ready" && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-zinc-100">
                Access Token is yours
              </p>
              <p className="text-sm text-zinc-400 text-center">
                Sign a wallet challenge to claim SSH access.
                Your sat is now your server key.
              </p>
              <button onClick={onClose} className="btn-primary">
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
