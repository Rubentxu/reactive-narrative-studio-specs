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
    if (this.state.hasError && this.state.diagnostic) return null;
    return this.props.children;
  }
}
