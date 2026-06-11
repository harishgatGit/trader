import React, { useEffect, useState } from 'react';
import { riskSettingsApi, healthApi } from '../services/api';
import { LoadingSpinner } from '../components/ui';
import { CheckCircle, XCircle, AlertCircle, Shield, RefreshCw, Save } from 'lucide-react';

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
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  const statusIcon = (status: string) => {
    if (status === 'connected') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === 'unconfigured') return <AlertCircle className="w-4 h-4 text-amber-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="p-6 max-w-3xl space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">API status and risk management configuration</p>
      </div>

      {/* API Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-200">API Connection Status</h2>
          <button onClick={refreshStatus} disabled={statusLoading} className="btn-ghost text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${statusLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {apiStatus ? (
          <div className="space-y-3">
            {Object.entries(apiStatus.services).map(([key, svc]: [string, any]) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
                <div className="flex items-center gap-2">
                  {statusIcon(svc.status)}
                  <span className="text-sm text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-medium ${svc.status === 'connected' ? 'text-emerald-400' : svc.status === 'unconfigured' ? 'text-amber-400' : 'text-red-400'}`}>
                    {svc.status}
                  </span>
                  {svc.latencyMs && <span className="text-xs text-slate-500 ml-2">{svc.latencyMs}ms</span>}
                  {svc.note && <span className="text-xs text-slate-500 ml-2">{svc.note}</span>}
                  {svc.message && <span className="text-xs text-red-400 ml-2">{svc.message}</span>}
                </div>
              </div>
            ))}

            <div className="mt-3 pt-3 border-t border-t-slate-800">
              <div className="text-xs text-slate-500 space-y-1">
                <div>OpenAI Model: <span className="font-mono text-slate-300">{apiStatus.config?.openaiModel}</span></div>
                <div>Max Position Size: <span className="font-mono text-slate-300">{apiStatus.config?.maxPositionSizePct}%</span></div>
                <div>Email Configured: <span className={apiStatus.config?.emailConfigured ? 'text-emerald-400' : 'text-slate-500'}>{apiStatus.config?.emailConfigured ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Unable to load status</div>
        )}
      </div>

      {/* Risk Settings */}
      {riskSettings && (
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">Risk Management Settings</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Max Position Size (%)</label>
                <input
                  type="number"
                  className="input font-mono"
                  min={1} max={100} step={0.5}
                  value={riskSettings.maxPositionSizePct}
                  onChange={(e) => setRiskSettings({ ...riskSettings, maxPositionSizePct: parseFloat(e.target.value) })}
                />
                <div className="text-xs text-slate-500 mt-1">Max % of portfolio per trade</div>
              </div>
              <div>
                <label className="label">Max Loss Per Trade (%)</label>
                <input
                  type="number"
                  className="input font-mono"
                  min={0.5} max={20} step={0.5}
                  value={riskSettings.maxLossPerTradePct}
                  onChange={(e) => setRiskSettings({ ...riskSettings, maxLossPerTradePct: parseFloat(e.target.value) })}
                />
                <div className="text-xs text-slate-500 mt-1">Max loss % from stop loss</div>
              </div>
              <div>
                <label className="label">Min Risk/Reward Ratio</label>
                <input
                  type="number"
                  className="input font-mono"
                  min={1} max={10} step={0.5}
                  value={riskSettings.minRiskReward}
                  onChange={(e) => setRiskSettings({ ...riskSettings, minRiskReward: parseFloat(e.target.value) })}
                />
                <div className="text-xs text-slate-500 mt-1">Minimum required R/R</div>
              </div>
              <div>
                <label className="label">Max Daily Orders</label>
                <input
                  type="number"
                  className="input font-mono"
                  min={1} max={100}
                  value={riskSettings.maxDailyOrders}
                  onChange={(e) => setRiskSettings({ ...riskSettings, maxDailyOrders: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={riskSettings.requireStopLoss}
                  onChange={(e) => setRiskSettings({ ...riskSettings, requireStopLoss: e.target.checked })}
                  className="w-4 h-4 accent-brand-500"
                />
                <span className="text-sm text-slate-300">Require Stop Loss on all orders</span>
              </label>
            </div>

            <button
              onClick={saveRiskSettings}
              disabled={saving}
              className="btn-primary"
            >
              {saving ? <><LoadingSpinner size="sm" /> Saving…</> : saved ? <><CheckCircle className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Risk Settings</>}
            </button>
          </div>
        </div>
      )}

      {/* Environment Variables Guide */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-200 mb-3">Required Environment Variables</h2>
        <div className="space-y-1.5 font-mono text-xs">
          {[
            ['OPENAI_API_KEY', 'sk-...', 'OpenAI API key for AI analysis'],
            ['ALPACA_API_KEY', 'PK...', 'Alpaca API key'],
            ['ALPACA_SECRET_KEY', 'secret', 'Alpaca secret key'],
            ['DATABASE_URL', 'postgresql://...', 'PostgreSQL connection string'],
            ['REDIS_URL', 'redis://...', 'Redis connection URL'],
          ].map(([key, example, desc]) => (
            <div key={key} className="flex items-start gap-3 py-1.5">
              <span className="text-brand-400 shrink-0">{key}</span>
              <span className="text-slate-600">=</span>
              <span className="text-slate-500">{example}</span>
              <span className="text-slate-600 ml-auto text-right"># {desc}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-slate-500">
          Copy <code className="bg-slate-800 px-1 rounded">.env.example</code> to <code className="bg-slate-800 px-1 rounded">.env</code> and fill in your values.
        </div>
      </div>
    </div>
  );
};

export default Settings;
