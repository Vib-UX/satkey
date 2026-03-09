import type { ProtocolInscription } from "./types.js";
import { PROTOCOL_ID } from "./types.js";
import { validateInscription, type ValidationResult } from "./validate.js";

/**
 * Attempt to parse raw JSON (string or object) as a protocol inscription.
 * Returns a typed ValidationResult so callers can branch on `.success`.
 */
export function parseInscriptionJson(
  raw: string | Record<string, unknown>
): ValidationResult<ProtocolInscription> {
  let obj: unknown;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return {
        success: false,
        errors: [{ path: "", message: "Invalid JSON" }],
      };
    }
  } else {
    obj = raw;
  }

  if (
    typeof obj !== "object" ||
    obj === null ||
    !("protocol" in obj) ||
    (obj as Record<string, unknown>).protocol !== PROTOCOL_ID
  ) {
    return {
      success: false,
      errors: [
        {
          path: "protocol",
          message: `Not an access-ordinals inscription (expected protocol="${PROTOCOL_ID}")`,
        },
      ],
    };
  }

  return validateInscription(obj);
}

/**
 * Type-narrowing helper: returns the inscription only if it matches the
 * expected `type` discriminant; otherwise null.
 */
export function narrowType<T extends ProtocolInscription["type"]>(
  inscription: ProtocolInscription,
  expectedType: T
): Extract<ProtocolInscription, { type: T }> | null {
  if (inscription.type === expectedType) {
    return inscription as Extract<ProtocolInscription, { type: T }>;
  }
  return null;
}
