import { ThemeProvider } from './designSystem'
import HealingDashboard from './pages/HealingDashboard'

export default function App() {
  return (
    <ThemeProvider>
      <HealingDashboard />
    </ThemeProvider>
  )
}
