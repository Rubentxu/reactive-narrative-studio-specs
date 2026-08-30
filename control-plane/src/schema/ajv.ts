import Ajv, { type ErrorObject } from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const ajv = new Ajv({
  strict: true,
  allErrors: true,
});

addFormats(ajv, ['date-time']);

// Each schema const pattern must resolve through ajv.addSchema before compile.
ajv.addSchema({
  $id: 'https://narrative.dev/schemas/control-plane/project/v1',
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  type: 'object',
});

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
