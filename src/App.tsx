import { Route, Routes, useLocation } from 'react-router-dom';
import { CoverPage } from './pages/CoverPage';
import { ProtocolPage } from './pages/ProtocolPage';
import './app.css';

import type { Location } from 'react-router-dom';

function App() {
  const location = useLocation();

  function renderRoutes(routeLocation: Location) {
    return (
      <Routes location={routeLocation}>
        <Route path="/" element={<CoverPage />} />
        <Route path="/protocol" element={<ProtocolPage />} />
        <Route path="*" element={<CoverPage />} />
      </Routes>
    );
  }

  return (
    <div className="mobile-app-shell">
      <div className="mobile-paper">
        <div className="screen-stack">
          <div className="screen-layer screen-layer--static">{renderRoutes(location)}</div>
        </div>
      </div>
    </div>
  );
}

export default App;
