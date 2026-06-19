import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './bootstrapTheme';
import './themes/ui/themes.css';
import './themes/ui/clairvoyant.css';
import './themes/ui/bookworm.css';
import './themes/ui/blueprint.css';
import './components/welcome.css';
import './index.css';
import { preloadWelcomeFonts } from './themes/ui/applyTheme';
import App from './App.tsx';

preloadWelcomeFonts();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
