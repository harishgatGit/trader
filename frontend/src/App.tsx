import React, { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import { ToastContainer, LoadingSpinner } from './components/ui';
import { useAppStore } from './store/useAppStore';
import DirectionalTransition from './components/DirectionalTransition';

// ── Lazy page imports ────────────────────────────────────────────────────────
// Each page is code-split into its own chunk. It is only downloaded when the
// user first navigates to that route. Heavy pages (StockDetail, Admin) are
// never loaded for users who don't visit them.
const Dashboard         = lazy(() => import('./pages/Dashboard'));
const AnalyzePage       = lazy(() => import('./pages/Analyze'));
const StockDetail       = lazy(() => import('./pages/StockDetail'));
const Watchlist         = lazy(() => import('./pages/Watchlist'));
const AlertsPage        = lazy(() => import('./pages/Alerts'));
const Reports           = lazy(() => import('./pages/Reports'));
const Settings          = lazy(() => import('./pages/Settings'));
const Login             = lazy(() => import('./pages/Login'));
const Register          = lazy(() => import('./pages/Register'));
const LandingPage       = lazy(() => import('./pages/LandingPage'));
const Profile           = lazy(() => import('./pages/Profile'));
const Privacy           = lazy(() => import('./pages/Privacy'));
const Terms             = lazy(() => import('./pages/Terms'));
const Contact           = lazy(() => import('./pages/Contact'));
const Education         = lazy(() => import('./pages/Education'));
const Glossary          = lazy(() => import('./pages/Glossary'));
const Admin             = lazy(() => import('./pages/Admin'));
const WhatsForToday     = lazy(() => import('./pages/WhatsForToday'));
const PennyStocksToWatch = lazy(() => import('./pages/PennyStocksToWatch'));

// ── Page-level loading fallback ───────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <LoadingSpinner size="sm" />
  </div>
);

// ── Silent auto-login splash ────────────────────────────────────────────────
const AppLoader: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-6">
    {/* Animated grid backdrop */}
    <div
      className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,212,170,0.9) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,170,0.9) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }}
    />
    {/* Glows */}
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-brand-500/8 rounded-full blur-3xl pointer-events-none" />

    <div className="relative z-10 flex flex-col items-center gap-5">
      {/* Logo mark */}
      <div className="w-20 h-20 rounded-2xl flex items-center justify-center">
        <img
          src="/brand/icon_256.png"
          alt="InvestingAtti"
          className="w-20 h-20 object-contain drop-shadow-2xl"
        />
      </div>

      {/* Spinner + text */}
      <div className="flex items-center gap-3">
        <LoadingSpinner size="sm" />
        <span className="text-sm text-slate-400 font-medium tracking-wide">Loading Trader Agent...</span>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-brand-500/60"
            style={{ animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  </div>
);

// ── Protected route ─────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactElement; requireSuper?: boolean }> = ({
  children,
  requireSuper = false,
}) => {
  const { user, token } = useAppStore();

  // Not authenticated — redirect to landing page
  if (!token || !user) return <Navigate to="/landing" replace />;

  // If superuser is required but user role is BASIC, redirect to home
  if (requireSuper && user.role !== 'SUPERUSER') {
    return <Navigate to="/analyze" replace />;
  }

  return children;
};

// ── Index route component (role-based redirect) ─────────────────────────────
const IndexRoute: React.FC = () => {
  const { user } = useAppStore();
  if (user?.role === 'SUPERUSER') {
    return <Dashboard />;
  }
  return <Navigate to="/analyze" replace />;
};

// ── Root app ────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const { fetchMe, token, user } = useAppStore();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const boot = async () => {
      // If token already stored, validate it
      const storedToken = localStorage.getItem('trader_auth_token');
      if (storedToken) {
        await fetchMe();
      }
      setBooting(false);
    };

    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show branded loading screen until auto-login/session restore is done
  if (booting) return <AppLoader />;

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public pages */}
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Superuser Only Routes */}
            <Route
              index
              element={
                <ProtectedRoute>
                  <DirectionalTransition>
                    <IndexRoute />
                  </DirectionalTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="watchlist"
              element={
                <ProtectedRoute requireSuper>
                  <DirectionalTransition>
                    <Watchlist />
                  </DirectionalTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="alerts"
              element={
                <ProtectedRoute requireSuper>
                  <DirectionalTransition>
                    <AlertsPage />
                  </DirectionalTransition>
                </ProtectedRoute>
              }
            />

            <Route
              path="reports"
              element={
                <ProtectedRoute requireSuper>
                  <DirectionalTransition>
                    <Reports />
                  </DirectionalTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute requireSuper>
                  <DirectionalTransition>
                    <Settings />
                  </DirectionalTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute requireSuper>
                  <DirectionalTransition>
                    <Admin />
                  </DirectionalTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="stocks/:symbol"
              element={
                <ProtectedRoute>
                  <DirectionalTransition>
                    <StockDetail />
                  </DirectionalTransition>
                </ProtectedRoute>
              }
            />

            {/* Shared Routes (Standard Users and Superusers) */}
            <Route path="whats-for-today" element={<DirectionalTransition><WhatsForToday /></DirectionalTransition>} />
            <Route path="penny-stocks" element={<DirectionalTransition><PennyStocksToWatch /></DirectionalTransition>} />
            <Route path="analyze" element={<DirectionalTransition><AnalyzePage /></DirectionalTransition>} />
            <Route path="profile" element={<DirectionalTransition><Profile /></DirectionalTransition>} />
            <Route path="education" element={<DirectionalTransition><Education /></DirectionalTransition>} />
            <Route path="glossary" element={<DirectionalTransition><Glossary /></DirectionalTransition>} />
          </Route>

          {/* Catch-all Fallback */}
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;
