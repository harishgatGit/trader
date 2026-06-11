import React, { useEffect, useState } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Search, RefreshCw, BarChart2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { RatingBadge, EmptyState, LoadingSpinner } from '../components/ui';

const Watchlist: React.FC = () => {
  const { watchlist, fetchWatchlist, addToWatchlist, removeFromWatchlist, watchlistLoading, runAnalysis, analyzing } = useAppStore();
  const [newSymbol, setNewSymbol] = useState('');
  const [analyzingSymbol, setAnalyzingSymbol] = useState<string | null>(null);

  useEffect(() => { fetchWatchlist(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    await addToWatchlist(newSymbol.trim().toUpperCase());
    setNewSymbol('');
  };

  const handleAnalyze = async (symbol: string) => {
    setAnalyzingSymbol(symbol);
    try { await runAnalysis(symbol); await fetchWatchlist(); }
    finally { setAnalyzingSymbol(null); }
  };

  return (
    <div className="p-6 space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Watchlist</h1>
          <p className="text-sm text-slate-500 mt-0.5">{watchlist.length} symbols tracked</p>
        </div>
      </div>

      {/* Add Symbol */}
      <div className="card-glass">
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Add ticker (e.g. AAPL)"
              className="input pl-9 font-mono"
              maxLength={10}
            />
          </div>
          <button type="submit" className="btn-primary">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>

      {/* Table */}
      {watchlistLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : watchlist.length === 0 ? (
        <EmptyState icon="⭐" title="Your watchlist is empty" description="Add symbols to start tracking them" />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Price</th>
                <th>Rating</th>
                <th>Last Analyzed</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((item) => (
                <tr key={item.symbol} onClick={() => {}} className="cursor-default">
                  <td>
                    <Link to={`/stocks/${item.symbol}`} state={{ from: 'watchlist' }} className="font-bold font-mono text-brand-400 hover:text-brand-300">
                      {/* @ts-ignore */}
                      <ViewTransition name={`stock-symbol-watchlist-${item.symbol}`} share="text-morph" default="none">
                        <span>{item.symbol}</span>
                      </ViewTransition>
                    </Link>
                  </td>
                  <td className="font-mono">
                    {item.latestPrice ? `$${item.latestPrice.toFixed(2)}` : '—'}
                  </td>
                  <td>
                    {item.latestRating ? <RatingBadge rating={item.latestRating} /> : <span className="text-slate-600 text-xs">Not analyzed</span>}
                  </td>
                  <td className="text-slate-500 text-xs">
                    {item.lastAnalyzedAt ? new Date(item.lastAnalyzedAt).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAnalyze(item.symbol)}
                        disabled={analyzingSymbol === item.symbol || analyzing}
                        className="btn-ghost text-xs py-1"
                      >
                        {analyzingSymbol === item.symbol ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        Analyze
                      </button>
                      <Link to={`/stocks/${item.symbol}`} state={{ from: 'watchlist' }} className="btn-ghost text-xs py-1">
                        <BarChart2 className="w-3 h-3" />
                        View
                      </Link>
                      <button
                        onClick={() => removeFromWatchlist(item.symbol)}
                        className="btn-danger text-xs py-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
