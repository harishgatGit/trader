import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Power, Mail, MailX, Bell } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { EmptyState, LoadingSpinner } from '../components/ui';
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

  useEffect(() => { fetchAlerts(); }, []);

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
    <div className="p-6 space-y-5 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Alerts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{alerts.filter((a) => a.enabled).length} active · {alerts.length} total</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <Plus className="w-4 h-4" /> Create Alert
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="card-glass slide-up">
          <h2 className="text-sm font-semibold text-slate-200 mb-4">New Alert</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Symbol</label>
                <input
                  className="input font-mono font-bold"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                  maxLength={10}
                  required
                />
              </div>
              <div>
                <label className="label">Alert Name (optional)</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My AAPL alert"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Alert Type</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as AlertType })}
                >
                  {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              {needsValue && (
                <div>
                  <label className="label">
                    {form.type.includes('rsi') ? 'RSI Level' : 'Price ($)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="input font-mono"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder={form.type.includes('rsi') ? '30' : '185.00'}
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.notifyEmail}
                  onChange={(e) => setForm({ ...form, notifyEmail: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-300">Email notification</span>
              </label>
              {form.notifyEmail && (
                <input
                  type="email"
                  className="input flex-1"
                  value={form.emailAddress}
                  onChange={(e) => setForm({ ...form, emailAddress: e.target.value })}
                  placeholder="your@email.com"
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">Create Alert</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Alerts List */}
      {alertsLoading ? (
        <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
      ) : alerts.length === 0 ? (
        <EmptyState icon="🔔" title="No alerts configured" description="Create your first price or signal alert" />
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`card flex items-center justify-between gap-4 transition-all ${!alert.enabled ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${alert.enabled ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-brand-400 text-sm">{alert.symbol}</span>
                    <span className="text-slate-300 text-sm">{alert.name || ALERT_TYPE_LABELS[alert.type as AlertType]}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <span>{ALERT_TYPE_LABELS[alert.type as AlertType]}</span>
                    {alert.value && <span className="font-mono">@ ${alert.value}</span>}
                    <span>· Triggered {alert.triggerCount}x</span>
                    {alert.lastTriggered && <span>· Last: {new Date(alert.lastTriggered).toLocaleDateString()}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {alert.notifyEmail ? (
                  <span title="Email notifications on"><Mail className="w-4 h-4 text-brand-400" /></span>
                ) : (
                  <span title="Email notifications off"><MailX className="w-4 h-4 text-slate-600" /></span>
                )}
                <button
                  onClick={() => updateAlert(alert.id, { enabled: !alert.enabled })}
                  className={`btn-ghost text-xs py-1 ${alert.enabled ? 'text-emerald-400' : 'text-slate-500'}`}
                  title={alert.enabled ? 'Disable' : 'Enable'}
                >
                  <Power className="w-3.5 h-3.5" />
                  {alert.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="btn-danger text-xs py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
