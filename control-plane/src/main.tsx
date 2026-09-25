import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import './styles.css';

// Import extensions module so the registry singleton + feature folder registrations
// happen at app boot
import './extensions';

// Import each feature folder's index.tsx for side-effect registration
import './features/catalog/entity/index.tsx';
import './features/story/character/index.tsx';
import './features/visual/character/index.tsx';
import './features/continuity/character/index.tsx';
import './features/docs/character/index.tsx';
import './features/docs/capability/index.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
