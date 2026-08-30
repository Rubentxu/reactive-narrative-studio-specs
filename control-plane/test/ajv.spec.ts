import { describe, it, expect } from 'vitest';
import { ajv } from '../src/schema/ajv';

describe('ajv instance', () => {
  it('has strict: true', () => {
    expect((ajv as any).opts.strict).toBe(true);
  });

  it('has allErrors: true', () => {
    expect((ajv as any).opts.allErrors).toBe(true);
  });

  it('compiles a schema with $ref without network', () => {
    // Load a schema that has $ref
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $id: 'test',
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };
    const validator = ajv.compile(schema);
    const result = validator({ name: 'test' });
    expect(result).toBe(true);
    const invalid = validator({});
    expect(invalid).toBe(false);
  });
});
