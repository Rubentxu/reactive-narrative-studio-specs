/**
 * templateEngine.spec.ts — round-trip oracle for the TS template engine.
 *
 * Mirrors the 5-fixture corpus from tools/narrative_recipes/tests/fixtures/mustache-subset/
 * (variable, each, if, comment, error).  Each fixture has the same template+params as
 * the Python version, and the TS engine must produce identical output.
 */

import { describe, it, expect } from 'vitest';
import { TemplateEngine, TemplateError } from '../../src/recipes/templateEngine';

describe('TemplateEngine — 5-fixture round-trip oracle', () => {
  const engine = new TemplateEngine();

  it('variable substitution — matches Python fixture', () => {
    const result = engine.render('{{title}}', { title: 'The Great Adventure' });
    expect(result).toBe('The Great Adventure');
  });

  it('each iteration — matches Python fixture', () => {
    // Python fixture: {{#each items}}{{.}}{{/each}} with items: [alpha, beta, gamma]
    // Output: items concatenated with no separator
    const template = '{{#each items}}{{.}}{{/each}}';
    const params = {
      items: ['alpha', 'beta', 'gamma'],
    };
    const result = engine.render(template, params);
    expect(result).toBe('alphabetagamma');
  });

  it('if truthy — matches Python fixture', () => {
    const template = '{{#if show}}Secret{{/if}}';
    expect(engine.render(template, { show: true })).toBe('Secret');
    expect(engine.render(template, { show: false })).toBe('');
    expect(engine.render(template, { show: null })).toBe('');
    expect(engine.render(template, { show: '' })).toBe('');
  });

  it('comment stripped — matches Python fixture', () => {
    const template = 'Hello {{! ignore this }}World';
    expect(engine.render(template, {})).toBe('Hello World');
  });

  it('forbidden partial throws TemplateError', () => {
    expect(() => engine.render('{{> partial}}', {})).toThrow(TemplateError);
    try {
      engine.render('{{> partial}}', {});
    } catch (e) {
      expect((e as TemplateError).code).toBe('forbidden-partial');
    }
  });

  it('forbidden raw throws TemplateError', () => {
    expect(() => engine.render('{{{raw}}}', { raw: '<b>' })).toThrow(TemplateError);
    try {
      engine.render('{{{raw}}}', { raw: '<b>' });
    } catch (e) {
      expect((e as TemplateError).code).toBe('forbidden-raw');
    }
  });

  it('forbidden dotted path throws TemplateError', () => {
    expect(() => engine.render('{{a.b.c}}', { a: { b: { c: 'x' } } })).toThrow(TemplateError);
    try {
      engine.render('{{a.b.c}}', { a: { b: { c: 'x' } } });
    } catch (e) {
      expect((e as TemplateError).code).toBe('forbidden-dotted-path');
    }
  });

  it('forbidden function call throws TemplateError', () => {
    expect(() => engine.render('{{ upper(name) }}', { name: 'x' })).toThrow(TemplateError);
    try {
      engine.render('{{ upper(name) }}', { name: 'x' });
    } catch (e) {
      expect((e as TemplateError).code).toBe('forbidden-function-call');
    }
  });

  it('HTML escape prevents XSS', () => {
    const result = engine.render('{{msg}}', { msg: '<script>alert("xss")</script>' });
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('nested if blocks', () => {
    const template = '{{#if a}}{{#if b}}AB{{/if}}{{/if}}';
    expect(engine.render(template, { a: true, b: true })).toBe('AB');
    expect(engine.render(template, { a: true, b: false })).toBe('');
    expect(engine.render(template, { a: false, b: true })).toBe('');
  });

  it('var not found renders empty string', () => {
    expect(engine.render('Hello {{name}}!', {})).toBe('Hello !');
  });

  it('dot current-item in each', () => {
    const template = '{{#each items}}{{.}} {{/each}}';
    expect(engine.render(template, { items: ['A', 'B', 'C'] })).toBe('A B C ');
  });
});
