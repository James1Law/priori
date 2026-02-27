import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './pages/LandingPage'
import SessionPage from './pages/SessionPage'
import ScoringFlowPage from './pages/ScoringFlowPage'
import EstimationFlowPage from './pages/EstimationFlowPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/s/:slug" element={<SessionPage />} />
          <Route path="/s/:slug/roadmap" element={<SessionPage />} />
          <Route path="/s/:slug/item/:itemId" element={<SessionPage />} />
          <Route path="/s/:slug/score" element={<ScoringFlowPage />} />
          <Route path="/s/:slug/estimate" element={<EstimationFlowPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
