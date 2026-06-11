import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../services/api';
import { LoadingSpinner } from '../components/ui';
import { 
  Users, BarChart3, UserPlus, Search, Building2, Calendar, 
  Shield, CheckCircle, AlertCircle, RefreshCw, TrendingUp,
  Activity, Wifi, WifiOff, Zap, Database, AlertTriangle,
  ChevronRight, Info, MessageSquare
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────

interface FieldStatus {
  field: string;
  status: 'OK' | 'NULL' | 'ERROR' | 'EMPTY';
  value?: string | null;
  note?: string;
}

interface ProbeResult {
  symbol: string;
  probedAt: string;
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  healthScore: number;
  snapshot: {
    available: boolean;
    httpStatus?: number;
    error?: string;
    fields: FieldStatus[];
  };
  bars: Record<string, {
    feed: 'iex' | 'sip' | 'none';
    barCount: number;
    available: boolean;
    firstBar?: string;
    lastBar?: string;
    error?: string;
  }>;
  news: { available: boolean; articleCount: number; error?: string };
  diagnosis: string[];
}

interface ConsistencyStats {
  totalAnalyses: number;
  analyzedSymbols: number;
  missingPricePct: number;
  missingPriceCount: number;
  missingVolumePct: number;
  missingVolumeCount: number;
  insufficientDataPct: number;
  insufficientDataCount: number;
  lowDataPct: number;
  lowDataCount: number;
  noSnapshotPct: number;
  noSnapshotCount: number;
  noBarsPct: number;
  noBarsCount: number;
  topFailingSymbols: Array<{ symbol: string; failCount: number; lastFailed: string }>;
}

interface DataGapEntry {
  symbol: string;
  reportId: string;
  analyzedAt: string;
  dataQualityRating: string;
  priceAvailable: boolean;
  volumeAvailable: boolean;
  snapshotAvailable: boolean;
  barsAvailable: boolean;
  newsAvailable: boolean;
  missingFields: string[];
  finalRating: string;
}

// ── Health Badge ───────────────────────────────────────────────────────────

const HealthBadge: React.FC<{ health: string; score?: number }> = ({ health, score }) => {
  const cfg = {
    HEALTHY: { cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
    DEGRADED: { cls: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertTriangle },
    UNAVAILABLE: { cls: 'bg-red-500/10 text-red-400 border-red-500/30', icon: WifiOff },
  }[health] || { cls: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: Info };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${cfg.cls}`}>
      <Icon className="w-3.5 h-3.5" />
      {health}{score != null ? ` (${score}/100)` : ''}
    </span>
  );
};

const FieldBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = {
    OK: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    NULL: 'bg-red-500/10 text-red-400 border-red-500/20',
    ERROR: 'bg-red-500/10 text-red-400 border-red-500/20',
    EMPTY: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg}`}>{status}</span>
  );
};

const FeedBadge: React.FC<{ feed: string }> = ({ feed }) => {
  const cfg = {
    iex: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    sip: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    none: 'bg-red-500/10 text-red-400 border-red-500/20',
  }[feed] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${cfg}`}>{feed}</span>
  );
};

const BoolCell: React.FC<{ value: boolean }> = ({ value }) =>
  value
    ? <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
    : <AlertCircle className="w-4 h-4 text-red-400 mx-auto" />;

const QualityBadge: React.FC<{ rating: string }> = ({ rating }) => {
  const cfg: Record<string, string> = {
    HIGH: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    LOW: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    INSUFFICIENT: 'bg-red-500/10 text-red-400 border-red-500/20',
    UNKNOWN: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg[rating] || cfg.UNKNOWN}`}>
      {rating}
    </span>
  );
};

// ── Main Component ─────────────────────────────────────────────────────────

