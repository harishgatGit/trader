import React, { useEffect, useState, startTransition } from 'react';
// @ts-ignore
import { addTransitionType } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Search, Star, Bell, TrendingUp,
  FileText, Settings, Shield, BookOpen, AlertTriangle, Menu, X,
  Compass, Sun, Moon, LogOut, User, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { FeedbackWidget } from './FeedbackWidget';
import { ChatbotWidget } from './ChatbotWidget';

// YouTube SVG (not in lucide-react)
const YouTubeIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const pathWeights: Record<string, number> = {
  '/analyze': 0,
  '/': 1,
  '/whats-for-today': 2,
  '/penny-stocks': 3,
  '/watchlist': 4,
  '/alerts': 5,
  '/reports': 6,
  '/settings': 7,
  '/education': 8,
  '/glossary': 9,
  '/admin': 10,
};

const navItems = [
  { path: '/analyze', icon: Search, label: 'Analyze' },
  { path: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { path: '/whats-for-today', icon: TrendingUp, label: "What's for Today?" },
  { path: '/penny-stocks', icon: AlertTriangle, label: 'Micro-Cap Catalysts' },
  { path: '/watchlist', icon: Star, label: 'Watchlist' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/reports', icon: FileText, label: 'Reports' },
  { path: '/settings', icon: Settings, label: 'Settings' },
  { path: '/education', icon: BookOpen, label: 'How It Works' },
  { path: '/glossary', icon: Compass, label: 'Glossary' },
  { path: '/admin', icon: Shield, label: 'Admin Panel' },
];

const Layout: React.FC = () => {
  const { alerts, user, logout } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();
  const enabledAlerts = alerts ? alerts.filter((a) => a.enabled).length : 0;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Collapse state — persisted
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

  // Logo: serve the correct file for each theme — no CSS filter tricks needed
  const logoSrc = theme === 'dark'
    ? '/brand/logo_dark_600x160.png'
    : '/brand/logo_light_600x160.png';
  const logoClass = 'h-7 w-auto object-contain transition-all duration-200';
  const mobileLogoSrc = '/brand/logo_mobile_dark.png';

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
    return true;
  });

  const sidebarW = collapsed ? 'w-14' : 'w-52';

  // Tooltip for collapsed state
  const Tip = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="relative group/tip flex items-center">
      {children}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2 z-50 px-2 py-1 rounded-lg bg-white text-slate-800 text-xs font-semibold whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 shadow-xl border border-slate-200">
          {label}
        </div>
      )}
    </div>
  );

  const SidebarContent = () => (
    <>
      {/* Logo + collapse toggle — theme-aware */}
      <div className={`flex items-center shrink-0 border-b
        ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}
        ${collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-3'}`}>
        {!collapsed && (
          <div className="flex flex-col gap-0.5">
            <img
              src={logoSrc}
              alt="InvestingAtti"
              className={logoClass}
            />
            <span className={`text-[9px] tracking-wide pl-0.5 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              <strong className="font-black">US</strong> Markets Only
            </span>
          </div>
        )}
        {collapsed && (
          <img src="/brand/icon_256.png" alt="IA" className="w-7 h-7 object-contain" />
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={`hidden md:flex p-1 rounded-lg transition-colors shrink-0
            ${theme === 'light' ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-100' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-850'}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 rounded-lg hover:bg-slate-850 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* User profile card */}
      <div className={`border-b border-slate-850 shrink-0 ${collapsed ? 'px-1.5 py-2' : 'px-2 py-2'}`}>
        <button
          onClick={() => navigate('/profile')}
          className={`w-full flex items-center rounded-xl hover:bg-slate-850/60 transition-all group ${collapsed ? 'justify-center p-1.5' : 'gap-2.5 px-2 py-1.5'}`}
          title={collapsed ? user?.username || 'Profile' : undefined}
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-[11px] font-black text-white select-none">
              {user?.username?.slice(0, 2).toUpperCase() || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-bold text-slate-100 truncate leading-tight">{user?.username || 'User'}</p>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${user?.role === 'SUPERUSER'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                  : 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                }`}>
                {user?.role === 'SUPERUSER' ? '⚡ SUPER' : '● BASIC'}
              </span>
            </div>
          )}
          {!collapsed && <User className="w-3 h-3 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
        {!collapsed && <div className="section-title px-2 pt-1 text-[10px]">Navigation</div>}
        {filteredNavItems.map((item) => (
          <Tip key={item.path} label={item.label}>
            <NavLink
              to={item.path}
              end={item.exact}
              onClick={(e) => {
                e.preventDefault();
                const currentIdx = pathWeights[location.pathname] ?? -1;
                const targetIdx = pathWeights[item.path] ?? -1;
                // @ts-ignore
                startTransition(() => {
                  // @ts-ignore
                  if (targetIdx > currentIdx) addTransitionType('nav-forward');
                  // @ts-ignore
                  else if (targetIdx < currentIdx) addTransitionType('nav-back');
                  navigate(item.path);
                });
              }}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-xs font-semibold transition-all duration-150 w-full
                 ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'}
                 ${isActive
                  ? 'bg-brand-500/10 text-brand-500 dark:text-brand-400 border border-brand-500/20'
                  : 'text-slate-450 hover:text-slate-100 hover:bg-slate-850/60'
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.label === 'Alerts' && enabledAlerts > 0 && (
                <span className="ml-auto text-[9px] bg-brand-500/20 text-brand-700 dark:text-brand-300 border border-brand-500/30 px-1.5 py-0.5 rounded-full font-bold">
                  {enabledAlerts}
                </span>
              )}
              {collapsed && item.label === 'Alerts' && enabledAlerts > 0 && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
              )}
            </NavLink>
          </Tip>
        ))}
      </nav>

      {/* Bottom controls */}
      <div className={`border-t border-slate-850 py-1.5 px-1.5 flex flex-col gap-0.5 shrink-0`}>
        {/* Theme toggle */}
        <Tip label={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className={`w-full flex items-center rounded-lg transition-colors duration-150 hover:bg-slate-850/60
              ${collapsed ? 'justify-center p-2' : 'px-2.5 py-2 gap-2.5'}`}
          >
            {/* Icon */}
            <span className="shrink-0 flex items-center justify-center w-4 h-4">
              {theme === 'light'
                ? <Sun className="w-3.5 h-3.5 text-amber-500" />
                : <Moon className="w-3.5 h-3.5 text-indigo-400" />
              }
            </span>

            {/* Label + pill — only when expanded */}
            {!collapsed && (
              <>
                <span className="flex-1 text-left text-xs font-semibold text-slate-450 leading-none">
                  {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                </span>
                {/* Pill switch */}
                <span
                  className={`relative inline-flex shrink-0 items-center w-8 h-[18px] rounded-full transition-colors duration-200
                    ${theme === 'dark' ? 'bg-indigo-500' : 'bg-amber-400'}`}
                >
                  <span
                    className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-transform duration-200
                      ${theme === 'dark' ? 'translate-x-[14px]' : 'translate-x-0'}`}
                  />
                </span>
              </>
            )}
          </button>
        </Tip>

        {/* YouTube */}
        <Tip label="YouTube Channel">
          <a
            href="https://www.youtube.com/@InvestingAtti"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center w-full rounded-lg text-xs font-semibold text-red-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150
              ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'}`}
          >
            <YouTubeIcon className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>YouTube</span>}
          </a>
        </Tip>

        {/* Log Out */}
        <Tip label="Log Out">
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            className={`flex items-center w-full rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-400 hover:bg-rose-500/5 transition-all duration-150
              ${collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'}`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </Tip>
      </div>
    </>
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-950 transition-colors duration-200">
      {/* Mobile Top Header */}
      <header
        style={{ viewTransitionName: 'site-header' }}
        className="md:hidden flex items-center justify-between px-4 py-2.5 bg-surface-900 border-b border-slate-850 shrink-0 z-20 animate-fade-in transition-colors duration-200"
      >
        <img
          src={mobileLogoSrc}
          alt="InvestingAtti"
          className={logoClass}
        />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-xl hover:bg-slate-850 text-slate-450 focus:outline-none transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-20 transition-opacity duration-300 animate-fade-in"
          />
        )}

        {/* Sidebar */}
        <aside
          style={{ viewTransitionName: 'site-sidebar' }}
          className={`
            ${sidebarW} flex-shrink-0 bg-surface-900 border-r border-slate-850 flex flex-col
            fixed md:static inset-y-0 left-0 z-30
            transition-all duration-200 ease-in-out
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto flex flex-col justify-between">
          <div className="flex-1">
            <Outlet />
          </div>
          {/* Disclaimer */}
          <footer
            style={{ viewTransitionName: 'site-disclaimer' }}
            className="bg-slate-950 border-t border-slate-850 py-2 px-4 text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-2 z-10 shrink-0"
          >
            <AlertTriangle className="w-3 h-3 text-amber-500/80 shrink-0" />
            <span>
              <strong>Disclaimer:</strong> Educational and informational purposes only. Not financial advice. Past performance is not indicative of future results.
            </span>
          </footer>
        </main>

        {/* Floating widgets — right side */}
        <FeedbackWidget />
        <ChatbotWidget />
      </div>
    </div>
  );
};

export default Layout;
