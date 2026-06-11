import React, { useEffect, useState, startTransition } from 'react';
// @ts-ignore
import { addTransitionType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, Star, Bell, TrendingUp,
  FileText, Settings, Activity, Shield, BookOpen, AlertTriangle, Menu, X, Compass, Sun, Moon
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { FeedbackWidget } from './FeedbackWidget';

const pathWeights: Record<string, number> = {
  '/': 0,
  '/whats-for-today': 1,
  '/penny-stocks': 2,
  '/analyze': 3,
  '/watchlist': 4,
  '/alerts': 5,
  '/reports': 6,
  '/settings': 7,
  '/education': 8,
  '/glossary': 9,
  '/admin': 10,
};

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/whats-for-today', icon: TrendingUp, label: "What's for Today?" },
  { path: '/penny-stocks', icon: AlertTriangle, label: 'Micro-Cap Catalysts' },
  { path: '/analyze', icon: Search, label: 'Analyze' },
  { path: '/watchlist', icon: Star, label: 'Watchlist' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/education', icon: BookOpen, label: 'How It Works & Cheat Sheet' },
  { path: '/glossary', icon: Compass, label: 'Glossary & Terminology' },
  { path: '/admin', icon: Shield, label: 'Admin Panel' },
];

const Layout: React.FC = () => {
  const { apiHealth, checkHealth, alerts, user } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const enabledAlerts = alerts ? alerts.filter((a) => a.enabled).length : 0;
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    checkHealth();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auto-close sidebar on mobile when route navigation changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const statusColor = apiHealth === 'ok' ? 'bg-emerald-500' : apiHealth === 'degraded' ? 'bg-amber-500' : 'bg-slate-500';

  const filteredNavItems = navItems.filter((item) => {
    if (user?.role === 'BASIC') {
      return (
        item.path === '/whats-for-today' ||
        item.path === '/penny-stocks' ||
        item.path === '/analyze' ||
        item.path === '/education' ||
        item.path === '/glossary'
      );
    }
    return true; // SUPERUSER has access to everything
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-950 transition-colors duration-200">
      {/* Mobile Top Header */}
      <header
        style={{ viewTransitionName: 'site-header' }}
        className="md:hidden flex items-center justify-between px-4 py-2.5 bg-surface-900 border-b border-slate-850 shrink-0 z-20 animate-fade-in transition-colors duration-200"
      >
        <img
          src="/brand/logo_mobile_dark.png"
          alt="InvestingAtti"
          className="h-8 w-auto object-contain dark:invert-0 invert transition-all duration-200"
        />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-xl hover:bg-slate-850 text-slate-450 focus:outline-none transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Backdrop overlay */}
        {isOpen && (
          <div
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-20 transition-opacity duration-300 animate-fade-in"
          />
        )}

        {/* Sidebar */}
        <aside
          style={{ viewTransitionName: 'site-sidebar' }}
          className={`
            w-60 flex-shrink-0 bg-surface-900 border-r border-slate-850 flex flex-col
            fixed md:static inset-y-0 left-0 z-30 transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            transition-colors duration-200
          `}
        >
          {/* Logo with Close button on Mobile */}
          <div className="p-4 border-b border-slate-850 flex items-center justify-between">
            <img
              src="/brand/logo_dark_600x160.png"
              alt="InvestingAtti"
              className="h-9 w-auto object-contain dark:invert-0 invert transition-all duration-200"
            />
            <button
              onClick={() => setIsOpen(false)}
              className="md:hidden p-1.5 rounded-xl hover:bg-slate-850 text-slate-500 hover:text-slate-450 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            <div className="section-title px-3 pt-2">Navigation</div>
            {filteredNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                onClick={(e) => {
                  e.preventDefault();
                  const currentIdx = pathWeights[location.pathname] ?? -1;
                  const targetIdx = pathWeights[item.path] ?? -1;

                  // @ts-ignore
                  startTransition(() => {
                    // @ts-ignore
                    if (targetIdx > currentIdx) {
                      // @ts-ignore
                      addTransitionType('nav-forward');
                    } else if (targetIdx < currentIdx) {
                      // @ts-ignore
                      addTransitionType('nav-back');
                    }
                    navigate(item.path);
                  });
                }}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.label === 'Alerts' && enabledAlerts > 0 && (
                  <span className="ml-auto text-[10px] bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded-full font-bold">
                    {enabledAlerts}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Theme & Health status Section */}
          <div className="p-3 border-t border-slate-850 flex flex-col gap-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm font-semibold text-slate-450 hover:text-slate-100 hover:bg-slate-850/50 transition-all duration-150 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'light' ? (
                  <Sun className="w-4.5 h-4.5 text-amber-500 animate-pulse-slow" />
                ) : (
                  <Moon className="w-4.5 h-4.5 text-indigo-400" />
                )}
                <span>{theme === 'light' ? 'Light Theme' : 'Dark Theme'}</span>
              </div>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-lg bg-slate-850 text-slate-450 border border-slate-800">
                Switch
              </span>
            </button>

            <div className="flex items-center justify-between px-1 mt-1">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500">System</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusColor} ${apiHealth === 'ok' ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-semibold ${apiHealth === 'ok' ? 'text-emerald-500' : apiHealth === 'degraded' ? 'text-amber-500' : 'text-slate-500'}`}>
                  {apiHealth === 'ok' ? 'Online' : apiHealth === 'degraded' ? 'Degraded' : 'Checking...'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <FeedbackWidget />
      </div>

      {/* Bottom Disclaimer Banner */}
      <footer
        style={{ viewTransitionName: 'site-disclaimer' }}
        className="bg-slate-950 border-t border-slate-850 py-2.5 px-4 text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-2 z-10 shrink-0"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
        <span>
          <strong>Disclaimer:</strong> This application is for educational and informational purposes only. All data is aggregated and orchestrated from third-party sources; we do not guarantee its accuracy, completeness, or timeliness. We are not registered financial advisors and do not provide investment, financial, or tax advice. Trading stocks involves substantial risk, and you are solely responsible for any financial decisions and losses incurred. Past performance is not indicative of future results.
        </span>
      </footer>
    </div>
  );
};

export default Layout;
