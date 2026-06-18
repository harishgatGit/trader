import React, { useEffect } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Bot, Star, FileText, Bell } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { RatingBadge, LoadingSpinner, EmptyState, Skeleton, PageContainer, PageHeader, MetricCard, ResponsiveGrid, StatusBadge } from '../components/ui';

const Dashboard: React.FC = () => {
  const {
    watchlist, fetchWatchlist, watchlistLoading,
    recentReports, fetchRecentReports, reportsLoading,
    alerts, fetchAlerts,
  } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchWatchlist();
    fetchRecentReports();
    fetchAlerts();
  }, []);

  const activeAlerts = alerts.filter((a) => a.enabled).length;
  const recentBuys = recentReports.filter((r) => r.finalRating === 'BUY').length;
  const recentSells = recentReports.filter((r) => r.finalRating === 'SELL').length;

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="AI-powered institutional stock research and timing alerts"
        actions={
          <button
            onClick={() => navigate('/analyze')}
            className="btn btn-primary"
          >
            <Bot className="w-4.5 h-4.5" />
            Analyze Stock
          </button>
        }
      />

      {/* KPI Cards Row */}
      <ResponsiveGrid cols={3}>
        <MetricCard
          label="Watchlist Items"
          value={watchlistLoading ? <Skeleton className="h-6 w-12" /> : watchlist.length}
          subValue="Tracked symbols"
          icon={<Star className="w-5 h-5 text-indigo-400" />}
        />
        <MetricCard
          label="AI Reports Compiled"
          value={reportsLoading ? <Skeleton className="h-6 w-12" /> : recentReports.length}
          subValue="In current database"
          icon={<FileText className="w-5 h-5 text-teal-400" />}
        />
        <MetricCard
          label="Active Timing Alerts"
          value={activeAlerts}
          subValue={`${alerts.length} total rules`}
          icon={<Bell className="w-5 h-5 text-amber-500" />}
        />
      </ResponsiveGrid>

      {/* Signal Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Buy Signals', count: recentBuys, color: 'text-emerald-500 border-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/10 dark:text-emerald-400', icon: TrendingUp },
          { label: 'Sell Signals', count: recentSells, color: 'text-red-500 border-red-500/10 bg-red-500/5 dark:bg-red-500/10 dark:text-red-400', icon: TrendingDown },
          { label: 'Hold/Watch Bias', count: recentReports.length - recentBuys - recentSells, color: 'text-amber-600 border-amber-500/10 bg-amber-500/5 dark:bg-amber-500/10 dark:text-amber-400', icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className={`flex items-center justify-between p-4 rounded-2xl border ${item.color} shadow-sm transition-all duration-200 hover:scale-[1.01]`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black font-mono leading-none">{item.count}</div>
                <div className="text-xs text-slate-500 mt-1  font-bold tracking-wider">{item.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Watchlist & Reports Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Watchlist Card */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">Watchlist Summary</h2>
              <p className="text-xs text-slate-500 mt-0.5">Quick look at your tracked assets</p>
            </div>
            <Link to="/watchlist" className="text-xs text-brand-500 hover:text-brand-400 font-bold flex items-center gap-0.5">
              Manage <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {watchlistLoading ? (
            <Skeleton lines={4} className="h-12 w-full" />
          ) : watchlist.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="No Watchlist Assets Tracked"
              description="Add tickers to your watchlist to monitor daily price action and AI scoring."
              action={<Link to="/watchlist" className="btn btn-secondary text-xs">Browse Watchlist</Link>}
            />
          ) : (
            <div className="divide-y divide-slate-850">
              {watchlist.slice(0, 5).map((item) => (
                <Link
                  key={item.symbol}
                  to={`/stocks/${item.symbol}`}
                  state={{ from: 'watchlist' }}
                  className="flex items-center justify-between py-3 hover:bg-slate-950/30 px-2 rounded-xl transition-all duration-150 group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 bg-slate-950/80 border border-slate-850 rounded-xl flex items-center justify-center text-xs font-bold text-brand-500 group-hover:bg-slate-900 transition-colors">
                      {item.symbol.slice(0, 2)}
                    </div>
                    <div>
                      {/* @ts-ignore */}
                      <ViewTransition name={`stock-symbol-watchlist-${item.symbol}`} share="text-morph" default="none">
                        <div className="font-bold text-slate-100 text-sm">{item.symbol}</div>
                      </ViewTransition>
                      <div className="text-[10px] text-slate-500  tracking-wider font-semibold mt-0.5">
                        {item.lastAnalyzedAt
                          ? `Analyzed ${new Date(item.lastAnalyzedAt).toLocaleDateString()}`
                          : 'Not analyzed yet'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.latestPrice && (
                      <span className="text-sm font-mono font-bold text-slate-200">
                        ${item.latestPrice.toFixed(2)}
                      </span>
                    )}
                    {item.latestRating && <StatusBadge status={item.latestRating} size="sm" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent AI Reports Card */}
        <div className="card flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">Recent AI Analyses</h2>
              <p className="text-xs text-slate-500 mt-0.5">Latest outputs from the research models</p>
            </div>
            <Link to="/reports" className="text-xs text-brand-500 hover:text-brand-400 font-bold flex items-center gap-0.5">
              All Reports <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {reportsLoading ? (
            <Skeleton lines={4} className="h-12 w-full" />
          ) : recentReports.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No reports compiled yet"
              description="Enter a stock ticker to start research validation."
              action={<Link to="/analyze" className="btn btn-secondary text-xs">Run analysis</Link>}
            />
          ) : (
            <div className="divide-y divide-slate-850">
              {recentReports.slice(0, 5).map((report) => (
                <Link
                  key={report.id}
                  to={`/stocks/${report.symbol}`}
                  state={{ from: 'reports' }}
                  className="flex items-center justify-between py-3 hover:bg-slate-950/30 px-2 rounded-xl transition-all duration-150 group"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-9 h-9 bg-slate-950/80 border border-slate-850 rounded-xl flex items-center justify-center text-xs font-bold text-slate-400">
                      {report.symbol.slice(0, 2)}
                    </div>
                    <div>
                      {/* @ts-ignore */}
                      <ViewTransition name={`stock-symbol-reports-${report.symbol}`} share="text-morph" default="none">
                        <div className="font-bold text-slate-100 text-sm">{report.symbol}</div>
                      </ViewTransition>
                      <div className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        {new Date(report.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={report.finalRating} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Alerts Card */}
        <div className="card flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-100">Configured Alerts</h2>
              <p className="text-xs text-slate-500 mt-0.5">Trigger settings for breakouts and support levels</p>
            </div>
            <Link to="/alerts" className="text-xs text-brand-500 hover:text-brand-400 font-bold flex items-center gap-0.5">
              Manage Rules <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              icon="🔔"
              title="No Trigger Alerts Setup"
              description="Create alert rules to watch for specific price breakouts or signal score reversals."
              action={<Link to="/alerts" className="btn btn-secondary text-xs">Create Alert</Link>}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alerts.slice(0, 6).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-slate-850/65">
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${alert.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                    <div>
                      <div className="text-xs font-bold text-slate-200">{alert.name || alert.type.replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-slate-500  tracking-wider font-semibold mt-0.5">{alert.symbol} · {alert.type}</div>
                    </div>
                  </div>
                  {alert.value && (
                    <span className="text-xs font-mono font-bold text-brand-400 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-lg">${alert.value.toFixed(2)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
};

export default Dashboard;
