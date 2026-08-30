import React, { useEffect, useState } from 'react';
import { RouterProvider } from '@tanstack/react-router';
import { ErrorBoundary } from './ErrorBoundary';
import { DiagnosticPanel } from '../diagnostics/DiagnosticPanel';
import { useProjectionStore } from '../store/projectionStore';
import { router } from '../routes/router';
import type { AjvError } from '../diagnostics/types';

function DiagnosticBanner({ errors }: { errors: AjvError[] }): React.ReactElement | null {
  if (errors.length === 0) return null;
  const firstError = errors[0];
  if (!firstError) return null;
  return (
    <div className="error-banner" role="alert">
      <strong>Error:</strong> {firstError.instancePath}: [{firstError.keyword}] {firstError.message}
      <DiagnosticPanel errors={errors} />
    </div>
  );
}

function App(): React.ReactElement {
  const [routerReady, setRouterReady] = useState(false);
  const errors = useProjectionStore((s) => s.diagnostics);

  useEffect(() => { setRouterReady(true); }, []);

  if (!routerReady) return <div>Loading...</div>;

  return (
    <ErrorBoundary>
      <DiagnosticBanner errors={errors} />
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}

export default App;
