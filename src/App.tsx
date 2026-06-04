import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import TopBar from './components/TopBar';
import Dashboard from './components/Dashboard';
import PalaceWorkspace from './components/PalaceWorkspace';
import SearchModal from './components/SearchModal';
import { useStore } from './state/useStore';
import { useUI } from './state/useUI';

export default function App() {
  const init = useStore((s) => s.init);
  const loaded = useStore((s) => s.loaded);
  const setSearchOpen = useUI((s) => s.setSearchOpen);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setSearchOpen]);

  return (
    <div className="app-shell">
      <TopBar />
      {!loaded ? (
        <div className="empty">Loading your palaces…</div>
      ) : (
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/palace/:palaceId" element={<PalaceWorkspace />} />
        </Routes>
      )}
      <SearchModal />
    </div>
  );
}
