"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import walletInstance from "sats-connect";
import { AddressPurpose, RpcErrorCode } from "sats-connect";

export interface WalletAddress {
  address: string;
  publicKey: string;
  purpose: string;
  addressType: string;
}

export interface WalletBalance {
  confirmed: number;
  unconfirmed: number;
  total: number;
}

export interface WalletContextValue {
  connected: boolean;
  connecting: boolean;
  ordinalsAddress: WalletAddress | null;
  paymentAddress: WalletAddress | null;
  balance: WalletBalance | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  fetchBalance: () => Promise<WalletBalance | null>;
  signMessage: (message: string) => Promise<{ signature: string; address: string } | null>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const value = useWalletInternal();
  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within <WalletProvider>");
  return ctx;
}

function useWalletInternal(): WalletContextValue {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [ordinalsAddress, setOrdinalsAddress] = useState<WalletAddress | null>(null);
  const [paymentAddress, setPaymentAddress] = useState<WalletAddress | null>(null);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async (): Promise<WalletBalance | null> => {
    try {
      const response = await walletInstance.request("getBalance", null);
      if (response.status === "success") {
        const bal: WalletBalance = {
          confirmed: Number(response.result.confirmed),
          unconfirmed: Number(response.result.unconfirmed),
          total: Number(response.result.total),
        };
        setBalance(bal);
        console.log("[SatKey] Wallet balance:", {
          confirmed: `${bal.confirmed} sats`,
          unconfirmed: `${bal.unconfirmed} sats`,
          total: `${bal.total} sats`,
        });
        return bal;
      }
      return null;
    } catch (err) {
      console.warn("[SatKey] Failed to fetch balance:", err);
      return null;
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      const response = await walletInstance.request("wallet_connect", {
        addresses: [AddressPurpose.Ordinals, AddressPurpose.Payment],
        message: "SatKey needs your Bitcoin addresses to inscribe your Access Token.",
      });

      if (response.status === "success") {
        const addresses = response.result.addresses;
        const ord = addresses.find((a) => a.purpose === AddressPurpose.Ordinals);
        const pay = addresses.find((a) => a.purpose === AddressPurpose.Payment);

        setOrdinalsAddress(
          ord ? { address: ord.address, publicKey: ord.publicKey, purpose: ord.purpose, addressType: ord.addressType } : null
        );
        setPaymentAddress(
          pay ? { address: pay.address, publicKey: pay.publicKey, purpose: pay.purpose, addressType: pay.addressType } : null
        );
        setConnected(true);
        setConnecting(false);

        // Fetch balance right after connecting
        setTimeout(async () => {
          try {
            const balRes = await walletInstance.request("getBalance", null);
            if (balRes.status === "success") {
              const bal: WalletBalance = {
                confirmed: Number(balRes.result.confirmed),
                unconfirmed: Number(balRes.result.unconfirmed),
                total: Number(balRes.result.total),
              };
              setBalance(bal);
              console.log("[SatKey] Wallet balance:", {
                confirmed: `${bal.confirmed} sats`,
                unconfirmed: `${bal.unconfirmed} sats`,
                total: `${bal.total} sats`,
              });
            }
          } catch (e) {
            console.warn("[SatKey] Balance fetch failed:", e);
          }
        }, 500);
      } else {
        const isRejection = response.error?.code === RpcErrorCode.USER_REJECTION;
        setConnecting(false);
        setError(
          isRejection
            ? "Connection rejected by user"
            : response.error?.message ?? "Failed to connect wallet"
        );
      }
    } catch (err: any) {
      setConnecting(false);
      setError(err?.message ?? "Wallet not found. Install Xverse to continue.");
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await walletInstance.disconnect();
    } catch { /* ignore */ }
    setConnected(false);
    setConnecting(false);
    setOrdinalsAddress(null);
    setPaymentAddress(null);
    setBalance(null);
    setError(null);
  }, []);

  const signMessage = useCallback(
    async (message: string): Promise<{ signature: string; address: string } | null> => {
      if (!ordinalsAddress) return null;
      try {
        const response = await walletInstance.request("signMessage", {
          address: ordinalsAddress.address,
          message,
        });
        if (response.status === "success") {
          return { signature: response.result.signature, address: ordinalsAddress.address };
        }
        return null;
      } catch {
        return null;
      }
    },
    [ordinalsAddress]
  );

  return {
    connected,
    connecting,
    ordinalsAddress,
    paymentAddress,
    balance,
    error,
    connect,
    disconnect,
    fetchBalance,
    signMessage,
  };
}
