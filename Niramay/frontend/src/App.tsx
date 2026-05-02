import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './designSystem';
import { ToastProvider } from './components/ToastNotification';

import ModeSelectionScreen from './components/ModeSelectionScreen';
import LandingPage from './pages/LandingPage';
import LiveVisualizer from './pages/LiveVisualizer';
import HealingDashboard from './pages/HealingDashboard';
import ReportsPage from './pages/ReportsPage';

export default function App() {
  const [modeSelected, setModeSelected] = useState(false);

  return (
    <ThemeProvider>
      <ToastProvider>
        {/* Mode Selection Screen — shown once on startup */}
        <AnimatePresence>
          {!modeSelected && (
            <ModeSelectionScreen onSelect={() => setModeSelected(true)} />
          )}
        </AnimatePresence>

        {/* Main app — only shown after mode selection */}
        {modeSelected && (
          <BrowserRouter>

            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<HealingDashboard />} />
              <Route path="/visualizer" element={<LiveVisualizer />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        )}
      </ToastProvider>
    </ThemeProvider>
  );
}
