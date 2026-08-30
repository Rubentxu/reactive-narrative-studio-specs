// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from '../src/app/ErrorBoundary';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

function Bomb(): ReactNode {
  throw new Error('test error');
}

describe('ErrorBoundary', () => {
  it('renders diagnostic panel when error is caught (F-005 regression)', () => {
    const { container } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    // SPA must not blank — diagnostic panel must be rendered
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(screen.getByText(/test error/)).not.toBeNull();
  });

  it('renders children when no error', () => {
    const { container } = render(
      <ErrorBoundary>
        <div>OK</div>
      </ErrorBoundary>
    );
    expect(container.textContent).toContain('OK');
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
