import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import AppSkeleton from './components/AppSkeleton'
import './index.css'

// App (and everything that reads DATA) waits for the data fetch in data.js,
// so the skeleton paints immediately while JSON and JS download in parallel.
const App = lazy(() => import('./App'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <Suspense fallback={<AppSkeleton />}>
          <App />
        </Suspense>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
)
