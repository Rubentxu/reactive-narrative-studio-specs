/**
 * Result types for narrative-recipes modules.
 *
 * These are separate from the diagnostics/ Diagnostic<T> type used elsewhere
 * in the control-plane. Recipe results use a simple { ok, code, message } shape
 * that is easier to inspect in CLI contexts.
 */

export interface Result<T = void> {
  ok: boolean;
  code: string;
  message: string;
  data?: T;
}

/** Create a successful result. */
export function ok<T>(code: string, message: string, data?: T): Result<T> {
  return { ok: true, code, message, data: data as T };
}

/** Create an error result. */
export function err(code: string, message: string): Result<never> {
  return { ok: false, code, message };
}
