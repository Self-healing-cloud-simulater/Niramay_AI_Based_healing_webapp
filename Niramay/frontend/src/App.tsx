import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './designSystem';
import LandingPage from './pages/LandingPage';
import LiveVisualizer from './pages/LiveVisualizer';
import HealingDashboard from './pages/HealingDashboard';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<HealingDashboard />} />
          <Route path="/visualizer" element={<LiveVisualizer />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
