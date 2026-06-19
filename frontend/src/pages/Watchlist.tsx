import React, { useEffect, useState } from 'react';
// @ts-ignore
import { ViewTransition } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Search, RefreshCw, BarChart2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner, EmptyState, PageContainer, PageHeader, StatusBadge } from '../components/ui';
import { useSEO } from '../utils/useSEO';

const Watchlist: React.FC = () => {
  const { watchlist, fetchWatchlist, addToWatchlist, removeFromWatchlist, watchlistLoading, runAnalysis, analyzing } = useAppStore();
  const [newSymbol, setNewSymbol] = useState('');
  const [analyzingSymbol, setAnalyzingSymbol] = useState<string | null>(null);

  useSEO({
    title: 'Stock Watchlist | Investing Atti',
    description: 'Monitor your personalized stock watchlists, real-time prices, and AI signal ratings.',
    robots: 'noindex, nofollow',
  });

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;
    await addToWatchlist(newSymbol.trim().toUpperCase());
    setNewSymbol('');
  };

  const handleAnalyze = async (symbol: string) => {
    setAnalyzingSymbol(symbol);
    try {
      await runAnalysis(symbol);
      await fetchWatchlist();
    } finally {
      setAnalyzingSymbol(null);
    }
  };

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Watchlist"
        subtitle={`${watchlist.length} symbols currently tracked for signal alerts`}
      />

      {/* Add Symbol Input */}
      <div className="card bg-surface-900 border-slate-850 p-4">
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder="Add ticker symbol (e.g. AAPL)"
              className="input pl-10 font-mono w-full"
              maxLength={10}
              aria-label="New stock ticker symbol"
            />
          </div>
          <button type="submit" className="btn btn-primary px-5 rounded-xl">
            <Plus className="w-4.5 h-4.5" /> Add Stock
          </button>
        </form>
      </div>

      {/* List / Table Content */}
      {watchlistLoading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : watchlist.length === 0 ? (
        <EmptyState 
          icon="⭐" 
          title="Watchlist is empty" 
          description="Type in a ticker symbol above to start tracking real-time order books and AI ratings." 
        />
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Price</th>
                  <th>AI Rating</th>
                  <th>Last Analyzed</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {watchlist.map((item) => (
                  <tr key={item.symbol} className="hover:bg-slate-950/20">
                    <td>
                      <Link 
                        to={`/stocks/${item.symbol}`} 
                        state={{ from: 'watchlist' }} 
                        className="font-bold font-mono text-brand-500 hover:text-brand-400 text-sm"
                      >
                        {/* @ts-ignore */}
                        <ViewTransition name={`stock-symbol-watchlist-${item.symbol}`} share="text-morph" default="none">
                          <span>{item.symbol}</span>
                        </ViewTransition>
                      </Link>
                    </td>
                    <td className="font-mono font-bold text-slate-200">
                      {item.latestPrice ? `$${item.latestPrice.toFixed(2)}` : '—'}
                    </td>
                    <td>
                      {item.latestRating ? (
                        <StatusBadge status={item.latestRating} size="sm" />
                      ) : (
                        <span className="text-slate-500 text-xs italic">Not analyzed</span>
                      )}
                    </td>
                    <td className="text-slate-500 text-xs">
                      {item.lastAnalyzedAt ? new Date(item.lastAnalyzedAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAnalyze(item.symbol)}
                          disabled={analyzingSymbol === item.symbol || analyzing}
                          className="btn btn-secondary text-xs py-1.5 px-3 rounded-lg"
                        >
                          {analyzingSymbol === item.symbol ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          Analyze
                        </button>
                        <Link 
                          to={`/stocks/${item.symbol}`} 
                          state={{ from: 'watchlist' }} 
                          className="btn btn-secondary text-xs py-1.5 px-3 rounded-lg flex items-center gap-1"
                        >
                          <BarChart2 className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <button
                          onClick={() => removeFromWatchlist(item.symbol)}
                          className="btn btn-danger text-xs py-1.5 px-2.5 rounded-lg"
                          aria-label="Remove from watchlist"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card list view */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {watchlist.map((item) => (
              <div key={item.symbol} className="card p-4 flex flex-col gap-3.5 bg-surface-900 border-slate-850">
                <div className="flex justify-between items-start">
                  <div>
                    <Link 
                      to={`/stocks/${item.symbol}`} 
                      state={{ from: 'watchlist' }} 
                      className="font-bold font-mono text-brand-500 hover:text-brand-400 text-base"
                    >
                      {item.symbol}
                    </Link>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      Analyzed: {item.lastAnalyzedAt ? new Date(item.lastAnalyzedAt).toLocaleDateString() : 'Never'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-200 block text-sm">
                      {item.latestPrice ? `$${item.latestPrice.toFixed(2)}` : '—'}
                    </span>
                    <div className="mt-1">
                      {item.latestRating ? (
                        <StatusBadge status={item.latestRating} size="sm" />
                      ) : (
                        <span className="text-slate-500 text-[10px] italic">Not analyzed</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-slate-850/60 pt-3">
                  <button
                    onClick={() => handleAnalyze(item.symbol)}
                    disabled={analyzingSymbol === item.symbol || analyzing}
                    className="btn btn-secondary text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
                  >
                    {analyzingSymbol === item.symbol ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    Analyze
                  </button>
                  <Link
                    to={`/stocks/${item.symbol}`}
                    state={{ from: 'watchlist' }}
                    className="btn btn-secondary text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    View
                  </Link>
                  <button
                    onClick={() => removeFromWatchlist(item.symbol)}
                    className="btn btn-danger text-xs py-1.5 rounded-lg flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </PageContainer>
  );
};

export default Watchlist;
