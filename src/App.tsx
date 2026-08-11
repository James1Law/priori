import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './pages/LandingPage'
import SessionLayout from './contexts/SessionContext'
import SessionPage from './pages/SessionPage'
import ScoringFlowPage from './pages/ScoringFlowPage'
import EstimationFlowPage from './pages/EstimationFlowPage'
import PrioritisationPage from './pages/PrioritisationPage'
import ImportExportPage from './pages/ImportExportPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/s/:slug" element={<SessionLayout />}>
            <Route index element={<SessionPage />} />
            <Route path="roadmap" element={<SessionPage />} />
            <Route path="capacity" element={<SessionPage />} />
            <Route path="prioritise" element={<PrioritisationPage />} />
            <Route path="item/:itemId" element={<SessionPage />} />
            <Route path="score" element={<ScoringFlowPage />} />
            <Route path="estimate" element={<EstimationFlowPage />} />
            <Route path="import-export" element={<ImportExportPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
