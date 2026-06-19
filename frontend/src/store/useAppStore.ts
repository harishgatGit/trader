import { create } from 'zustand';
import { WatchlistItem, Alert, AgentReport, User, UserSession } from '../types';
import { watchlistApi, alertsApi, reportsApi, healthApi, authApi, analysisApi, stocksApi } from '../services/api';

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
  activeSymbol: string;          // symbol currently being analyzed (survives navigation)
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
  activeSymbol: '',
  analysisProgress: [],
  currentAnalysis: null,

  runAnalysis: async (symbol: string, bypassCache?: boolean) => {
    const cleanSymbol = symbol.toUpperCase().trim();
    set({ analyzing: true, activeSymbol: cleanSymbol, analysisProgress: [], currentAnalysis: null });

    const STEPS = [
      'Market Data', 'Historical Data', 'Technical Analysis',
      'Fundamental Data', 'News & Events', 'Institutional Flow Proxy',
      'AI Synthesis',
    ];
    set({ analysisProgress: STEPS.map((s) => ({ step: s, status: 'pending' })) });

    const POLL_INTERVAL = 4000;           // 4 s between polls
    const MAX_WAIT_MS   = 8 * 60 * 1000; // 8 min hard cap
    const SLOW_WARN_MS  = 60 * 1000;     // 60s → "still generating" toast
    const VERY_SLOW_MS  = 90 * 1000;     // 90s → in-page amber banner

    const started = Date.now();
    let slowToastFired = false;
    let verySlowFired  = false;

    try {
      // ── Step 1: POST /analyze — returns { jobId } in < 1s ─────────────────
      const enqueueResp = await analysisApi.enqueue(cleanSymbol, bypassCache);

      // Detect old synchronous backend: if the response already contains a
      // finalRating, the old backend returned the full report synchronously.
      if (enqueueResp?.report?.finalRating || enqueueResp?.analysisReport?.finalRating) {
        set({
          currentAnalysis: enqueueResp,
          analysisProgress: enqueueResp.progress || STEPS.map((s) => ({ step: s, status: 'done' })),
        });
        await get().fetchRecentReports();
        get().addToast('success', `Analysis complete for ${cleanSymbol} — Rating: ${enqueueResp?.report?.finalRating}`);
        return enqueueResp;
      }

      const jobId: string | undefined = enqueueResp?.jobId;

      // ── Step 2: Poll until done ────────────────────────────────────────────
      // PRIMARY:  GET /analyze/status/:jobId   (new backend — in-memory job store)
      // FALLBACK: GET /stocks/:symbol/report/latest  (works on ALL backend versions)
      //
      // We start with the primary. The first time it returns 404 we switch to
      // fallback mode and never try the primary again.
      let useFallback = !jobId; // if no jobId was returned, go straight to fallback
      const reportCreatedAfter = new Date(started - 5000); // allow ±5s clock skew

      const result = await new Promise<any>((resolve, reject) => {
        const interval = setInterval(async () => {
          try {
            const elapsed = Date.now() - started;

            // ── Hard timeout ─────────────────────────────────────────────────
            if (elapsed > MAX_WAIT_MS) {
              clearInterval(interval);
              reject(new Error('Analysis timed out after 8 minutes. Please try again.'));
              return;
            }

            // ── User-facing slow warnings ─────────────────────────────────────
            if (!slowToastFired && elapsed > SLOW_WARN_MS) {
              slowToastFired = true;
              get().addToast('info' as any,
                `⏳ ${cleanSymbol} report is still generating — deep analysis can take up to 3 minutes.`);
            }
            if (!verySlowFired && elapsed > VERY_SLOW_MS) {
              verySlowFired = true;
              set((state) => ({
                analysisProgress: state.analysisProgress.map((p) =>
                  p.status === 'pending' ? { ...p, status: 'running', message: 'Deep analysis in progress…' } : p
                ),
              }));
            }

            // ── PRIMARY: poll job status endpoint ─────────────────────────────
            if (!useFallback && jobId) {
              try {
                const job = await analysisApi.pollStatus(jobId);
                if (job.progress?.length) set({ analysisProgress: job.progress });

                if (job.status === 'done') { clearInterval(interval); resolve(job.result); return; }
                if (job.status === 'error') { clearInterval(interval); reject(new Error(job.error || 'Analysis failed')); return; }
                // queued | running → keep polling
                return;
              } catch (statusErr: any) {
                // 404 = endpoint not deployed yet → fall back permanently
                const is404 = statusErr?.response?.status === 404 || statusErr?.status === 404;
                if (is404) {
                  console.warn('[analyze] /analyze/status/:jobId not found — switching to report-poll fallback');
                  useFallback = true;
                } else {
                  // Transient error (network, 5xx) — skip tick, retry next time
                  console.warn('[analyze] poll tick error (will retry):', statusErr?.message);
                  return;
                }
              }
            }

            // ── FALLBACK: poll /stocks/:symbol/report/latest ──────────────────
            // The background job saves to DB when done; we detect a new report
            // by checking that createdAt is after we started this analysis.
            try {
              const latest = await stocksApi.getLatestReport(cleanSymbol);
              if (latest && new Date(latest.createdAt) >= reportCreatedAfter) {
                // New report found in DB — reconstruct the result shape
                const syntheticResult = {
                  symbol: cleanSymbol,
                  report: { ...(latest.reportJson ?? latest), id: latest.id, createdAt: latest.createdAt },
                  analysisReport: { ...(latest.reportJson ?? latest), id: latest.id, createdAt: latest.createdAt },
                  progress: STEPS.map((s) => ({ step: s, status: 'done' })),
                };
                clearInterval(interval);
                resolve(syntheticResult);
              }
              // else: report not ready yet → keep polling
            } catch (latestErr: any) {
              // 404 = no report yet → keep waiting
              if (latestErr?.response?.status !== 404) {
                console.warn('[analyze] fallback poll error (will retry):', latestErr?.message);
              }
            }

          } catch (outerErr: any) {
            console.warn('[analyze] unexpected poll error (will retry):', outerErr?.message);
          }
        }, POLL_INTERVAL);
      });

      set({
        currentAnalysis: result,
        analysisProgress: result?.progress || STEPS.map((s) => ({ step: s, status: 'done' })),
      });
      await get().fetchRecentReports();
      get().addToast('success', `Analysis complete for ${cleanSymbol} — Rating: ${result?.report?.finalRating}`);
      return result;

    } catch (e: any) {
      get().addToast('error', `Analysis failed: ${e.message}`);
      throw e;
    } finally {
      set({ analyzing: false, activeSymbol: '' });
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
