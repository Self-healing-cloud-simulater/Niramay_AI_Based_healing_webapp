import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './designSystem';
import LandingPage from './pages/LandingPage';
import LiveVisualizer from './pages/LiveVisualizer';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/visualizer" element={<LiveVisualizer />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
