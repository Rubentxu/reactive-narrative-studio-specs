/**
 * Parameter validator using Ajv 8.x.
 *
 * Validates user-supplied parameters against a recipe's parameters.schema.json.
 * Bails BEFORE any filesystem write (per REQ-CR-12).
 */

import Ajv from "ajv";
import type { Result } from "./result.js";

const ajv = new Ajv({ allErrors: true, strict: true });

/** Validate parameters against a JSON Schema. */
export function validateParameters(
  parameters: Record<string, unknown>,
  parametersSchema: Record<string, unknown>,
): Result<void> {
  try {
    const validate = ajv.compile(parametersSchema);
    const valid = validate(parameters);
    if (valid) {
      return { ok: true, code: "parameter-valid", message: "Parameters are valid" };
    }
    const firstError = validate.errors?.[0];
    const path = firstError?.instancePath
      ? firstError.instancePath.replace(/^\//, "").replace(/\//g, ".")
      : null;
    const message = firstError
      ? `${path ? `at ${path}: ` : ""}${firstError.message ?? "validation error"}`
      : "validation error";
    return { ok: false, code: "parameter-validation-error", message };
  } catch (e) {
    return {
      ok: false,
      code: "parameter-validation-error",
      message: e instanceof Error ? e.message : String(e),
    };
  }
}

export class ParameterValidator {
  validate(
    parameters: Record<string, unknown>,
    parametersSchema: Record<string, unknown>,
  ): Result<void> {
    return validateParameters(parameters, parametersSchema);
  }
}
