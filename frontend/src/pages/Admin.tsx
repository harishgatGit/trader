import React, { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { 
  LoadingSpinner, PageContainer, PageHeader, SectionHeader, 
  MetricCard, EmptyState 
} from '../components/ui';
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
    HEALTHY: { cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle },
    DEGRADED: { cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-550 border-amber-500/20', icon: AlertTriangle },
    UNAVAILABLE: { cls: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20', icon: WifiOff },
  }[health] || { cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20', icon: Info };
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
    OK: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    NULL: 'bg-red-500/10 text-red-600 dark:text-red-450 border-red-500/20',
    ERROR: 'bg-red-500/10 text-red-600 dark:text-red-450 border-red-500/20',
    EMPTY: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20',
  }[status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${cfg}`}>{status}</span>
  );
};

const FeedBadge: React.FC<{ feed: string }> = ({ feed }) => {
  const cfg = {
    iex: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    sip: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    none: 'bg-red-500/10 text-red-600 dark:text-red-450 border-red-500/20',
  }[feed] || 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase ${cfg}`}>{feed}</span>
  );
};

const BoolCell: React.FC<{ value: boolean }> = ({ value }) =>
  value
    ? <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
    : <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mx-auto" />;

const QualityBadge: React.FC<{ rating: string }> = ({ rating }) => {
  const cfg: Record<string, string> = {
    HIGH: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    LOW: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20',
    INSUFFICIENT: 'bg-red-500/10 text-red-600 dark:text-red-450 border-red-500/20',
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
    <PageContainer>
      {/* Header with Sub-nav tabs */}
      <PageHeader
        title="Superuser Admin Panel"
        subtitle="Manage accounts, monitor system health, audit search patterns & console logs"
        actions={
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 flex-wrap gap-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`admin-tab-${id}`}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        }
      />

      {/* ── Users Tab ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create User Form */}
          <div className="card space-y-4">
            <SectionHeader 
              title="Add System Account" 
              subtitle="Create standard or administrator access credentials" 
            />
            <form onSubmit={handleCreateUser} className="space-y-4 pt-2">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="flex items-center gap-2 p-3 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
              <div>
                <label className="label">Username</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. harish2" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)} 
                  className="input text-xs w-full" 
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)} 
                  className="input text-xs w-full" 
                />
              </div>
              <div>
                <label className="label">System Role</label>
                <select 
                  value={role} 
                  onChange={(e: any) => setRole(e.target.value)}
                  className="input text-xs cursor-pointer w-full bg-slate-900"
                >
                  <option value="BASIC">Standard User (BASIC)</option>
                  <option value="SUPERUSER">Administrator (SUPERUSER)</option>
                </select>
              </div>
              <button 
                type="submit" 
                disabled={submitting} 
                className="btn btn-primary w-full text-xs font-semibold"
              >
                {submitting ? 'Creating…' : 'Create Account'}
              </button>
            </form>
          </div>

          {/* Users List */}
          <div className="card lg:col-span-2 space-y-4">
            <SectionHeader 
              title="Registered System Accounts" 
              subtitle="Overview of system access roles and cumulative user actions" 
            />
            {loadingUsers ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="md" />
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800/60 rounded-xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-450 border-b border-slate-800/80 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Created Date</th>
                      <th className="py-3 px-4 text-right">Total Searches</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-200">{u.username}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            u.role === 'SUPERUSER'
                              ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                              : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                          }`}>{u.role}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300 font-semibold">{u._count?.searchLogs || 0}</td>
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
            <MetricCard
              label="Total Searches Logged"
              value={analytics?.totalSearches ?? 0}
              icon={<Search className="w-5 h-5 text-brand-500" />}
            />
            <MetricCard
              label="Top Searched Ticker"
              value={analytics?.topSymbols?.[0]?.symbol ?? 'N/A'}
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            />
            <MetricCard
              label="Top Searched Sector"
              value={analytics?.topSectors?.[0]?.sector ?? 'N/A'}
              icon={<Building2 className="w-5 h-5 text-indigo-500" />}
              className="col-span-1"
            />
            <MetricCard
              label="Most Active IP"
              value={analytics?.topIps?.[0]?.ip ? `${analytics.topIps[0].ip}` : 'N/A'}
              subValue={analytics?.topIps?.[0]?.city ? `Location: ${analytics.topIps[0].city}` : undefined}
              icon={<Activity className="w-5 h-5 text-rose-500" />}
            />
            <MetricCard
              label="Unique Active IPs"
              value={analytics?.topIps?.length ?? 0}
              icon={<Users className="w-5 h-5 text-amber-500" />}
            />
          </div>

          {/* Daily Search Volume */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/65 pb-3">
              <SectionHeader 
                title="Daily Search Volume" 
                subtitle="Volume statistics for user queries logged over the last 7 calendar days" 
              />
              <button 
                onClick={handleRefreshAnalytics} 
                disabled={refreshing} 
                className="btn btn-secondary text-xs px-2.5 py-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-20">
                <LoadingSpinner size="md" />
              </div>
            ) : analytics && analytics.dailyStats.length > 0 ? (
              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.dailyStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary-accent)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-primary-accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--color-slate-450)" 
                      fontSize={10} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(str) => { const p = str.split('-'); return `${p[1]}/${p[2]}`; }} 
                    />
                    <YAxis stroke="var(--color-slate-450)" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'var(--color-bg-card-elevated)', 
                        borderColor: 'var(--color-border)', 
                        borderRadius: '12px',
                        color: 'var(--color-text-primary)'
                      }}
                      labelStyle={{ color: 'var(--color-slate-400)', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ color: 'var(--color-primary-accent)', fontSize: '11px', fontWeight: 'bold' }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      name="Searches" 
                      stroke="var(--color-primary-accent)" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorCount)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-20 text-xs text-slate-500 italic">No search volume data logged yet.</div>
            )}
          </div>

          {/* Top Searches / Sectors / IP Traffic */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card space-y-4">
              <SectionHeader 
                title="Popular Ticker Requests" 
                subtitle="Most frequently queried equity symbols in the search portal" 
              />
              <div className="border-t border-slate-800/40 pt-3">
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
                ) : analytics && analytics.topSymbols.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topSymbols.map((item: any, idx: number) => {
                      const pct = analytics.topSymbols[0].count > 0 ? (item.count / analytics.topSymbols[0].count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="font-bold text-slate-200">{item.symbol}</span>
                            <span className="text-slate-400">{item.count} searches</span>
                          </div>
                          <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-slate-800/50">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-350" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-slate-500 italic">No ticker searches recorded.</div>
                )}
              </div>
            </div>

            <div className="card space-y-4">
              <SectionHeader 
                title="Sectors Distribution" 
                subtitle="Breakdown of queried securities categorized by financial sector" 
              />
              <div className="border-t border-slate-800/40 pt-3">
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
                ) : analytics && analytics.topSectors.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topSectors.map((item: any, idx: number) => {
                      const pct = analytics.topSectors[0].count > 0 ? (item.count / analytics.topSectors[0].count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-200 truncate pr-2">{item.sector}</span>
                            <span className="text-slate-400 font-mono font-semibold shrink-0">{item.count} searches</span>
                          </div>
                          <div className="w-full bg-slate-950/60 h-2 rounded-full overflow-hidden border border-slate-800/50">
                            <div className="bg-indigo-500 h-full rounded-full transition-all duration-355" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-slate-500 italic">No sector searches recorded.</div>
                )}
              </div>
            </div>

            <div className="card space-y-4">
              <SectionHeader 
                title="Geographical IP Traffic" 
                subtitle="Active request volume grouped by client host IP address" 
              />
              <div className="border-t border-slate-800/40 pt-3">
                {loadingAnalytics ? (
                  <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
                ) : analytics && analytics.topIps && analytics.topIps.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.topIps.map((item: any, idx: number) => {
                      const pct = analytics.topIps[0].count > 0 ? (item.count / analytics.topIps[0].count) * 100 : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-450 text-[10px] truncate max-w-[120px]" title={`${item.city}, ${item.state}`}>
                              {item.city}, {item.state}
                            </span>
                            <span 
                              className="font-mono font-bold text-slate-200 hover:text-brand-500 cursor-pointer transition-colors" 
                              onClick={() => setIpFilter(item.ip)}
                              title="Click to filter audit logs by this IP"
                            >
                              {item.ip}
                            </span>
                            <span className="text-slate-450 shrink-0 font-mono text-[10px]">{item.count} searches</span>
                          </div>
                          <div className="w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-slate-800/50">
                            <div className="bg-pink-500 h-full rounded-full transition-all duration-360" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-slate-500 italic">No IP logs recorded.</div>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-3">
              <SectionHeader 
                title="Detailed Search Audit Logs" 
                subtitle="Complete granular audit trace of all recent analytics search logs" 
              />
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-550 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search IP, Ticker, City, User…"
                  value={ipFilter}
                  onChange={(e) => setIpFilter(e.target.value)}
                  className="input pl-9 pr-8 py-1.5 text-xs w-full bg-slate-950 border border-slate-850"
                />
                {ipFilter && (
                  <button 
                    onClick={() => setIpFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 text-[10px] font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="flex items-center justify-center py-12"><LoadingSpinner size="sm" /></div>
            ) : analytics && analytics.recentSearches.length > 0 ? (
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
                  return <div className="text-center py-12 text-slate-500 text-xs italic">No logs match your filter query.</div>;
                }

                return (
                  <div className="overflow-x-auto max-h-96 border border-slate-800/60 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-950 text-slate-450 border-b border-slate-800/80 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                          <th className="py-3 px-4">Username</th>
                          <th className="py-3 px-4">Ticker</th>
                          <th className="py-3 px-4">Sector</th>
                          <th className="py-3 px-4">IP Address</th>
                          <th className="py-3 px-4">Location (City, State)</th>
                          <th className="py-3 px-4 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {filtered.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-2.5 px-4 font-semibold text-slate-200">{log.username}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-brand-650 dark:text-brand-400">{log.symbol}</td>
                            <td className="py-2.5 px-4 text-slate-400">{log.sector}</td>
                            <td className="py-2.5 px-4 font-mono text-pink-650 dark:text-pink-400/90">{log.ipAddress || 'Unknown'}</td>
                            <td className="py-2.5 px-4 text-slate-350">{log.city && log.state ? `${log.city}, ${log.state}` : 'Unknown'}</td>
                            <td className="py-2.5 px-4 text-right text-slate-500 font-mono">{new Date(log.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs italic">No audit logs available.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Data Quality Monitor Tab ───────────────────────────────── */}
      {activeTab === 'data-quality' && (
        <div className="space-y-6">
          {/* Consistency Overview Cards */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/65 pb-3">
              <SectionHeader 
                title="Data Consistency Metrics" 
                subtitle="Audits for key database fields over the last 500 generated analyses" 
              />
              <button 
                onClick={() => { fetchConsistency(); fetchDataGaps(); }} 
                className="btn btn-secondary text-xs p-2" 
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {loadingConsistency ? (
              <div className="flex items-center justify-center py-16">
                <LoadingSpinner size="md" />
              </div>
            ) : consistency ? (
              <>
                {/* Summary row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pt-2">
                  {[
                    { label: 'Total Analyses', value: consistency.totalAnalyses, sub: `${consistency.analyzedSymbols} unique symbols`, color: 'text-brand-500', bg: 'bg-brand-500/5 border-brand-500/15' },
                    { label: 'Missing Price', value: `${consistency.missingPricePct}%`, sub: `${consistency.missingPriceCount} incidents`, color: consistency.missingPricePct > 10 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400', bg: consistency.missingPricePct > 10 ? 'bg-red-500/5 border-red-500/15' : 'bg-emerald-500/5 border-emerald-500/15' },
                    { label: 'Insufficient Data', value: `${consistency.insufficientDataPct}%`, sub: `${consistency.insufficientDataCount} incidents`, color: consistency.insufficientDataPct > 5 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400', bg: consistency.insufficientDataPct > 5 ? 'bg-red-500/5 border-red-500/15' : 'bg-emerald-500/5 border-emerald-500/15' },
                    { label: 'No Historical Bars', value: `${consistency.noBarsPct}%`, sub: `${consistency.noBarsCount} incidents`, color: consistency.noBarsPct > 10 ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400', bg: consistency.noBarsPct > 10 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-emerald-500/5 border-emerald-500/15' },
                  ].map((m, idx) => (
                    <div key={idx} className={`rounded-xl border p-4 flex flex-col gap-1.5 ${m.bg}`}>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</div>
                      <div className={`text-2xl font-extrabold font-mono leading-none ${m.color}`}>{m.value}</div>
                      <div className="text-[10px] text-slate-450">{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* More metric pills */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-800/40 pt-4">
                  {[
                    { label: 'Missing Cumulative Volume', value: `${consistency.missingVolumePct}%`, count: consistency.missingVolumeCount },
                    { label: 'Missing Alpaca Snapshot', value: `${consistency.noSnapshotPct}%`, count: consistency.noSnapshotCount },
                    { label: 'Low Overall Quality Rating', value: `${consistency.lowDataPct}%`, count: consistency.lowDataCount },
                  ].map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-950/45 border border-slate-850 rounded-xl p-3.5">
                      <span className="text-xs text-slate-400 font-semibold">{m.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-slate-200">{m.value}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5 font-medium">({m.count} reports)</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top failing symbols */}
                {consistency.topFailingSymbols.length > 0 && (
                  <div className="border-t border-slate-800/40 pt-4">
                    <div className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      Symbols with High Failure Rates
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {consistency.topFailingSymbols.map((s, idx) => (
                        <button
                          key={idx}
                          onClick={() => { setDqProbeSymbol(s.symbol); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/5 border border-red-500/15 hover:border-red-500/30 rounded-xl text-xs font-mono text-red-500 hover:bg-red-500/10 transition-colors"
                          title={`Last failed: ${new Date(s.lastFailed).toLocaleString()}`}
                        >
                          <span>{s.symbol}</span>
                          <span className="bg-red-500/15 px-1.5 py-0.25 rounded text-[10px] font-bold">{s.failCount}x</span>
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-slate-550 text-xs italic">No analysis data logged yet.</div>
            )}
          </div>

          {/* Symbol Probe */}
          <div className="card space-y-4">
            <SectionHeader 
              title="Live Symbol Data Probe" 
              subtitle="Interrogate the Alpaca API directly to test connection status, field health and falls back to SIP if needed" 
            />

            <form onSubmit={handleProbe} className="flex gap-3 pt-2">
              <input
                id="dq-probe-input"
                type="text"
                placeholder="e.g. SPY, AAPL, MSFT"
                value={dqProbeSymbol}
                onChange={(e) => setDqProbeSymbol(e.target.value.toUpperCase())}
                className="input text-xs flex-1 font-mono font-bold tracking-widest uppercase"
              />
              <button 
                type="submit" 
                disabled={probing || !dqProbeSymbol.trim()} 
                className="btn btn-primary text-xs px-6 font-semibold shrink-0"
              >
                {probing ? <><RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />Probing Feeds...</> : 'Probe'}
              </button>
            </form>

            {probeError && (
              <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-550 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{probeError}</span>
              </div>
            )}

            {probeResult && (
              <div className="space-y-4 animate-fade-in border-t border-slate-800/40 pt-4">
                {/* Summary bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/60 border border-slate-850 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-extrabold text-slate-200 text-lg tracking-wider">{probeResult.symbol}</span>
                    <HealthBadge health={probeResult.overallHealth} score={probeResult.healthScore} />
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Synced {new Date(probeResult.probedAt).toLocaleTimeString()}</span>
                </div>

                {/* Diagnosis logs */}
                {probeResult.diagnosis.length > 0 && (
                  <div className="space-y-2">
                    {probeResult.diagnosis.map((d, i) => (
                      <div key={i} className={`flex items-start gap-2.5 text-xs px-3.5 py-2.5 rounded-xl border ${
                        d.includes('SIP') ? 'bg-indigo-500/5 border-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                          : d.toLowerCase().includes('healthy') ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/5 border-amber-500/15 text-amber-600 dark:text-amber-500'
                      }`}>
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{d}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Snapshot fields */}
                  <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-850 pb-2">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                        {probeResult.snapshot.available ? <Wifi className="w-3.5 h-3.5 text-emerald-500" /> : <WifiOff className="w-3.5 h-3.5 text-red-500" />}
                        Snapshot Endpoint Data
                      </span>
                      {probeResult.snapshot.httpStatus && (
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          probeResult.snapshot.httpStatus === 200 ? 'bg-emerald-550/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-550/15 text-red-600 dark:text-red-400'
                        }`}>HTTP {probeResult.snapshot.httpStatus}</span>
                      )}
                    </div>
                    {probeResult.snapshot.error ? (
                      <div className="text-xs text-red-500 bg-red-500/5 border border-red-500/15 rounded-xl px-4 py-3 font-mono">{probeResult.snapshot.error}</div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {probeResult.snapshot.fields.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-850/30 last:border-0">
                            <span className="text-slate-450 font-mono font-bold">{f.field}</span>
                            <div className="flex items-center gap-2">
                              {f.status === 'OK' && f.value !== undefined && (
                                <span className="text-slate-200 font-mono">{String(f.value)}</span>
                              )}
                              <FieldBadge status={f.status} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bars per timeframe */}
                  <div className="bg-slate-950/30 border border-slate-850 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-300 border-b border-slate-850 pb-2 mb-3 uppercase tracking-wider">
                        Historical Bars & News Completeness
                      </div>
                      <div className="space-y-3.5">
                        {Object.entries(probeResult.bars).map(([tf, bar]) => (
                          <div key={tf} className="flex items-center justify-between py-1 border-b border-slate-850/30 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-extrabold text-slate-200 w-12">{tf}</span>
                              <FeedBadge feed={bar.feed} />
                            </div>
                            <div className="flex items-center gap-2.5 text-xs">
                              {bar.available ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{bar.barCount} bars</span>
                              ) : (
                                <span className="text-red-550 dark:text-red-400 font-medium">Offline</span>
                              )}
                              {bar.available
                                ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                : <AlertCircle className="w-4 h-4 text-red-500" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* News row */}
                    <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-850">
                      <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">News Catalyst Feed</span>
                      <div className="flex items-center gap-2.5">
                        <span className={`text-xs font-mono font-bold ${probeResult.news.available ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500'}`}>
                          {probeResult.news.articleCount} articles fetched
                        </span>
                        {probeResult.news.available ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Data Gap Table */}
          <div className="card space-y-4">
            <SectionHeader 
              title="Recent Data Gap Audits" 
              subtitle="Granular analysis of missing values, fields, and final quality classifications" 
            />

            {loadingGaps ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner size="md" /></div>
            ) : dataGaps.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800/60 rounded-xl max-h-[480px]">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-450 border-b border-slate-800/80 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                      <th className="py-3 px-4">Symbol</th>
                      <th className="py-3 px-4 text-center">Quality Rating</th>
                      <th className="py-3 px-4 text-center">Price</th>
                      <th className="py-3 px-4 text-center">Volume</th>
                      <th className="py-3 px-4 text-center">Snapshot</th>
                      <th className="py-3 px-4 text-center">Bars</th>
                      <th className="py-3 px-4 text-center">News</th>
                      <th className="py-3 px-4 text-center">AI Rating</th>
                      <th className="py-3 px-4 text-right">Analyzed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {dataGaps.map((row) => {
                      const hasGap = !row.priceAvailable || !row.snapshotAvailable || !row.barsAvailable;
                      return (
                        <tr 
                          key={row.reportId} 
                          className={`transition-colors ${hasGap ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-slate-900/30'}`}
                        >
                          <td className="py-3 px-4 font-mono font-bold">
                            <button
                              className="text-brand-600 dark:text-brand-400 hover:underline text-left font-bold"
                              onClick={() => { setDqProbeSymbol(row.symbol); }}
                              title="Click to probe this symbol"
                            >
                              {row.symbol}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center"><QualityBadge rating={row.dataQualityRating} /></td>
                          <td className="py-3 px-4 text-center"><BoolCell value={row.priceAvailable} /></td>
                          <td className="py-3 px-4 text-center"><BoolCell value={row.volumeAvailable} /></td>
                          <td className="py-3 px-4 text-center"><BoolCell value={row.snapshotAvailable} /></td>
                          <td className="py-3 px-4 text-center"><BoolCell value={row.barsAvailable} /></td>
                          <td className="py-3 px-4 text-center"><BoolCell value={row.newsAvailable} /></td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                              row.finalRating === 'BUY' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                : row.finalRating === 'SELL' ? 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20'
                                : 'text-slate-500 dark:text-slate-400 bg-slate-700/10 border-slate-700/20'
                            }`}>{row.finalRating}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-slate-500 font-mono font-semibold">
                            {new Date(row.analyzedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-550 text-xs italic">No data gap records logged.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback Tab ───────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          {/* Summary metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Total Reports"
              value={feedback.length}
              icon={<MessageSquare className="w-5 h-5 text-brand-500" />}
            />
            <MetricCard
              label="Latest Feedback Received"
              value={feedback.length > 0 ? new Date(feedback[0].createdAt).toLocaleDateString() : 'N/A'}
              icon={<Calendar className="w-5 h-5 text-indigo-500" />}
            />
            <MetricCard
              label="Primary Issue Mode"
              value={(() => {
                if (feedback.length === 0) return 'N/A';
                const counts: Record<string, number> = {};
                feedback.forEach(f => counts[f.classification] = (counts[f.classification] || 0) + 1);
                return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
              })()}
              icon={<AlertTriangle className="w-5 h-5 text-amber-500" />}
            />
          </div>

          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
              <SectionHeader 
                title="Problem Reports & Suggestions" 
                subtitle="Review bug reports, usability suggestions, and data discrepancy filings" 
              />

              {/* Filters */}
              <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
                {['All', 'Incorrect data', 'Data not available', 'Fetching old data', 'Good to have', 'Must have'].map((cls) => {
                  const isActive = feedbackFilter === cls;
                  return (
                    <button
                      key={cls}
                      onClick={() => setFeedbackFilter(cls)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all duration-150 border ${
                        isActive
                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
              <div className="space-y-4 pt-2">
                {filteredFeedback.map((item) => {
                  const badgeColor = ({
                    'Incorrect data': 'text-red-650 dark:text-red-400 bg-red-500/10 border-red-500/20',
                    'Data not available': 'text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20',
                    'Fetching old data': 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20',
                    'Good to have': 'text-emerald-600 dark:text-emerald-450 bg-emerald-500/10 border-emerald-500/20',
                    'Must have': 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                  } as Record<string, string>)[item.classification] || 'text-slate-500 bg-slate-700/10 border-slate-700/20';

                  return (
                    <div 
                      key={item.id} 
                      className="p-4 rounded-xl bg-slate-950/25 border border-slate-850 hover:border-slate-800 transition duration-200 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{item.user?.username || 'Anonymous User'}</span>
                          {item.user?.role && (
                            <span className="text-[9px] font-bold px-1.5 py-0.25 rounded bg-slate-900 border border-slate-800 text-slate-500 tracking-wide uppercase">
                              {item.user.role}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                            {item.classification}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono font-medium">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line font-sans pl-3 border-l-2 border-slate-800 bg-slate-950/10 py-1">
                        {item.summary}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-550 text-xs italic bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
                No feedback reports matching this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Client Logs Tab ─────────────────────────────────────────── */}
      {activeTab === 'client-logs' && (
        <div className="space-y-6">
          {/* Summary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Total UI System Logs"
              value={clientLogs.length}
              icon={<Database className="w-5 h-5 text-brand-500" />}
            />
            <MetricCard
              label="Errors & Warnings Stack"
              value={
                <div className="flex gap-4">
                  <span className="text-red-500 font-bold">{clientLogs.filter(l => l.level === 'error').length} Errors</span>
                  <span className="text-amber-500 font-bold">{clientLogs.filter(l => l.level === 'warn').length} Warns</span>
                </div>
              }
              icon={<AlertTriangle className="w-5 h-5 text-rose-500" />}
            />
            <MetricCard
              label="Last Remote Sync"
              value={clientLogs.length > 0 ? new Date(clientLogs[0].timestamp).toLocaleTimeString() : 'N/A'}
              icon={<Calendar className="w-5 h-5 text-indigo-500" />}
            />
          </div>

          <div className="card space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-3">
              <div className="flex items-center gap-3">
                <SectionHeader 
                  title="Client Console & Exception Logs" 
                  subtitle="Exceptions, stack traces, and console syncs uploaded by client browser instances" 
                />
                <button
                  onClick={fetchClientLogs}
                  disabled={loadingClientLogs}
                  className="btn btn-secondary text-xs px-2 py-1.5"
                  title="Reload Logs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingClientLogs ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Search */}
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-550" />
                  <input
                    type="text"
                    value={clientLogSearch}
                    onChange={(e) => setClientLogSearch(e.target.value)}
                    placeholder="Search logs, stacks, users..."
                    className="input pl-8 py-1.5 text-[11px] font-sans w-full sm:w-48 bg-slate-950 border-slate-850"
                  />
                </div>

                {/* Level buttons */}
                <div className="flex gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
                  {['All', 'Error', 'Warn', 'Info'].map((level) => {
                    const isActive = clientLogLevelFilter === level;
                    return (
                      <button
                        key={level}
                        onClick={() => setClientLogLevelFilter(level)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all duration-150 ${
                          isActive
                            ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20'
                            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
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
                      error: 'text-red-650 dark:text-red-400 bg-red-500/10 border-red-500/20',
                      warn: 'text-amber-600 dark:text-amber-500 bg-amber-500/10 border-amber-500/20',
                      info: 'text-brand-600 dark:text-brand-400 bg-brand-500/10 border-brand-500/20',
                    }[log.level as 'error' | 'warn' | 'info'] || 'text-slate-500 bg-slate-700/10 border-slate-700/20';

                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl bg-slate-950/20 border transition duration-200 flex flex-col gap-2.5 ${
                          isExpanded ? 'border-slate-700 shadow-md' : 'border-slate-850 hover:border-slate-800'
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
                              <span className="text-[10px] text-slate-350 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded font-sans">
                                User: <strong className="text-slate-200 font-semibold">{log.username}</strong>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-mono text-[10px] font-semibold">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                            {log.stack && (
                              <button
                                onClick={() =>
                                  setExpandedLogs((prev) => ({ ...prev, [log.id]: !prev[log.id] }))
                                }
                                className="text-brand-600 dark:text-brand-400 hover:text-brand-500 font-bold transition-colors text-[10px] uppercase tracking-wider"
                              >
                                {isExpanded ? 'Hide Stack' : 'View Stack'}
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-slate-200 font-mono break-words leading-relaxed pl-1 font-semibold">
                          {log.message}
                        </div>

                        {log.userAgent && (
                          <div className="text-[9.5px] text-slate-500 font-sans italic truncate" title={log.userAgent}>
                            Browser: {log.userAgent}
                          </div>
                        )}

                        {isExpanded && log.stack && (
                          <div className="mt-1 p-3 rounded-lg bg-slate-950 border border-slate-850 text-[10.5px] text-red-500/90 font-mono overflow-x-auto max-h-64 leading-normal whitespace-pre animate-fade-in shadow-inner">
                            {log.stack}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-16 text-slate-550 text-xs italic bg-slate-950/20 rounded-xl border border-dashed border-slate-850">
                No UI system logs matching this filter.
              </div>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
};

export default Admin;
