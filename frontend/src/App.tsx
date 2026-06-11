import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AnalyzePage from './pages/Analyze';
import StockDetail from './pages/StockDetail';
import Watchlist from './pages/Watchlist';
import AlertsPage from './pages/Alerts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Education from './pages/Education';
import Glossary from './pages/Glossary';
import Admin from './pages/Admin';
import AdminLogin from './pages/AdminLogin';
import WhatsForToday from './pages/WhatsForToday';
import PennyStocksToWatch from './pages/PennyStocksToWatch';
import { ToastContainer, LoadingSpinner } from './components/ui';
import { useAppStore } from './store/useAppStore';
import { authApi } from './services/api';
import DirectionalTransition from './components/DirectionalTransition';

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

  // Still loading user profile — show nothing (App-level loader covers this)
  if (!token || !user) return null;

  // If superuser is required but user role is BASIC, redirect to admin login
  if (requireSuper && user.role !== 'SUPERUSER') {
    return <Navigate to="/admin-login" replace />;
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
      if (localStorage.getItem('trader_auth_token')) {
        await fetchMe();
        setBooting(false);
        return;
      }

      // No token → silently log in as default user (no toast, no redirect)
      try {
        const response = await authApi.login({ username: 'tail', password: 'trail123' });
        localStorage.setItem('trader_auth_token', response.token);
        // Manually set store without triggering the toast from store.login()
        useAppStore.setState({ user: response.user, token: response.token });
      } catch {
        // If silent login fails, just continue — protected routes will handle it
      } finally {
        setBooting(false);
      }
    };

    boot();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show branded loading screen until auto-login/session restore is done
  if (booting) return <AppLoader />;

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Auth pages — kept for admin use */}
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />

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
        <Route path="*" element={<Navigate to="/analyze" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;