const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'data-quality' | 'feedback' | 'client-logs'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<string>('All');

  // Client logs state
  const [clientLogs, setClientLogs] = useState<any[]>([]);
  const [loadingClientLogs, setLoadingClientLogs] = useState(false);
  const [clientLogLevelFilter, setClientLogLevelFilter] = useState<string>('All');
  const [clientLogSearch, setClientLogSearch] = useState<string>('');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  const fetchClientLogs = async () => {
    setLoadingClientLogs(true);
    try {
      const levelParam = clientLogLevelFilter !== 'All' ? clientLogLevelFilter.toLowerCase() : undefined;
      const data = await adminApi.getClientLogs({ level: levelParam });
      setClientLogs(data);
    } catch (e: any) {
      console.error('Failed to fetch client logs', e);
    } finally {
      setLoadingClientLogs(false);
    }
  };

  // DQ state
  const [dqProbeSymbol, setDqProbeSymbol] = useState('');
  const [probing, setProbing] = useState(false);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probeError, setProbeError] = useState('');
  const [consistency, setConsistency] = useState<ConsistencyStats | null>(null);
  const [loadingConsistency, setLoadingConsistency] = useState(false);
  const [dataGaps, setDataGaps] = useState<DataGapEntry[]>([]);
  const [loadingGaps, setLoadingGaps] = useState(false);

  // Loading states
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ipFilter, setIpFilter] = useState('');

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BASIC' | 'SUPERUSER'>('BASIC');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === 'data-quality' && !consistency) {
      fetchConsistency();
      fetchDataGaps();
    }
    if (activeTab === 'feedback') {
      fetchFeedback();
    }
    if (activeTab === 'client-logs') {
      fetchClientLogs();
    }
  }, [activeTab, clientLogLevelFilter]);

  const fetchFeedback = async () => {
    setLoadingFeedback(true);
    try {
      const data = await adminApi.getFeedback();
      setFeedback(data);
    } catch (e: any) {
      console.error('Failed to fetch feedback', e);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await adminApi.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const data = await adminApi.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchConsistency = async () => {
    setLoadingConsistency(true);
    try {
      const data = await adminApi.getConsistency();
      setConsistency(data);
    } catch (err) {
      console.error('Failed to fetch consistency:', err);
    } finally {
      setLoadingConsistency(false);
    }
  };

  const fetchDataGaps = async () => {
    setLoadingGaps(true);
    try {
      const data = await adminApi.getDataGaps();
      setDataGaps(data);
    } catch (err) {
      console.error('Failed to fetch data gaps:', err);
    } finally {
      setLoadingGaps(false);
    }
  };

  const handleRefreshAnalytics = async () => {
    setRefreshing(true);
    try {
      const data = await adminApi.getAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to refresh analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleProbe = async (e: React.FormEvent) => {
    e.preventDefault();
    const sym = dqProbeSymbol.trim().toUpperCase();
    if (!sym) return;
    setProbing(true);
    setProbeResult(null);
    setProbeError('');
    try {
      const data = await adminApi.probeSymbol(sym);
      setProbeResult(data);
    } catch (err: any) {
      setProbeError(err.message || 'Probe failed');
    } finally {
      setProbing(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (username.length < 3) { setErrorMsg('Username must be at least 3 characters'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      const newUser = await adminApi.createUser({ username, password, role });
      setSuccessMsg(`User '${newUser.username}' created successfully!`);
      setUsername(''); setPassword(''); setRole('BASIC');
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFeedback = feedback.filter((item) => {
    if (feedbackFilter === 'All') return true;
    return item.classification === feedbackFilter;
  });

  const TABS = [
    { id: 'users', label: 'User Manager', icon: Users },
    { id: 'analytics', label: 'Search Analytics', icon: BarChart3 },
    { id: 'data-quality', label: 'Data Quality', icon: Activity },
    { id: 'feedback', label: 'User Feedback', icon: MessageSquare },
    { id: 'client-logs', label: 'UI System Logs', icon: Database },
  ] as const;

  return (
    <div className="p-6 space-y-6 fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-500/15 border border-brand-500/30 text-brand-400 flex items-center justify-center shadow-lg shadow-brand-950/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Superuser Admin Panel</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage accounts, monitor activity & data quality</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800/80 flex-wrap gap-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              id={`admin-tab-${id}`}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === id
                  ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20 shadow-sm shadow-brand-900/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Users Tab ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create User Form */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg h-fit">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <UserPlus className="w-4 h-4 text-brand-400" />
              Add System Account
            </h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" /><span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg">
                  <CheckCircle className="w-4 h-4 shrink-0" /><span>{successMsg}</span>
                </div>
              )}
              <div>
                <label className="label">Username</label>
                <input type="text" required placeholder="e.g. harish2" value={username}
                  onChange={(e) => setUsername(e.target.value)} className="input text-xs" />
              </div>
              <div>
                <label className="label">Password</label>
                <input type="password" required placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} className="input text-xs" />
              </div>
              <div>
                <label className="label">System Role</label>
                <select value={role} onChange={(e: any) => setRole(e.target.value)}
                  className="input text-xs cursor-pointer bg-slate-950">
                  <option value="BASIC">Standard User (BASIC)</option>
                  <option value="SUPERUSER">Administrator (SUPERUSER)</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full text-xs font-semibold">
                {submitting ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <Users className="w-4 h-4 text-brand-400" />
              Registered System Accounts
            </h2>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-12"><LoadingSpinner size="md" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Username</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Created Date</th>
                      <th className="py-2.5 px-3 text-right">Total Searches</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-200">{u.username}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'SUPERUSER'
                              ? 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          }`}>{u.role}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-350">{u._count?.searchLogs || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Analytics Tab ─────────────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total Searches Logged', value: analytics?.totalSearches ?? 0, icon: Search, color: 'text-brand-400 bg-brand-500/10 border-brand-500/20' },
              { label: 'Top Searched Symbol', value: analytics?.topSymbols?.[0]?.symbol ?? 'N/A', icon: TrendingUp, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
              { label: 'Top Searched Sector', value: analytics?.topSectors?.[0]?.sector ?? 'N/A', icon: Building2, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
              { label: 'Most Active IP', value: analytics?.topIps?.[0]?.ip ? `${analytics.topIps[0].ip} (${analytics.topIps[0].city})` : 'N/A', icon: Activity, color: 'text-pink-400 bg-pink-500/10 border-pink-500/20' },
              { label: 'Unique IPs Active', value: analytics?.topIps?.length ?? 0, icon: Users, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
            ].map((m, idx) => (
              <div key={idx} className="card p-4 flex items-center justify-between border border-slate-800/80">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</span>
                  <div className="text-sm font-extrabold text-slate-100 font-mono leading-none truncate max-w-[130px]">{m.value}</div>
                </div>
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${m.color}`}>
                  <m.icon className="w-4.5 h-4.5" />
                </div>
              </div>
            ))}
          </div>

          {/* Daily Search Volume */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-400" />
                Daily Search Volume (Last 7 Days)
              </h2>
              <button onClick={handleRefreshAnalytics} disabled={refreshing} className="btn-ghost text-xs p-1">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-20"><LoadingSpinner size="md" /></div>
            ) : analytics && analytics.dailyStats.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00d4aa" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#00d4aa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false}
                      tickFormatter={(str) => { const p = str.split('-'); return `${p[1]}/${p[2]}`; }} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: '#00d4aa', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="count" name="Searches" stroke="#00d4aa" strokeWidth={2}
                      fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-slate-500">No search volume data logged yet.</div>
            )}
          </div>

          {/* Top Searches / Sectors / IP Traffic */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />Most Popular Tickers Search
              </h3>
              {loadingAnalytics ? <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
                : analytics && analytics.topSymbols.length > 0 ? (
                  <div className="space-y-3.5">
                    {analytics.topSymbols.map((item: any, idx: number) => {
                      const pct = analytics.topSymbols[0].count > 0 ? (item.count / analytics.topSymbols[0].count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="font-semibold text-slate-200">{item.symbol}</span>
                            <span className="text-slate-400">{item.count} searches</span>
                          </div>
                          <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-slate-800/50">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="text-center py-12 text-xs text-slate-500">No ticker searches recorded.</div>}
            </div>

            <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-400" />Most Popular Sectors
              </h3>
              {loadingAnalytics ? <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
                : analytics && analytics.topSectors.length > 0 ? (
                  <div className="space-y-3.5">
                    {analytics.topSectors.map((item: any, idx: number) => {
                      const pct = analytics.topSectors[0].count > 0 ? (item.count / analytics.topSectors[0].count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-sans">
                            <span className="font-semibold text-slate-200 truncate pr-2">{item.sector}</span>
                            <span className="text-slate-400 font-mono shrink-0">{item.count} searches</span>
                          </div>
                          <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-slate-800/50">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="text-center py-12 text-xs text-slate-500">No sector searches recorded.</div>}
            </div>

            <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-pink-400" />Top IP Traffic Monitor
              </h3>
              {loadingAnalytics ? <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
                : analytics && analytics.topIps && analytics.topIps.length > 0 ? (
                  <div className="space-y-3.5">
                    {analytics.topIps.map((item: any, idx: number) => {
                      const pct = analytics.topIps[0].count > 0 ? (item.count / analytics.topIps[0].count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-sans">
                            <span className="text-slate-400 text-[10px] truncate max-w-[120px] font-sans" title={`${item.city}, ${item.state}`}>
                              {item.city}, {item.state}
                            </span>
                            <span 
                              className="font-mono font-semibold text-slate-200 hover:text-brand-400 cursor-pointer transition-colors" 
                              onClick={() => setIpFilter(item.ip)}
                              title="Click to filter audit logs by this IP"
                            >
                              {item.ip}
                            </span>
                            <span className="text-slate-400 shrink-0 font-sans text-[10px]">{item.count} searches</span>
                          </div>
                          <div className="w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
                            <div className="bg-pink-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="text-center py-12 text-xs text-slate-500">No IP logs recorded.</div>}
            </div>
          </div>

          {/* Audit Logs */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800/60 pb-3">
              <h3 className="text-sm font-semibold text-slate-200">Detailed Search Audit Logs</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter by IP, Ticker, Location, User…"
                    value={ipFilter}
                    onChange={(e) => setIpFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-850 hover:border-slate-800 focus:border-brand-500/85 outline-none rounded-lg py-1 pl-8 pr-3 text-xs w-64 text-slate-250 transition-colors"
                  />
                  {ipFilter && (
                    <button 
                      onClick={() => setIpFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-[10px] font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadingAnalytics ? <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
              : analytics && analytics.recentSearches.length > 0 ? (
                (() => {
                  const filtered = analytics.recentSearches.filter((log: any) => {
                    if (!ipFilter) return true;
                    const query = ipFilter.toLowerCase();
                    return (
                      log.ipAddress?.toLowerCase().includes(query) ||
                      log.city?.toLowerCase().includes(query) ||
                      log.state?.toLowerCase().includes(query) ||
                      log.username?.toLowerCase().includes(query) ||
                      log.symbol?.toLowerCase().includes(query)
                    );
                  });

                  if (filtered.length === 0) {
                    return <div className="text-center py-12 text-slate-500 text-xs">No logs match your filter query.</div>;
                  }

                  return (
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800/80 text-slate-500 font-semibold sticky top-0 bg-slate-950/90 backdrop-blur z-10">
                            <th className="py-2.5 px-3">Username</th>
                            <th className="py-2.5 px-3">Ticker</th>
                            <th className="py-2.5 px-3">Sector</th>
                            <th className="py-2.5 px-3">IP Address</th>
                            <th className="py-2.5 px-3">Location (City, State)</th>
                            <th className="py-2.5 px-3 text-right">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                          {filtered.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-200">{log.username}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-brand-400">{log.symbol}</td>
                              <td className="py-2.5 px-3 text-slate-400">{log.sector}</td>
                              <td className="py-2.5 px-3 font-mono text-pink-400/90">{log.ipAddress || 'Unknown'}</td>
                              <td className="py-2.5 px-3 text-slate-350">{log.city && log.state ? `${log.city}, ${log.state}` : 'Unknown'}</td>
                              <td className="py-2.5 px-3 text-right text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              ) : <div className="text-center py-12 text-slate-500 text-xs">No audit logs available.</div>}
          </div>
        </div>
      )}

      {/* ── Data Quality Monitor Tab ───────────────────────────────── */}
      {activeTab === 'data-quality' && (
        <div className="space-y-6">

          {/* Consistency Overview Cards */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
            <div className="flex items-center justify-between mb-5 border-b border-slate-800/60 pb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-400" />
                Historical Data Consistency — Last 500 Analyses
              </h2>
              <button onClick={() => { fetchConsistency(); fetchDataGaps(); }} className="btn-ghost text-xs p-1" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingConsistency ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner size="md" /></div>
            ) : consistency ? (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: 'Total Analyses', value: consistency.totalAnalyses, sub: `${consistency.analyzedSymbols} unique symbols`, color: 'text-brand-400', bg: 'bg-brand-500/10 border-brand-500/20' },
                    { label: 'Missing Price', value: `${consistency.missingPricePct}%`, sub: `${consistency.missingPriceCount} analyses`, color: consistency.missingPricePct > 10 ? 'text-red-400' : 'text-emerald-400', bg: consistency.missingPricePct > 10 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'Insufficient Data', value: `${consistency.insufficientDataPct}%`, sub: `${consistency.insufficientDataCount} analyses`, color: consistency.insufficientDataPct > 5 ? 'text-red-400' : 'text-emerald-400', bg: consistency.insufficientDataPct > 5 ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20' },
                    { label: 'No Bars (Any TF)', value: `${consistency.noBarsPct}%`, sub: `${consistency.noBarsCount} analyses`, color: consistency.noBarsPct > 10 ? 'text-amber-400' : 'text-emerald-400', bg: consistency.noBarsPct > 10 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20' },
                  ].map((m, idx) => (
                    <div key={idx} className={`rounded-xl border p-4 ${m.bg}`}>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{m.label}</div>
                      <div className={`text-xl font-extrabold font-mono ${m.color}`}>{m.value}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* More metric pills */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Missing Volume', value: `${consistency.missingVolumePct}%`, count: consistency.missingVolumeCount },
                    { label: 'No Snapshot', value: `${consistency.noSnapshotPct}%`, count: consistency.noSnapshotCount },
                    { label: 'Low Data Quality', value: `${consistency.lowDataPct}%`, count: consistency.lowDataCount },
                  ].map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-900/60 border border-slate-800/60 rounded-lg p-3">
                      <span className="text-xs text-slate-400">{m.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-slate-200">{m.value}</span>
                        <span className="text-[10px] text-slate-500 ml-1">({m.count})</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top failing symbols */}
                {consistency.topFailingSymbols.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Top Problematic Symbols
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {consistency.topFailingSymbols.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setDqProbeSymbol(s.symbol); setActiveTab('data-quality'); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-mono text-red-400 hover:bg-red-500/20 transition-colors"
                          title={`Last failed: ${new Date(s.lastFailed).toLocaleString()}`}
                        >
                          {s.symbol}
                          <span className="bg-red-500/20 px-1 rounded text-[10px]">{s.failCount}x</span>
                          <ChevronRight className="w-3 h-3 opacity-50" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-slate-500 text-xs">No analysis data yet.</div>
            )}
          </div>

          {/* Symbol Probe */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-400" />
              Live Symbol Data Probe
              <span className="text-[10px] font-normal text-slate-500 ml-auto">Hits all Alpaca endpoints · IEX → SIP fallback</span>
            </h2>

            <form onSubmit={handleProbe} className="flex gap-3 mb-5">
              <input
                id="dq-probe-input"
                type="text"
                placeholder="e.g. SPY, AAPL, VFIAX"
                value={dqProbeSymbol}
                onChange={(e) => setDqProbeSymbol(e.target.value.toUpperCase())}
                className="input text-xs flex-1 font-mono"
              />
              <button type="submit" disabled={probing || !dqProbeSymbol.trim()} className="btn-primary text-xs px-5 font-semibold shrink-0">
                {probing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin inline mr-1" />Probing…</> : 'Probe'}
              </button>
            </form>

            {probeError && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg mb-4">
                <AlertCircle className="w-4 h-4 shrink-0" />{probeError}
              </div>
            )}

            {probeResult && (
              <div className="space-y-4 animate-fade-in">
                {/* Summary bar */}
                <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl">
                  <span className="font-mono font-extrabold text-slate-100 text-lg">{probeResult.symbol}</span>
                  <HealthBadge health={probeResult.overallHealth} score={probeResult.healthScore} />
                  <span className="text-[10px] text-slate-500 ml-auto">Probed {new Date(probeResult.probedAt).toLocaleString()}</span>
                </div>

                {/* Diagnosis */}
                {probeResult.diagnosis.length > 0 && (
                  <div className="space-y-1.5">
                    {probeResult.diagnosis.map((d, i) => (
                      <div key={i} className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
                        d.includes('SIP') ? 'bg-indigo-500/8 border border-indigo-500/20 text-indigo-300'
                          : d.toLowerCase().includes('healthy') ? 'bg-emerald-500/8 border border-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/8 border border-amber-500/20 text-amber-300'
                      }`}>
                        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />{d}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Snapshot fields */}
                  <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        {probeResult.snapshot.available ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
                        Snapshot
                      </span>
                      {probeResult.snapshot.httpStatus && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          probeResult.snapshot.httpStatus === 200 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>HTTP {probeResult.snapshot.httpStatus}</span>
                      )}
                    </div>
                    {probeResult.snapshot.error ? (
                      <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{probeResult.snapshot.error}</div>
                    ) : (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto">
                        {probeResult.snapshot.fields.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-800/40 last:border-0">
                            <span className="text-slate-400 font-mono">{f.field}</span>
                            <div className="flex items-center gap-2">
                              {f.status === 'OK' && f.value && (
                                <span className="text-slate-300 font-mono text-[10px]">{f.value}</span>
                              )}
                              <FieldBadge status={f.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bars per timeframe */}
                  <div className="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4">
                    <span className="text-xs font-semibold text-slate-300 block mb-3">Historical Bars (per Timeframe)</span>
                    <div className="space-y-2">
                      {Object.entries(probeResult.bars).map(([tf, bar]) => (
                        <div key={tf} className="flex items-center justify-between py-1.5 border-b border-slate-800/40 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-semibold text-slate-300 w-12">{tf}</span>
                            <FeedBadge feed={bar.feed} />
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            {bar.available ? (
                              <span className="text-emerald-400 font-mono">{bar.barCount} bars</span>
                            ) : (
                              <span className="text-red-400">No data</span>
                            )}
                            {bar.available
                              ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                              : <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* News row */}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-800/40">
                      <span className="text-xs font-mono font-semibold text-slate-300">News</span>
                      <span className={`text-[11px] font-mono ${probeResult.news.available ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {probeResult.news.articleCount} articles
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data Gap Table */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Recent Analysis Data Gap Report
              <span className="text-[10px] font-normal text-slate-500 ml-auto">Last 100 analyses · field-level null audit</span>
            </h2>

            {loadingGaps ? (
              <div className="flex items-center justify-center py-12"><LoadingSpinner size="md" /></div>
            ) : dataGaps.length > 0 ? (
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-500 font-semibold sticky top-0 bg-slate-950/90 backdrop-blur z-10">
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-3 text-center">Quality</th>
                      <th className="py-2.5 px-3 text-center">Price</th>
                      <th className="py-2.5 px-3 text-center">Volume</th>
                      <th className="py-2.5 px-3 text-center">Snapshot</th>
                      <th className="py-2.5 px-3 text-center">Bars</th>
                      <th className="py-2.5 px-3 text-center">News</th>
                      <th className="py-2.5 px-3 text-center">Rating</th>
                      <th className="py-2.5 px-3 text-right">Analyzed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {dataGaps.map((row) => {
                      const hasGap = !row.priceAvailable || !row.snapshotAvailable || !row.barsAvailable;
                      return (
                        <tr key={row.reportId} className={`transition-colors ${hasGap ? 'bg-red-500/3 hover:bg-red-500/6' : 'hover:bg-slate-900/30'}`}>
                          <td className="py-2.5 px-3">
                            <button
                              className="font-mono font-bold text-brand-400 hover:underline"
                              onClick={() => { setDqProbeSymbol(row.symbol); }}
                              title="Click to probe this symbol"
                            >
                              {row.symbol}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-center"><QualityBadge rating={row.dataQualityRating} /></td>
                          <td className="py-2.5 px-3 text-center"><BoolCell value={row.priceAvailable} /></td>
                          <td className="py-2.5 px-3 text-center"><BoolCell value={row.volumeAvailable} /></td>
                          <td className="py-2.5 px-3 text-center"><BoolCell value={row.snapshotAvailable} /></td>
                          <td className="py-2.5 px-3 text-center"><BoolCell value={row.barsAvailable} /></td>
                          <td className="py-2.5 px-3 text-center"><BoolCell value={row.newsAvailable} /></td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              row.finalRating === 'BUY' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : row.finalRating === 'SELL' ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                : 'text-slate-400 bg-slate-700/20 border-slate-700/30'
                            }`}>{row.finalRating}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                            {new Date(row.analyzedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">No analysis data available yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback Tab ───────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-6 slide-up">
          {/* Summary metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-label">Total Reports</div>
              <div className="stat-value text-slate-100">{feedback.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Latest Report</div>
              <div className="stat-value text-brand-400 text-lg py-1">
                {feedback.length > 0
                  ? new Date(feedback[0].createdAt).toLocaleDateString()
                  : 'N/A'}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Most Common Issue</div>
              <div className="stat-value text-indigo-400 text-lg py-1 truncate">
                {(() => {
                  if (feedback.length === 0) return 'N/A';
                  const counts: Record<string, number> = {};
                  feedback.forEach(f => counts[f.classification] = (counts[f.classification] || 0) + 1);
                  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
                })()}
              </div>
            </div>
          </div>

          <div className="card bg-slate-900/40 border border-slate-800/80 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4 mb-4">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <MessageSquare className="w-4.5 h-4.5 text-brand-400" />
                Problem Reports & Suggestions
              </h2>

              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                {['All', 'Incorrect data', 'Data not available', 'Fetching old data', 'Good to have', 'Must have'].map((cls) => {
                  const isActive = feedbackFilter === cls;
                  return (
                    <button
                      key={cls}
                      onClick={() => setFeedbackFilter(cls)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                        isActive
                          ? 'bg-brand-500/15 text-brand-400 border-brand-500/20 shadow-sm'
                          : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingFeedback ? (
              <div className="flex justify-center items-center py-16">
                <LoadingSpinner size="md" />
              </div>
            ) : filteredFeedback.length > 0 ? (
              <div className="space-y-4">
                {filteredFeedback.map((item) => {
                  const badgeColor = ({
                    'Incorrect data': 'text-red-400 bg-red-500/10 border-red-500/20',
                    'Data not available': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                    'Fetching old data': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                    'Good to have': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                    'Must have': 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                  } as Record<string, string>)[item.classification] || 'text-slate-400 bg-slate-700/10 border-slate-700/20';

                  return (
                    <div key={item.id} className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/60 transition duration-200">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{item.user?.username || 'System User'}</span>
                          {item.user?.role && (
                            <span className="text-[9px] font-bold px-1.5 py-0.25 rounded bg-slate-800 border border-slate-700 text-slate-400 tracking-wide uppercase">
                              {item.user.role}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                            {item.classification}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans pl-3 border-l-2 border-slate-850">
                        {item.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs italic bg-slate-950/20 rounded-xl border border-dashed border-slate-800/60">
                No feedback reports matching this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Client Logs Tab ─────────────────────────────────────────── */}
      {activeTab === 'client-logs' && (
        <div className="space-y-6 slide-up">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-label">Total UI Logs</div>
              <div className="stat-value text-slate-100">{clientLogs.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Errors / Warnings</div>
              <div className="stat-value text-brand-400 text-lg py-1 flex gap-3 font-mono">
                <span className="text-red-400">{clientLogs.filter(l => l.level === 'error').length} Errors</span>
                <span className="text-amber-400">{clientLogs.filter(l => l.level === 'warn').length} Warns</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Last Log Sync</div>
              <div className="stat-value text-indigo-400 text-lg py-1">
                {clientLogs.length > 0
                  ? new Date(clientLogs[0].timestamp).toLocaleString()
                  : 'N/A'}
              </div>
            </div>
          </div>

          <div className="card bg-slate-900/40 border border-slate-800/80 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Database className="w-4.5 h-4.5 text-brand-400" />
                  Client Console & Exception Logs
                </h2>
                <button
                  onClick={fetchClientLogs}
                  disabled={loadingClientLogs}
                  className="p-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition"
                  title="Reload Logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingClientLogs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={clientLogSearch}
                    onChange={(e) => setClientLogSearch(e.target.value)}
                    placeholder="Search logs/stacks…"
                    className="input pl-8 py-1.5 text-[11px] font-sans w-full sm:w-48 bg-slate-950 border-slate-850"
                  />
                </div>

                {/* Level buttons */}
                <div className="flex gap-1.5">
                  {['All', 'Error', 'Warn', 'Info'].map((level) => {
                    const isActive = clientLogLevelFilter === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setClientLogLevelFilter(level)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition ${
                          isActive
                            ? 'bg-brand-500/15 text-brand-400 border-brand-500/20 shadow-sm'
                            : 'bg-slate-800/40 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {level}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {loadingClientLogs ? (
              <div className="flex justify-center items-center py-16">
                <LoadingSpinner size="md" />
              </div>
            ) : clientLogs.length > 0 ? (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {clientLogs
                  .filter((log) => {
                    if (!clientLogSearch.trim()) return true;
                    const q = clientLogSearch.toLowerCase();
                    return (
                      log.message?.toLowerCase().includes(q) ||
                      log.stack?.toLowerCase().includes(q) ||
                      log.username?.toLowerCase().includes(q) ||
                      log.url?.toLowerCase().includes(q)
                    );
                  })
                  .map((log) => {
                    const isExpanded = !!expandedLogs[log.id];
                    const levelColors = {
                      error: 'text-red-400 bg-red-500/10 border-red-500/20',
                      warn: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                      info: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
                    }[log.level as 'error' | 'warn' | 'info'] || 'text-slate-450 bg-slate-700/15 border-slate-700/30';

                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl bg-slate-950/45 border transition duration-200 flex flex-col gap-2.5 ${
                          isExpanded ? 'border-slate-700/80 shadow-md' : 'border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-bold uppercase border text-[9px] ${levelColors}`}>
                              {log.level}
                            </span>
                            <span className="text-slate-450 font-mono text-[10px] truncate max-w-[200px]" title={log.url}>
                              {log.url ? new URL(log.url).pathname : '/'}
                            </span>
                            {log.username && (
                              <span className="text-[10px] text-slate-350 bg-slate-900 border border-slate-800 px-1.5 py-0.25 rounded font-sans">
                                User: <strong className="text-slate-200 font-semibold">{log.username}</strong>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-mono text-[10px]">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            {log.stack && (
                              <button
                                onClick={() =>
                                  setExpandedLogs((prev) => ({ ...prev, [log.id]: !prev[log.id] }))
                                }
                                className="text-brand-450 hover:text-brand-300 font-bold transition-colors"
                              >
                                {isExpanded ? 'Hide Stack' : 'View Stack'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-slate-200 font-mono break-words leading-relaxed pl-1">
                          {log.message}
                        </div>

                        {log.userAgent && (
                          <div className="text-[9px] text-slate-600 font-sans italic truncate" title={log.userAgent}>
                            Browser Agent: {log.userAgent}
                          </div>
                        )}

                        {isExpanded && log.stack && (
                          <div className="mt-1 p-3 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-red-400/90 font-mono overflow-x-auto max-h-64 leading-normal whitespace-pre animate-fade-in shadow-inner">
                            {log.stack}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-500 text-xs italic bg-slate-950/20 rounded-xl border border-dashed border-slate-800/60">
                No UI system logs matching this filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
