import React, { useEffect } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, AlertTriangle, RefreshCw, ChevronRight, Activity, Bot } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { RatingBadge, PriceChange, LoadingSpinner, EmptyState, Skeleton } from '../components/ui';

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
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-powered institutional stock analysis</p>
        </div>
        <button
          onClick={() => navigate('/analyze')}
          className="btn-primary"
        >
          <Bot className="w-4 h-4" />
          Run Analysis
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="stat-label">Watchlist Items</div>
          <div className="stat-value text-brand-400">{watchlist.length}</div>
          <div className="text-xs text-slate-500">Symbols tracked on watchlist</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Total AI Reports</div>
          <div className="stat-value text-indigo-400">{recentReports.length}</div>
          <div className="text-xs text-slate-500">Reports generated in database</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Alerts</div>
          <div className="stat-value text-slate-200">{activeAlerts}</div>
          <div className="text-xs text-slate-500">{alerts.length} total configured</div>
        </div>
      </div>

      {/* Signal Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Buy Signals', count: recentBuys, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: TrendingUp },
          { label: 'Sell Signals', count: recentSells, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', icon: TrendingDown },
          { label: 'Hold/Watch', count: recentReports.length - recentBuys - recentSells, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className={`flex items-center gap-3 p-3 rounded-xl border ${item.bg}`}>
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <div>
              <div className={`text-xl font-bold ${item.color}`}>{item.count}</div>
              <div className="text-xs text-slate-500">{item.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Watchlist */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Watchlist</h2>
            <Link to="/watchlist" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {watchlistLoading ? (
            <Skeleton lines={4} className="h-10 w-full" />
          ) : watchlist.length === 0 ? (
            <EmptyState
              icon="⭐"
              title="No watchlist items"
              description="Add symbols to track"
              action={<Link to="/watchlist" className="btn-primary text-xs">Add Symbol</Link>}
            />
          ) : (
            <div className="space-y-1">
              {watchlist.slice(0, 6).map((item) => (
                <Link
                  key={item.symbol}
                  to={`/stocks/${item.symbol}`}
                  state={{ from: 'watchlist' }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-brand-400 group-hover:bg-slate-700 transition-colors">
                      {item.symbol.slice(0, 2)}
                    </div>
                    <div>
                      {/* @ts-ignore */}
                      <ViewTransition name={`stock-symbol-watchlist-${item.symbol}`} share="text-morph" default="none">
                        <div className="font-semibold text-slate-200 text-sm">{item.symbol}</div>
                      </ViewTransition>
                      <div className="text-xs text-slate-500">
                        {item.lastAnalyzedAt
                          ? `Analyzed ${new Date(item.lastAnalyzedAt).toLocaleDateString()}`
                          : 'Not analyzed yet'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.latestPrice && (
                      <span className="text-sm font-mono text-slate-300">
                        ${item.latestPrice.toFixed(2)}
                      </span>
                    )}
                    {item.latestRating && <RatingBadge rating={item.latestRating} size="sm" />}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Recent AI Reports</h2>
            <Link to="/reports" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {reportsLoading ? (
            <Skeleton lines={4} className="h-10 w-full" />
          ) : recentReports.length === 0 ? (
            <EmptyState
              icon="📊"
              title="No reports yet"
              description="Run your first analysis"
              action={<Link to="/analyze" className="btn-primary text-xs">Analyze Stock</Link>}
            />
          ) : (
            <div className="space-y-1">
              {recentReports.slice(0, 6).map((report) => (
                <Link
                  key={report.id}
                  to={`/stocks/${report.symbol}`}
                  state={{ from: 'reports' }}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-700/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-xs font-bold text-slate-400">
                      {report.symbol.slice(0, 2)}
                    </div>
                    <div>
                      {/* @ts-ignore */}
                      <ViewTransition name={`stock-symbol-reports-${report.symbol}`} share="text-morph" default="none">
                        <div className="font-semibold text-slate-200 text-sm">{report.symbol}</div>
                      </ViewTransition>
                      <div className="text-xs text-slate-500">
                        {new Date(report.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RatingBadge rating={report.finalRating} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Active Alerts */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-200">Recent Alerts</h2>
            <Link to="/alerts" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {alerts.length === 0 ? (
            <EmptyState
              icon="🔔"
              title="No alerts configured"
              description="Set up price and signal alerts"
              action={<Link to="/alerts" className="btn-primary text-xs">Create Alert</Link>}
            />
          ) : (
            <div className="space-y-1">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/30">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${alert.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <div>
                      <div className="text-sm text-slate-200">{alert.name || alert.type}</div>
                      <div className="text-xs text-slate-500">{alert.symbol} — {alert.type.replace(/_/g, ' ')}</div>
                    </div>
                  </div>
                  {alert.value && (
                    <span className="text-xs font-mono text-slate-400">${alert.value}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
