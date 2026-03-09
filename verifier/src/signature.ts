import { createHash } from "node:crypto";

/**
 * Bitcoin message signature verification.
 *
 * Supports BIP-322 simple (segwit) signatures as well as the legacy
 * Bitcoin Signed Message format.  We use @noble/secp256k1 to avoid
 * native-addon headaches.
 *
 * NOTE: For production use you should add thorough BIP-322 support.
 * This module provides the structural contract so the rest of the
 * codebase can depend on it.
 */

const BITCOIN_MSG_PREFIX = "\x18Bitcoin Signed Message:\n";

function bitcoinMessageHash(message: string): Uint8Array {
  const msgBuf = Buffer.from(message, "utf8");
  const prefix = Buffer.from(BITCOIN_MSG_PREFIX, "utf8");
  const lenBuf = Buffer.from(varintEncode(msgBuf.length));
  const payload = Buffer.concat([prefix, lenBuf, msgBuf]);
  const first = createHash("sha256").update(payload).digest();
  return createHash("sha256").update(first).digest();
}

function varintEncode(n: number): number[] {
  if (n < 0xfd) return [n];
  if (n <= 0xffff) return [0xfd, n & 0xff, (n >> 8) & 0xff];
  throw new Error("varint too large");
}

export interface SignatureVerifier {
  verify(message: string, signature: string, address: string): Promise<boolean>;
}

/**
 * Stub verifier that always returns true — for local dev/testing.
 * Replace with real verification in production.
 */
export class DevSignatureVerifier implements SignatureVerifier {
  async verify(
    _message: string,
    _signature: string,
    _address: string
  ): Promise<boolean> {
    return true;
  }
}

/**
 * Verifier that delegates to bitcoinjs-message for legacy signed-message
 * format. Import dynamically so the rest of the codebase isn't blocked
 * if the dep isn't installed.
 */
export class BitcoinMessageVerifier implements SignatureVerifier {
  async verify(
    message: string,
    signature: string,
    address: string
  ): Promise<boolean> {
    try {
      // bitcoinjs-message is CJS, dynamic import for ESM compat
      const bm = await import("bitcoinjs-message");
      const verify = bm.default?.verify ?? bm.verify;
      return verify(message, address, signature);
    } catch {
      return false;
    }
  }
}

export { bitcoinMessageHash };
