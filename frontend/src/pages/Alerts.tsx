import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Power, Mail, MailX, Bell, AlertCircle, Sparkles } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { EmptyState, LoadingSpinner, PageContainer, PageHeader } from '../components/ui';
import { AlertType } from '../types';

const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  price_above: 'Price Above',
  price_below: 'Price Below',
  rsi_above: 'RSI Above',
  rsi_below: 'RSI Below',
  macd_bullish: 'MACD Bullish Crossover',
  macd_bearish: 'MACD Bearish Crossover',
  signal_buy: 'Signal Changes to BUY',
  signal_sell: 'Signal Changes to SELL',
  accumulation_zone: 'Price Enters Accumulation Zone',
  stop_loss_hit: 'Stop Loss Hit',
  target_hit: 'Target Price Hit',
};

const NUMERIC_TYPES = ['price_above', 'price_below', 'rsi_above', 'rsi_below', 'stop_loss_hit', 'target_hit'];

const AlertsPage: React.FC = () => {
  const { alerts, alertsLoading, fetchAlerts, createAlert, updateAlert, deleteAlert } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    symbol: '', type: 'price_above' as AlertType, value: '', notifyEmail: false, emailAddress: '', name: '',
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAlert({
      symbol: form.symbol.toUpperCase(),
      type: form.type,
      value: form.value ? parseFloat(form.value) : undefined,
      notifyEmail: form.notifyEmail,
      emailAddress: form.emailAddress || undefined,
      name: form.name || undefined,
    });
    setShowForm(false);
    setForm({ symbol: '', type: 'price_above', value: '', notifyEmail: false, emailAddress: '', name: '' });
  };

  const needsValue = NUMERIC_TYPES.includes(form.type);

  return (
    <PageContainer className="max-w-4xl py-8 space-y-6">
      {/* Header */}
      <PageHeader
        title="Timing Alerts"
        subtitle={`${alerts.filter((a) => a.enabled).length} active triggers configured across watchlist`}
        actions={
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="btn btn-primary px-4 py-2.5 rounded-xl text-xs"
          >
            <Plus className="w-4.5 h-4.5" /> Create Alert Rule
          </button>
        }
      />

      {/* Create Alert Form Card */}
      {showForm && (
        <div className="card bg-surface-900 border-slate-850 p-5 md:p-6 space-y-4 slide-up">
          <h2 className="text-base font-bold text-slate-100 border-b border-slate-850 pb-3 flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-brand-400" />
            Configure New Alert Rule
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label">Stock Symbol</label>
                <input
                  className="input font-mono font-bold w-full uppercase"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  maxLength={10}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="label">Alert Name (optional)</label>
                <input
                  className="input w-full"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., AAPL Support Hold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="label">Trigger Condition</label>
                <select
                  className="input w-full bg-slate-950/40 text-slate-100"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AlertType })}
                >
                  {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-surface-900 text-slate-100">{label}</option>
                  ))}
                </select>
              </div>
              {needsValue && (
                <div className="space-y-1.5">
                  <label className="label">
                    {form.type.includes('rsi') ? 'Target RSI Level (0-100)' : 'Target Price Threshold ($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input font-mono w-full"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type.includes('rsi') ? '30' : '150.00'}
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-4 bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.notifyEmail}
                  onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })}
                  className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 bg-slate-950 border-slate-800"
                />
                <span className="text-sm font-semibold text-slate-200">Enable Email Notification</span>
              </label>
              {form.notifyEmail && (
                <input
                  type="email"
                  className="input flex-1 py-2"
                  value={form.emailAddress}
                  onChange={(e) => setForm({ ...form, emailAddress: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn btn-primary px-5 py-2.5 rounded-xl">Create Alert Rule</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary px-5 py-2.5 rounded-xl">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts Rule Grid */}
      {alertsLoading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : alerts.length === 0 ? (
        <EmptyState 
          icon="🔔" 
          title="No Alert Rules Configured" 
          description="Build price triggers, RSI level crossers, or AI signal upgrade alerts to capture perfect entries." 
        />
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`card flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 md:p-5 bg-surface-900 border-slate-850 transition-all ${
                !alert.enabled ? 'opacity-50' : 'hover:border-slate-800'
              }`}
            >
              <div className="flex items-start md:items-center gap-3.5">
                <div className={`w-2.5 h-2.5 rounded-full mt-2.5 md:mt-0 shrink-0 ${alert.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-brand-500 text-base">{alert.symbol}</span>
                    <span className="font-semibold text-slate-200 text-sm">{alert.name || ALERT_TYPE_LABELS[alert.type as AlertType]}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 font-sans">
                    <span className="font-semibold text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-850">{ALERT_TYPE_LABELS[alert.type as AlertType]}</span>
                    {alert.value && <span className="font-mono font-bold text-indigo-400">@ ${alert.value.toFixed(2)}</span>}
                    <span className="text-slate-500">· Triggered {alert.triggerCount}x</span>
                    {alert.lastTriggered && <span className="text-slate-500">· Last run: {new Date(alert.lastTriggered).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 border-slate-850/60 pt-3 md:pt-0 w-full md:w-auto justify-end">
                {alert.notifyEmail ? (
                  <span className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400" title="Email alerts active"><Mail className="w-4 h-4" /></span>
                ) : (
                  <span className="p-2 rounded-lg bg-slate-950 border border-slate-850 text-slate-600" title="Email alerts disabled"><MailX className="w-4 h-4" /></span>
                )}
                
                <button
                  onClick={() => updateAlert(alert.id, { enabled: !alert.enabled })}
                  className={`btn text-xs py-1.5 px-3 rounded-lg border flex items-center gap-1.5 transition-all select-none cursor-pointer ${
                    alert.enabled 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400' 
                      : 'bg-slate-950 text-slate-450 border-slate-850'
                  }`}
                  title={alert.enabled ? 'Disable' : 'Enable'}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{alert.enabled ? 'Active' : 'Muted'}</span>
                </button>
                
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="btn btn-danger text-xs py-1.5 px-3 rounded-lg"
                  title="Delete Alert Rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default AlertsPage;
