import axios from 'axios';

const apiUrL = import.meta.env.VITE_API_URL;
const hostname = window.location.hostname;

// Determine if we should use relative API path (local development, tunnels, local networks, or same-domain production proxy)
const isRelative =
  hostname === 'localhost' ||
  hostname === '127.0.0.1' ||
  hostname.endsWith('.trycloudflare.com') ||
  hostname === 'investingatti.com' ||
  hostname === 'www.investingatti.com' ||
  // Check for local network IP ranges (192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x)
  /^192\.168\./.test(hostname) ||
  /^10\./.test(hostname) ||
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
  // Check for local domains
  hostname.endsWith('.local') ||
  hostname.endsWith('.lan');

const API_BASE = isRelative
  ? '/api'
  : (apiUrL && !apiUrL.includes('backend') && !apiUrL.includes('localhost') && !apiUrL.includes('127.0.0.1'))
    ? `${apiUrL}/api`
    : '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 210000, // 210s — AI analysis pipelines can take up to ~180s (avg 95s today)
  headers: { 'Content-Type': 'application/json' },
}) as any;

// Request interceptor to append authorization token
api.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('trader_auth_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error: any) => {
  return Promise.reject(error);
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response: any) => response.data,
  async (error: any) => {
    // Log detailed response errors for clientLogger to capture
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const responseData = error.response?.data;

    console.error(`[API Error] ${method} ${url} failed with status ${status || 'Network Error'}:`, {
      status,
      url,
      method,
      responseData,
      message: error.message,
    });

    // Default 401 behavior (clearing token and redirecting)
    if (status === 401) {
      console.warn(`[Auth] Clearing token and redirecting to login page.`);
      localStorage.removeItem('trader_auth_token');
      try {
        const { useAppStore } = await import('../store/useAppStore');
        useAppStore.setState({ token: null, user: null });
      } catch {}
      if (!window.location.pathname.endsWith('/login') && !window.location.pathname.endsWith('/register')) {
        window.location.href = '/login?expired=true';
      }
    }

    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An error occurred';
    return Promise.reject(new Error(Array.isArray(message) ? message.join(', ') : message));
  },
);

// ── Health ────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
  status: () => api.get('/config/status'),
};

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  socialLogin: (data: any) => api.post('/auth/social-login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  updatePassword: (data: any) => api.post('/auth/update-password', data),
  updateUsername: (data: any) => api.post('/auth/update-username', data),
  sessions: () => api.get('/auth/sessions'),
};

// ── Analysis ──────────────────────────────────────────────────────
export const analysisApi = {
  analyze: (symbol: string, bypassCache?: boolean) => api.post('/analyze', { symbol, bypassCache }),
};

// ── Stocks ────────────────────────────────────────────────────────
export const stocksApi = {
  getLatestReport: (symbol: string) => api.get(`/stocks/${symbol}/report/latest`),
  getReports: (symbol: string) => api.get(`/stocks/${symbol}/reports`),
  getMarketData: (symbol: string) => api.get(`/stocks/${symbol}/market-data`),
  getTechnicals: (symbol: string) => api.get(`/stocks/${symbol}/technicals`),
  searchStocks: (q: string) => api.get(`/stocks/search?q=${encodeURIComponent(q)}`),
};

// ── Video Jobs ───────────────────────────────────────────────────
export const videoApi = {
  getJobStatus: (ticker: string, date: string) => api.get(`/video-jobs/ticker/${ticker}/${date}`),
  retryJob: (jobId: string) => api.post(`/video-jobs/${jobId}/retry`),
};

// ── Watchlist ─────────────────────────────────────────────────────
export const watchlistApi = {
  getAll: () => api.get('/watchlist'),
  add: (symbol: string) => api.post('/watchlist', { symbol }),
  remove: (symbol: string) => api.delete(`/watchlist/${symbol}`),
};

// ── Alerts ────────────────────────────────────────────────────────
export const alertsApi = {
  getAll: () => api.get('/alerts'),
  getEvents: (limit?: number) => api.get('/alerts/events', { params: { limit } }),
  create: (data: any) => api.post('/alerts', data),
  update: (id: string, data: any) => api.patch(`/alerts/${id}`, data),
  delete: (id: string) => api.delete(`/alerts/${id}`),
};

// ── Reports ───────────────────────────────────────────────────────
export const reportsApi = {
  getAll: (params?: { symbol?: string; rating?: string; limit?: number }) =>
    api.get('/reports', { params }),
  getById: (id: string) => api.get(`/reports/${id}`),
};



// ── Risk Settings ─────────────────────────────────────────────────
export const riskSettingsApi = {
  get: () => api.get('/risk-settings'),
  update: (data: any) => api.put('/risk-settings', data),
};

// ── Feedback ──────────────────────────────────────────────────────
export const feedbackApi = {
  submit: (data: { classification: string; summary: string }) => api.post('/feedback', data),
};

// ── Admin ─────────────────────────────────────────────────────────
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  createUser: (data: any) => api.post('/admin/users', data),
  getAnalytics: () => api.get('/admin/analytics'),
  toggleUserStatus: (id: string, isActive: boolean) => api.patch(`/admin/users/${id}/status`, { isActive }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  // Data Quality Monitor
  probeSymbol: (symbol: string) => api.get(`/admin/data-quality/probe?symbol=${encodeURIComponent(symbol)}`),
  getConsistency: () => api.get('/admin/data-quality/consistency'),
  getDataGaps: () => api.get('/admin/data-quality/gaps'),
  getFeedback: () => api.get('/admin/feedback'),
  getClientLogs: (params?: { limit?: number; level?: string }) => api.get('/client-logs/admin', { params }),
};

// ── What's for Today ──────────────────────────────────────────────
export const whatsForTodayApi = {
  getLatest: () => api.get('/whats-for-today/latest'),
  getReportDetail: (id: string) => api.get(`/whats-for-today/report/${id}`),
  getByPhase: (run: number, date?: string) => api.get(`/whats-for-today/phase/${run}`, { params: { date } }),
  getPennyStocks: (search?: string) => api.get('/whats-for-today/penny-stocks', { params: { search } }),
  triggerPennyStockScan: () => api.post('/whats-for-today/penny-stocks/scan'),
  trackInteraction: (symbol: string, action: string) => api.post('/whats-for-today/interact', { symbol, action }),
  getFeedbackLogs: () => api.get('/whats-for-today/feedback'),
  manualTrigger: (run: number, date?: string) => api.post(`/whats-for-today/trigger/${run}`, null, { params: { date } }),
};

export default api;
