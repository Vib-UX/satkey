import type { VpsConfig } from "./types";

export type PaymentRail = "onchain" | "lightning";

export type OrderStatus =
  | "pending_payment"
  | "pending_inscription"
  | "confirming"
  | "provisioning"
  | "ready"
  | "failed";

export type InvoiceStatus = "pending" | "settled" | "expired";

export interface Quote {
  configId: string;
  config: VpsConfig;
  btcPrice: string;
  priceSats: number;
  appFeeSats: number;
  validUntil: number;
}

export interface Invoice {
  invoiceId: string;
  configId: string;
  amountSats: number;
  bolt11: string;
  status: InvoiceStatus;
  createdAt: number;
  expiresAt: number;
  settledAt: number | null;
}

export interface Order {
  orderId: string;
  configId: string;
  config: VpsConfig;
  paymentRail: PaymentRail;
  paymentTxid: string | null;
  invoiceId: string | null;
  inscriptionTxid: string | null;
  accessTokenInscriptionId: string | null;
  userOrdinalsAddress: string;
  userPaymentAddress: string;
  status: OrderStatus;
  vpsId: string | null;
  sshUser: string | null;
  sshHost: string | null;
  sshPort: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface Challenge {
  challengeId: string;
  orderId: string;
  resourceId: string;
  inscriptionId: string;
  timestamp: number;
  nonce: string;
  message: string;
  expiresAt: number;
}

const quotes = new Map<string, Quote>();
const orders = new Map<string, Order>();
const challenges = new Map<string, Challenge>();
const invoices = new Map<string, Invoice>();

export const db = {
  quotes: {
    set: (id: string, q: Quote) => quotes.set(id, q),
    get: (id: string) => quotes.get(id),
  },
  orders: {
    set: (id: string, o: Order) => orders.set(id, o),
    get: (id: string) => orders.get(id),
    findByTxid: (txid: string) =>
      Array.from(orders.values()).find((o) => o.inscriptionTxid === txid),
  },
  invoices: {
    set: (id: string, inv: Invoice) => invoices.set(id, inv),
    get: (id: string) => invoices.get(id),
  },
  challenges: {
    set: (id: string, c: Challenge) => challenges.set(id, c),
    get: (id: string) => challenges.get(id),
    delete: (id: string) => challenges.delete(id),
  },
};
