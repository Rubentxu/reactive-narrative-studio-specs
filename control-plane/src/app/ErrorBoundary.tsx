import React from 'react';
import { synthetic } from '../diagnostics/types';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; diagnostic: { keyword: string; message: string; instancePath: string } | null; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, diagnostic: null };
  }

  static getDerivedStateFromError(err: unknown): State {
    const message = err instanceof Error ? err.message : String(err);
    const syntheticErr = synthetic('render-exception', '', message);
    return { hasError: true, diagnostic: { keyword: syntheticErr.keyword, message: syntheticErr.message, instancePath: syntheticErr.instancePath } };
  }

  componentDidCatch(err: unknown, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', err, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError && this.state.diagnostic) {
      return (
        <div role="alert" aria-live="polite" style={{ padding: '1rem', border: '1px solid #dc2626', borderRadius: '4px', background: '#fef2f2' }}>
          <strong style={{ color: '#dc2626' }}>Application Error</strong>
          <p style={{ margin: '0.5rem 0' }}>
            <code>{this.state.diagnostic.keyword}</code>: {this.state.diagnostic.message}
          </p>
          {this.state.diagnostic.instancePath && (
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              At: <code>{this.state.diagnostic.instancePath}</code>
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
