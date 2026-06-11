import React, { useEffect, useState } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { reportsApi } from '../services/api';
import { Link } from 'react-router-dom';
import { EmptyState, LoadingSpinner, PageContainer, PageHeader, StatusBadge } from '../components/ui';
import { FinalRating } from '../types';
import { Search, Filter, Calendar } from 'lucide-react';

const RATINGS: FinalRating[] = ['BUY', 'HOLD', 'SELL', 'WATCHLIST', 'AVOID'];

const Reports: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterRating, setFilterRating] = useState('');

  useEffect(() => {
    loadReports();
  }, [filterSymbol, filterRating]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const data = await reportsApi.getAll({
        symbol: filterSymbol || undefined,
        rating: filterRating || undefined,
        limit: 50,
      });
      setReports(data as any[]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="AI Reports"
        subtitle="Review and search historically compiled analyst reports"
      />

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
          <input
            className="input pl-10 font-mono w-full"
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value.toUpperCase())}
            placeholder="Filter by Symbol (e.g. AAPL)"
            maxLength={10}
          />
        </div>
        <div className="relative max-w-xs w-full sm:w-auto">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
          <select
            className="input pl-10 pr-8 w-full bg-slate-950/40"
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
          >
            <option value="" className="bg-surface-900">All Ratings</option>
            {RATINGS.map((r) => (
              <option key={r} value={r} className="bg-surface-900">{r}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content List */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon="📊"
          title="No reports matching filters"
          description="Try modifying search options or trigger a new stock analysis report."
          action={<Link to="/analyze" className="btn btn-primary text-xs">Compile Report</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {reports.map((report) => (
            <Link
              key={report.id}
              to={`/stocks/${report.symbol}`}
              state={{ from: 'reports' }}
              className="card flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 bg-surface-900 border-slate-850 hover:border-slate-800 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-center font-bold text-brand-500 font-mono text-sm group-hover:bg-slate-900 transition-colors">
                  {report.symbol.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    {/* @ts-ignore */}
                    <ViewTransition name={`stock-symbol-reports-${report.symbol}`} share="text-morph" default="none">
                      <span className="font-mono font-black text-slate-100 text-sm">{report.symbol}</span>
                    </ViewTransition>
                    <StatusBadge status={report.finalRating} size="sm" />
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 max-w-xl truncate font-sans">
                    {report.executiveSummary || 'No summary text available.'}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 border-t md:border-t-0 border-slate-850/60 pt-2.5 md:pt-0 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                {report.currentPrice && (
                  <div className="text-sm font-mono font-bold text-slate-200">${report.currentPrice.toFixed(2)}</div>
                )}
                <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-650" />
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default Reports;
