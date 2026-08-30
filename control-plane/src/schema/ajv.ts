import Ajv, { type ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
  strict: true,
  allErrors: true,
});

addFormats(ajv, ['date-time']);

export { ajv };

export function validate<T>(
  schema: object,
  data: unknown
): { valid: true; data: T } | { valid: false; errors: ErrorObject[] } {
  const validator = ajv.compile(schema);
  const valid = validator(data);
  if (valid) {
    return { valid: true, data: data as T };
  }
  return { valid: false, errors: validator.errors ?? [] };
}
