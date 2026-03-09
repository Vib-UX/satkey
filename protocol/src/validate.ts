import { ZodError, ZodSchema } from "zod";
import {
  AccessResourceSchema,
  AccessTokenSchema,
  ModelManifestSchema,
  ProtocolInscriptionSchema,
} from "./schemas.js";
import type {
  AccessResource,
  AccessToken,
  ModelManifest,
  ProtocolInscription,
} from "./types.js";

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{ path: string; message: string }>;
}

function validate<T>(
  schema: ZodSchema<T>,
  input: unknown
): ValidationResult<T> {
  try {
    const data = schema.parse(input);
    return { success: true, data };
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        success: false,
        errors: err.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      };
    }
    throw err;
  }
}

export function validateAccessResource(
  input: unknown
): ValidationResult<AccessResource> {
  return validate(AccessResourceSchema, input);
}

export function validateAccessToken(
  input: unknown
): ValidationResult<AccessToken> {
  return validate(AccessTokenSchema, input);
}

export function validateModelManifest(
  input: unknown
): ValidationResult<ModelManifest> {
  return validate(ModelManifestSchema, input);
}

export function validateInscription(
  input: unknown
): ValidationResult<ProtocolInscription> {
  return validate(ProtocolInscriptionSchema, input);
}
