import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, HelpCircle, AlertOctagon, Newspaper } from 'lucide-react';
import { whatsForTodayApi } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner, EmptyState, PageContainer, PageHeader, ResponsiveGrid, InsightCard, TermTooltip } from '../components/ui';

interface PennyStockItem {
  id: string;
  symbol: string;
  companyName: string;
  price: number;
  changePercent: number;
  volumeSpike: number;
  catalyst: string;
  riskLevel: string;
  liquidityScore: string;
  watchReason: string;
  explanation: string;
}

const PennyStocksToWatch: React.FC = () => {
  const { user } = useAppStore();
  const [stocks, setStocks] = useState<PennyStockItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const data = await whatsForTodayApi.getPennyStocks();
      if (data && typeof data === 'object' && 'pennyStocks' in data) {
        setStocks(data.pennyStocks || []);
        setGeneratedAt(data.generatedAt || null);
        setNextRefreshAt(data.nextRefreshAt || null);
      } else if (Array.isArray(data)) {
        setStocks(data);
      }
    } catch (err) {
      console.error('Failed to load micro-cap catalysts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStocks();
  }, []);

  const handleManualScan = async () => {
    setRefreshing(true);
    try {
      await whatsForTodayApi.triggerPennyStockScan();
      await loadStocks();
    } catch (err) {
      console.error('Failed to trigger manual scan', err);
    } finally {
      setRefreshing(false);
    }
  };

  const isAdmin = user?.role === 'SUPERUSER';

  return (
    <PageContainer>
      {/* Header */}
      <PageHeader
        title="Micro-Cap Catalysts"
        subtitle="Low-priced, highly volatile equities with unusual momentum and volume indicators."
        actions={
          isAdmin ? (
            <button
              onClick={handleManualScan}
              disabled={refreshing || loading}
              className="btn btn-secondary text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Force Scanner Run
            </button>
          ) : undefined
        }
      />

      {/* Critical High-Risk Warn Banner */}
      <div className="card border-l-4 border-amber-500 bg-amber-500/5 p-4 flex items-start sm:items-center gap-3">
        <AlertOctagon className="w-5 h-5 text-amber-550 dark:text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
        <div className="text-xs text-slate-300 leading-relaxed font-sans">
          <strong className="text-amber-600 dark:text-amber-400 font-bold mr-1.5">High Risk Warning:</strong>
          Micro-cap catalysts are highly speculative and present extremely high volatility, thin liquidity, and susceptibility to rapid price manipulation.
        </div>
      </div>

      {/* Cache Status Ribbon */}
      {generatedAt && nextRefreshAt && (
        <div className="card p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-fade-in">
          <div className="flex items-center gap-2 text-slate-350 font-sans">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Status: <strong className="text-emerald-500 dark:text-emerald-400 font-semibold">Cached Scanner Output</strong> (Regenerates once in 2 hours)
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-450 font-mono text-[11px]">
            <div>
              Generated: <strong className="text-slate-300">{new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> ({new Date(generatedAt).toLocaleDateString()})
            </div>
            <div className="hidden sm:block text-slate-800">|</div>
            <div>
              Next Refresh: <strong className="text-amber-600 dark:text-amber-400 font-bold">{new Date(nextRefreshAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Grid listing */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" />
        </div>
      ) : stocks.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No Micro-Cap Catalysts Found"
          description="Run the scan to find momentum micro-cap catalysts"
        />
      ) : (
        <ResponsiveGrid cols={2}>
          {stocks.map((stock) => {
            const isLoss = stock.changePercent < 0;
            const changeStr = stock.changePercent >= 0 ? `+${stock.changePercent.toFixed(2)}%` : `${stock.changePercent.toFixed(2)}%`;
            const changeColor = stock.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-600 dark:text-rose-450 bg-rose-500/10 border-rose-500/20';

            return (
              <div
                key={stock.id}
                className="card hover:border-slate-400 dark:hover:border-slate-700 transition-all duration-350 p-5 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/2 rounded-full blur-2xl group-hover:bg-amber-500/5 transition-all duration-500 pointer-events-none" />

                <div className="space-y-4">
                  {/* Symbol header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xl font-bold text-slate-100 tracking-wider">
                          {stock.symbol}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${changeColor}`}>
                          {changeStr}
                        </span>
                      </div>
                      <h3 className="text-xs text-slate-400 font-medium mt-0.5 truncate max-w-[200px]">
                        {stock.companyName}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-bold text-slate-100">
                        ${stock.price.toFixed(2)}
                      </div>
                      <TermTooltip term="volume">
                        <div className="text-[10px] text-slate-450 font-medium">
                          Vol Spike: <span className="text-amber-600 dark:text-amber-400 font-bold font-mono">{stock.volumeSpike.toFixed(1)}x</span>
                        </div>
                      </TermTooltip>
                    </div>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/10 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-450 block mb-0.5">Risk Level</span>
                      <span className="text-rose-600 dark:text-rose-450 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                        {stock.riskLevel}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-450 block mb-0.5">Liquidity Score</span>
                      <span className="text-slate-250 dark:text-slate-300 font-bold">{stock.liquidityScore}</span>
                    </div>
                  </div>

                  {/* Layman Description */}
                  <div className="bg-brand-500/3 border border-brand-500/10 p-3 rounded-xl">
                    <p className="text-xs text-slate-300 leading-relaxed font-sans italic">
                      {stock.explanation}
                    </p>
                  </div>

                  {/* Scanner details grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Watch Reason */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 tracking-wider mb-1.5 flex items-center gap-1.5 ">
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        Scanner Trigger
                      </h4>
                      <p className="text-xs text-slate-350 leading-relaxed font-sans bg-slate-950/20 p-2.5 rounded-lg border border-slate-850 h-full">
                        {stock.watchReason}
                      </p>
                    </div>

                    {/* Catalyst */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 tracking-wider mb-1.5 flex items-center gap-1.5 ">
                        <Newspaper className="w-3.5 h-3.5 text-slate-400" />
                        News Catalyst
                      </h4>
                      <p className="text-xs text-slate-350 leading-relaxed font-sans bg-slate-950/20 p-2.5 rounded-lg border border-slate-850 h-full">
                        {stock.catalyst}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </ResponsiveGrid>
      )}
    </PageContainer>
  );
};

export default PennyStocksToWatch;
