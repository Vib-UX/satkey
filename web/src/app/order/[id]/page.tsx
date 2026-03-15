"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { BitcoinNetworkType } from "sats-connect";

const NETWORK = BitcoinNetworkType.Testnet4;
const IS_TESTNET = (NETWORK as string) !== "Mainnet";
const MEMPOOL_BASE = IS_TESTNET
  ? "https://mempool.space/testnet4"
  : "https://mempool.space";

interface OrderData {
  order_id: string;
  config_id: string;
  config: {
    cpu: number;
    ramGb: number;
    storageGb: number;
    region: string;
    stack: string;
  };
  payment_rail: "onchain" | "lightning";
  payment_txid: string | null;
  invoice_id: string | null;
  inscription_txid: string | null;
  access_token_inscription_id: string | null;
  user_ordinals_address: string;
  status: string;
  vps_id: string | null;
}

interface SshCreds {
  ssh_user: string;
  ssh_host: string;
  ssh_port: number;
}

const STATUS_FLOW = [
  "pending_inscription",
  "confirming",
  "provisioning",
  "ready",
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending_inscription: "Waiting for inscription",
  confirming: "Confirming on-chain",
  provisioning: "Provisioning VPS",
  ready: "Ready to claim",
  failed: "Failed",
};

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const wallet = useWallet();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [sshCreds, setSshCreds] = useState<SshCreds | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/${params.id}`);
      if (!res.ok) throw new Error("Order not found");
      const data = await res.json();
      setOrder(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  useEffect(() => {
    if (!order || order.status === "ready" || order.status === "failed") return;
    const id = setInterval(fetchOrder, 3000);
    return () => clearInterval(id);
  }, [order, fetchOrder]);

  const handleClaimAccess = useCallback(async () => {
    if (!order || !wallet.connected) return;

    setClaiming(true);
    setError(null);

    try {
      const challengeRes = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: order.order_id }),
      });
      if (!challengeRes.ok) {
        const data = await challengeRes.json();
        throw new Error(data.error || "Failed to get challenge");
      }
      const { challenge_id, challenge } = await challengeRes.json();

      const signed = await wallet.signMessage(challenge);
      if (!signed) {
        throw new Error("Message signing cancelled");
      }

      const verifyRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id,
          signature: signed.signature,
          address: signed.address,
        }),
      });

      if (!verifyRes.ok) {
        const data = await verifyRes.json();
        throw new Error(data.error || "Verification failed");
      }

      const creds = await verifyRes.json();
      setSshCreds({
        ssh_user: creds.ssh_user,
        ssh_host: creds.ssh_host,
        ssh_port: creds.ssh_port,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setClaiming(false);
    }
  }, [order, wallet]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-btc-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-300">Order not found</h1>
        <p className="mt-2 text-zinc-500">{error}</p>
        <Link href="/" className="btn-secondary mt-6 inline-flex">
          Back to home
        </Link>
      </div>
    );
  }

  const currentStep = STATUS_FLOW.indexOf(order.status as any);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Order {order.order_id}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Tracking your VPS deployment and Access Token inscription.
      </p>

      {/* Progress */}
      <div className="mt-8 card p-6">
        <div className="flex items-center justify-between">
          {STATUS_FLOW.map((s, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            const isFailed = order.status === "failed";
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold",
                      isFailed && active && "bg-red-500/20 text-red-400 ring-2 ring-red-500",
                      done && "bg-btc-500 text-zinc-950",
                      active && !isFailed && "bg-btc-500/20 text-btc-400 ring-2 ring-btc-500",
                      !done && !active && "bg-zinc-800 text-zinc-600"
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span
                    className={clsx(
                      "mt-2 text-[10px] font-medium text-center max-w-[80px]",
                      active ? "text-zinc-200" : "text-zinc-600"
                    )}
                  >
                    {STATUS_LABELS[s]}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div
                    className={clsx(
                      "mx-2 h-px flex-1",
                      done ? "bg-btc-500" : "bg-zinc-800"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {order.status !== "ready" && order.status !== "failed" && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-btc-500" />
            <p className="text-sm text-zinc-400">
              {STATUS_LABELS[order.status]}&hellip;
            </p>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="mt-6 card p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Details
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat label="CPU" value={`${order.config.cpu} vCPU`} />
          <MiniStat label="RAM" value={`${order.config.ramGb} GB`} />
          <MiniStat label="Storage" value={`${order.config.storageGb} GB`} />
          <MiniStat label="Region" value={order.config.region} />
        </div>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Stack" value={order.config.stack} />
          <InfoRow
            label="Payment"
            value={order.payment_rail === "lightning" ? "Lightning Network" : "On-chain Bitcoin"}
          />
          {order.inscription_txid && (
            <InfoRow
              label="Inscription tx"
              value={order.inscription_txid}
              mono
              href={`${MEMPOOL_BASE}/tx/${order.inscription_txid}`}
            />
          )}
          {order.payment_txid && order.payment_rail === "onchain" && (
            <InfoRow
              label="Payment tx"
              value={order.payment_txid}
              mono
              href={`${MEMPOOL_BASE}/tx/${order.payment_txid}`}
            />
          )}
          {order.invoice_id && order.payment_rail === "lightning" && (
            <InfoRow label="LN Invoice" value={order.invoice_id} mono />
          )}
          {order.access_token_inscription_id && (
            <InfoRow label="Inscription ID" value={order.access_token_inscription_id} mono />
          )}
          {order.vps_id && <InfoRow label="VPS ID" value={order.vps_id} mono />}
        </dl>
      </div>

      {/* Claim Access */}
      {order.status === "ready" && !sshCreds && (
        <div className="mt-6 card p-6">
          <h2 className="text-lg font-semibold text-zinc-100">Claim Access</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Sign a challenge with the wallet that holds your Access Token ordinal
            to prove ownership and receive SSH credentials.
          </p>

          {error && (
            <div className="mt-3 rounded-lg bg-red-500/5 border border-red-500/20 px-3 py-2">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {!wallet.connected ? (
              <button
                onClick={wallet.connect}
                disabled={wallet.connecting}
                className="btn-primary w-full"
              >
                {wallet.connecting ? "Connecting…" : "Connect Xverse Wallet"}
              </button>
            ) : (
              <>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 px-3 py-2 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-emerald-400">
                    Connected: {wallet.ordinalsAddress?.address.slice(0, 12)}…
                    {wallet.ordinalsAddress?.address.slice(-6)}
                  </span>
                </div>
                <button
                  onClick={handleClaimAccess}
                  disabled={claiming}
                  className="btn-primary w-full"
                >
                  {claiming ? (
                    <span className="flex items-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Signing challenge…
                    </span>
                  ) : (
                    "Sign Challenge & Claim Access"
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* SSH Credentials */}
      {sshCreds && (
        <div className="mt-6 card p-6 border-emerald-500/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-emerald-400">Access Granted</h2>
          </div>

          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-4 font-mono text-sm space-y-3">
            <div>
              <span className="text-zinc-500">$ </span>
              <span className="text-zinc-200">
                ssh {sshCreds.ssh_user}@{sshCreds.ssh_host} -p {sshCreds.ssh_port}
              </span>
            </div>
            <div className="h-px bg-zinc-800" />
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
              <dt className="text-zinc-500">User</dt>
              <dd className="text-zinc-300">{sshCreds.ssh_user}</dd>
              <dt className="text-zinc-500">Host</dt>
              <dd className="text-zinc-300">{sshCreds.ssh_host}</dd>
              <dt className="text-zinc-500">Port</dt>
              <dd className="text-zinc-300">{sshCreds.ssh_port}</dd>
            </dl>
          </div>

          <p className="mt-3 text-xs text-zinc-500">
            Your sat is your key. Access persists as long as you hold the ordinal.
            Transfer the inscription to revoke.
          </p>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-800/50 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="text-sm font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, mono, href }: { label: string; value: string; mono?: boolean; href?: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-xs text-zinc-500 sm:w-28">{label}</dt>
      <dd className={clsx("text-xs break-all", mono && "font-mono", href ? "text-btc-400 hover:text-btc-300" : "text-zinc-300")}>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
