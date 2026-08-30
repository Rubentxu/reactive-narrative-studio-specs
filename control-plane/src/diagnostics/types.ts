export interface AjvError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message: string;
  params: Record<string, unknown>;
}

export type Diagnostic<T> =
  | { ok: true; data: T }
  | { ok: false; errors: AjvError[] };

export type SyntheticKeyword =
  | 'path-traversal'
  | 'parse-error'
  | 'unknown-schema'
  | 'missing-entry'
  | 'render-exception';

export function fromAjv(errors: ReadonlyArray<{
  instancePath: string;
  schemaPath: string;
  keyword: string;
  message?: string;
  params: Record<string, unknown>;
}>): AjvError[] {
  return errors.map((e) => ({
    instancePath: e.instancePath,
    schemaPath: e.schemaPath,
    keyword: e.keyword,
    message: e.message ?? '',
    params: e.params,
  }));
}

export function synthetic(
  keyword: SyntheticKeyword,
  instancePath: string,
  message: string
): AjvError {
  return {
    instancePath,
    schemaPath: '',
    keyword,
    message,
    params: {},
  };
}
