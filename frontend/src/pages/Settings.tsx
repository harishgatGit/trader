import React, { useEffect, useState } from 'react';
import { riskSettingsApi, healthApi } from '../services/api';
import { LoadingSpinner, PageContainer, PageHeader } from '../components/ui';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Save, Key, ShieldCheck } from 'lucide-react';

const Settings: React.FC = () => {
  const [riskSettings, setRiskSettings] = useState<any>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [risk, status] = await Promise.allSettled([
        riskSettingsApi.get(),
        healthApi.status(),
      ]);
      if (risk.status === 'fulfilled') setRiskSettings(risk.value);
      if (status.status === 'fulfilled') setApiStatus(status.value);
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await healthApi.status();
      setApiStatus(status);
    } finally {
      setStatusLoading(false);
    }
  };

  const saveRiskSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        maxPositionSizePct: riskSettings.maxPositionSizePct,
        maxLossPerTradePct: riskSettings.maxLossPerTradePct,
        minRiskReward: riskSettings.minRiskReward,
        requireStopLoss: riskSettings.requireStopLoss,
        blockDuplicateWindow: riskSettings.blockDuplicateWindow,
        maxDailyOrders: riskSettings.maxDailyOrders,
      };
      await riskSettingsApi.update(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </PageContainer>
    );
  }

  const statusIcon = (status: string) => {
    if (status === 'connected') return <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />;
    if (status === 'unconfigured') return <AlertCircle className="w-4.5 h-4.5 text-amber-500" />;
    return <XCircle className="w-4.5 h-4.5 text-rose-500" />;
  };

  return (
    <PageContainer className="max-w-3xl py-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Settings"
        subtitle="Configure risk variables, order parameters, and review system diagnostics"
      />

      {/* API Connections Health Card */}
      <div className="card bg-surface-900 border-slate-850 p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <RefreshCw className="w-4.5 h-4.5 text-brand-400" />
            API Connection Status
          </h2>
          <button 
            onClick={refreshStatus} 
            disabled={statusLoading} 
            className="btn btn-secondary text-xs py-1.5 px-3 rounded-lg"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            Refresh Diagnostics
          </button>
        </div>

        {apiStatus ? (
          <div className="space-y-1">
            {Object.entries(apiStatus.services).map(([key, svc]: [string, any]) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-slate-850/40 last:border-0 hover:bg-slate-950/20 px-2 rounded-xl transition-all">
                <div className="flex items-center gap-2.5">
                  {statusIcon(svc.status)}
                  <span className="text-sm font-semibold text-slate-200 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className={`text-xs font-bold  ${
                    svc.status === 'connected' ? 'text-emerald-500' : svc.status === 'unconfigured' ? 'text-amber-500' : 'text-rose-500'
                  }`}>
                    {svc.status}
                  </span>
                  {svc.latencyMs && <span className="text-xs text-slate-500 font-mono">({svc.latencyMs}ms)</span>}
                  {svc.note && <span className="text-xs text-slate-450">· {svc.note}</span>}
                  {svc.message && <span className="text-xs text-rose-500 block">{svc.message}</span>}
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t border-slate-850 text-xs text-slate-500 space-y-2">
              <div className="flex items-center justify-between">
                <span>Active OpenAI Model:</span>
                <span className="font-mono text-slate-300 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-lg">{apiStatus.config?.openaiModel || 'gpt-4o'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Broker Position Limit:</span>
                <span className="font-mono text-slate-300 font-bold bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-lg">{apiStatus.config?.maxPositionSizePct}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Email Notifications Agent:</span>
                <span className={`font-bold ${apiStatus.config?.emailConfigured ? 'text-emerald-500' : 'text-slate-500'}`}>
                  {apiStatus.config?.emailConfigured ? 'Configured' : 'Offline / Missing Key'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">Failed to run probe diagnostics.</p>
        )}
      </div>

      {/* Risk Management Parameters Card */}
      {riskSettings && (
        <div className="card bg-surface-900 border-slate-850 p-5 md:p-6 space-y-4">
          <h2 className="text-base font-bold text-slate-100 border-b border-slate-850 pb-3 flex items-center gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-indigo-400" />
            Risk Management Rules
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label">Max Position Size (%)</label>
                <input
                  type="number"
                  className="input font-mono w-full"
                  min={1} max={100} step={0.5}
                  value={riskSettings.maxPositionSizePct}
                  onChange={(e) => setRiskSettings({ ...riskSettings, maxPositionSizePct: parseFloat(e.target.value) })}
                />
                <span className="text-[10px] text-slate-500 block">Max portfolio allocation limit per trade</span>
              </div>
              
              <div className="space-y-1.5">
                <label className="label">Max Loss Per Trade (%)</label>
                <input
                  type="number"
                  className="input font-mono w-full"
                  min={0.5} max={20} step={0.5}
                  value={riskSettings.maxLossPerTradePct}
                  onChange={(e) => setRiskSettings({ ...riskSettings, maxLossPerTradePct: parseFloat(e.target.value) })}
                />
                <span className="text-[10px] text-slate-500 block">Max allowed drawdown risk per trade</span>
              </div>

              <div className="space-y-1.5">
                <label className="label">Min Risk/Reward Ratio</label>
                <input
                  type="number"
                  className="input font-mono w-full"
                  min={1} max={10} step={0.5}
                  value={riskSettings.minRiskReward}
                  onChange={(e) => setRiskSettings({ ...riskSettings, minRiskReward: parseFloat(e.target.value) })}
                />
                <span className="text-[10px] text-slate-500 block">Minimum acceptable reward factor</span>
              </div>

              <div className="space-y-1.5">
                <label className="label">Max Daily Orders Limit</label>
                <input
                  type="number"
                  className="input font-mono w-full"
                  min={1} max={100}
                  value={riskSettings.maxDailyOrders}
                  onChange={(e) => setRiskSettings({ ...riskSettings, maxDailyOrders: parseInt(e.target.value) })}
                />
                <span className="text-[10px] text-slate-500 block">Cap on daily executed orders</span>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-slate-950/45 p-3 rounded-xl border border-slate-850">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={riskSettings.requireStopLoss}
                  onChange={(e) => setRiskSettings({ ...riskSettings, requireStopLoss: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-slate-950 border-slate-800"
                />
                <span className="text-sm font-semibold text-slate-300">Enforce Hard Stop Loss on all entries</span>
              </label>
            </div>

            <button
              onClick={saveRiskSettings}
              disabled={saving}
              className="btn btn-primary px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Saving Configuration…</span>
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Configuration Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Risk Variables</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Env variables list info */}
      <div className="card bg-surface-900 border-slate-850 p-5 md:p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-100 border-b border-slate-850 pb-3 flex items-center gap-2">
          <Key className="w-4.5 h-4.5 text-amber-500" />
          Environment Setup Reference
        </h2>
        <div className="divide-y divide-slate-850/60 font-mono text-[11px] leading-relaxed">
          {[
            ['OPENAI_API_KEY', 'sk-...', 'AI research generation key'],
            ['ALPACA_API_KEY', 'PK...', 'Broker client identity key'],
            ['ALPACA_SECRET_KEY', '••••••••', 'Broker client authentication key'],
            ['DATABASE_URL', 'postgresql://...', 'PostgreSQL connection URL'],
            ['REDIS_URL', 'redis://...', 'Task queue message store URL'],
          ].map(([key, example, desc]) => (
            <div key={key} className="flex flex-col sm:flex-row justify-between py-2 sm:items-center gap-1.5">
              <span className="text-brand-500 font-bold">{key}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-450 font-bold bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">{example}</span>
                <span className="text-slate-550 italic font-sans"># {desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};

export default Settings;
