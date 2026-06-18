import { create } from 'zustand';
import { WatchlistItem, Alert, AgentReport, User, UserSession } from '../types';
import { watchlistApi, alertsApi, reportsApi, healthApi, authApi, analysisApi } from '../services/api';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  sessions: UserSession[];
  authLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  socialLogin: (payload: { code?: string; idToken?: string }, provider: 'google' | 'microsoft') => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  updatePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  updateUsername: (newUsername: string) => Promise<void>;
  fetchSessions: () => Promise<void>;

  // Watchlist
  watchlist: WatchlistItem[];
  watchlistLoading: boolean;
  fetchWatchlist: () => Promise<void>;
  addToWatchlist: (symbol: string) => Promise<void>;
  removeFromWatchlist: (symbol: string) => Promise<void>;

  // Alerts
  alerts: Alert[];
  alertsLoading: boolean;
  fetchAlerts: () => Promise<void>;
  createAlert: (data: any) => Promise<void>;
  updateAlert: (id: string, data: any) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;

  // Recent Reports
  recentReports: AgentReport[];
  reportsLoading: boolean;
  fetchRecentReports: () => Promise<void>;



  // Analysis state
  analyzing: boolean;
  analysisProgress: Array<{ step: string; status: string; message?: string }>;
  currentAnalysis: any | null;
  runAnalysis: (symbol: string, bypassCache?: boolean) => Promise<any>;

  // Toast notifications
  toasts: Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>;
  addToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  removeToast: (id: string) => void;

  // Feedback widget
  feedbackOpen: boolean;
  setFeedbackOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // ── Auth ─────────────────────────────────────────────────────────
  user: null,
  token: localStorage.getItem('trader_auth_token'),
  sessions: [],
  authLoading: false,

  login: async (username, password) => {
    set({ authLoading: true });
    try {
      const response = await authApi.login({ username, password });
      localStorage.setItem('trader_auth_token', response.token);
      set({ user: response.user, token: response.token });
      get().addToast('success', `Welcome back, ${response.user.username}!`);
    } catch (e) {
      get().addToast('error', `Login failed: ${e.message}`);
      throw e;
    } finally {
      set({ authLoading: false });
    }
  },

  register: async (username, password) => {
    set({ authLoading: true });
    try {
      await authApi.register({ username, password });
      get().addToast('success', 'Registration successful! Please log in.');
    } catch (e) {
      get().addToast('error', `Registration failed: ${e.message}`);
      throw e;
    } finally {
      set({ authLoading: false });
    }
  },

  socialLogin: async (payload, provider) => {
    set({ authLoading: true });
    try {
      const response = await authApi.socialLogin({ ...payload, provider });
      localStorage.setItem('trader_auth_token', response.token);
      set({ user: response.user, token: response.token });
      get().addToast('success', `Welcome, ${response.user.username}! Signed in via ${provider === 'google' ? 'Google' : 'Microsoft'}`);
    } catch (e: any) {
      get().addToast('error', `OAuth login failed: ${e.message}`);
      throw e;
    } finally {
      set({ authLoading: false });
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Silently handle
    } finally {
      localStorage.removeItem('trader_auth_token');
      set({ user: null, token: null, sessions: [] });
      get().addToast('info', 'Logged out successfully');
    }
  },

  fetchMe: async () => {
    const token = localStorage.getItem('trader_auth_token');
    if (!token) return;
    set({ authLoading: true, token });
    try {
      const user = await authApi.me();
      set({ user });
    } catch (e) {
      localStorage.removeItem('trader_auth_token');
      set({ user: null, token: null });
    } finally {
      set({ authLoading: false });
    }
  },

  updatePassword: async (oldPassword, newPassword) => {
    set({ authLoading: true });
    try {
      await authApi.updatePassword({ oldPassword, newPassword });
      get().addToast('success', 'Password updated successfully. Please log back in.');
      localStorage.removeItem('trader_auth_token');
      set({ user: null, token: null, sessions: [] });
    } catch (e) {
      get().addToast('error', `Password update failed: ${e.message}`);
      throw e;
    } finally {
      set({ authLoading: false });
    }
  },

  updateUsername: async (newUsername) => {
    set({ authLoading: true });
    try {
      const updatedUser = await authApi.updateUsername({ newUsername });
      set({ user: updatedUser });
      get().addToast('success', `Username updated to "${updatedUser.username}" ✓`);
    } catch (e) {
      get().addToast('error', `Username update failed: ${e.message}`);
      throw e;
    } finally {
      set({ authLoading: false });
    }
  },

  fetchSessions: async () => {
    try {
      const sessions = await authApi.sessions();
      set({ sessions });
    } catch (e) {
      // Silently handle
    }
  },

  // ── Watchlist ────────────────────────────────────────────────────
  watchlist: [],
  watchlistLoading: false,

  fetchWatchlist: async () => {
    set({ watchlistLoading: true });
    try {
      const data = await watchlistApi.getAll();
      set({ watchlist: data as WatchlistItem[] });
    } catch (e) {
      get().addToast('error', `Watchlist error: ${e.message}`);
    } finally {
      set({ watchlistLoading: false });
    }
  },

  addToWatchlist: async (symbol: string) => {
    try {
      await watchlistApi.add(symbol);
      await get().fetchWatchlist();
      get().addToast('success', `${symbol.toUpperCase()} added to watchlist`);
    } catch (e) {
      get().addToast('error', e.message);
    }
  },

  removeFromWatchlist: async (symbol: string) => {
    try {
      await watchlistApi.remove(symbol);
      set((state) => ({ watchlist: state.watchlist.filter((w) => w.symbol !== symbol) }));
      get().addToast('info', `${symbol} removed from watchlist`);
    } catch (e) {
      get().addToast('error', e.message);
    }
  },

  // ── Alerts ───────────────────────────────────────────────────────
  alerts: [],
  alertsLoading: false,

  fetchAlerts: async () => {
    set({ alertsLoading: true });
    try {
      const data = await alertsApi.getAll();
      set({ alerts: data as Alert[] });
    } catch (e) {
      get().addToast('error', `Alerts error: ${e.message}`);
    } finally {
      set({ alertsLoading: false });
    }
  },

  createAlert: async (data: any) => {
    try {
      await alertsApi.create(data);
      await get().fetchAlerts();
      get().addToast('success', 'Alert created');
    } catch (e) {
      get().addToast('error', e.message);
    }
  },

  updateAlert: async (id: string, data: any) => {
    try {
      await alertsApi.update(id, data);
      await get().fetchAlerts();
    } catch (e) {
      get().addToast('error', e.message);
    }
  },

  deleteAlert: async (id: string) => {
    try {
      await alertsApi.delete(id);
      set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) }));
      get().addToast('info', 'Alert deleted');
    } catch (e) {
      get().addToast('error', e.message);
    }
  },

  // ── Reports ──────────────────────────────────────────────────────
  recentReports: [],
  reportsLoading: false,

  fetchRecentReports: async () => {
    set({ reportsLoading: true });
    try {
      const data = await reportsApi.getAll({ limit: 10 });
      set({ recentReports: data as AgentReport[] });
    } catch (e) {
      // Silent — reports may not exist yet
    } finally {
      set({ reportsLoading: false });
    }
  },



  // ── Analysis ─────────────────────────────────────────────────────
  analyzing: false,
  analysisProgress: [],
  currentAnalysis: null,

  runAnalysis: async (symbol: string, bypassCache?: boolean) => {
    set({ analyzing: true, analysisProgress: [], currentAnalysis: null });

    // Simulate progress steps while waiting
    const steps = [
      'Market Data', 'Historical Data', 'Technical Analysis',
      'Fundamental Data', 'News & Events', 'Institutional Flow Proxy',
    ];

    set({ analysisProgress: steps.map((s) => ({ step: s, status: 'pending' })) });

    try {
      const result = await analysisApi.analyze(symbol, bypassCache);
      set({
        currentAnalysis: result,
        analysisProgress: result.progress || steps.map((s) => ({ step: s, status: 'done' })),
      });
      await get().fetchRecentReports();
      get().addToast('success', `Analysis complete for ${symbol} — Rating: ${result.report?.finalRating}`);
      return result;
    } catch (e) {
      get().addToast('error', `Analysis failed: ${e.message}`);
      throw e;
    } finally {
      set({ analyzing: false });
    }
  },

  // ── Toasts ───────────────────────────────────────────────────────
  toasts: [],

  addToast: (type, message) => {
    const id = Date.now().toString();
    set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => get().removeToast(id), 5000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  // ── Feedback Widget ───────────────────────────────────────────────
  feedbackOpen: false,
  setFeedbackOpen: (v) => set({ feedbackOpen: v }),
}));
