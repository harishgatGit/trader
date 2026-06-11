import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User as UserIcon, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from '../components/ui';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login, authLoading, user } = useAppStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already logged in as superuser, go to admin panel immediately
  useEffect(() => {
    if (user) {
      if (user.role === 'SUPERUSER') {
        navigate('/admin', { replace: true });
      } else {
        // Logged in but wrong role — tell them
        setErrorMsg('Your account does not have administrator privileges.');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }
    setErrorMsg(null);
    try {
      await login(username.trim(), password);
      // redirect is handled by the useEffect above after user loads
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid credentials. Access denied.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
      {/* Animated background grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,212,170,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,170,0.8) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Radial glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

      {/* Corner accent — top-left */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-brand-500/20 rounded-br-none" />
      {/* Corner accent — bottom-right */}
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-brand-500/20" />

      <div className="relative z-10 w-full max-w-sm px-6">

        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-5 relative">
            <img
              src="/brand/icon_256.png"
              alt="InvestingAtti"
              className="w-20 h-20 object-contain drop-shadow-2xl"
            />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            InvestingAtti Admin
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Restricted access · Superuser credentials required
          </p>

          {/* Divider with label */}
          <div className="flex items-center gap-3 mt-5">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-800 to-slate-800" />
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2">Secure Login</span>
            <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-800 to-slate-800" />
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl shadow-slate-950/60">

          {/* Error */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="admin-username" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Administrator Username
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  disabled={authLoading}
                  className="input pl-10 text-sm w-full bg-slate-950/60 border-slate-700/60 focus:border-brand-500/60 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="admin-password" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={authLoading}
                  className="input pl-10 pr-10 text-sm w-full bg-slate-950/60 border-slate-700/60 focus:border-brand-500/60 placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="admin-login-btn"
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-brand-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {authLoading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Access Admin Panel
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer note */}
        <p className="mt-5 text-center text-[11px] text-slate-600">
          Standard user?{' '}
          <a href="/" className="text-brand-500/70 hover:text-brand-400 transition-colors font-medium">
            Back to landing page →
          </a>
        </p>

        {/* Security warning strip */}
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-700">
          <Lock className="w-3 h-3" />
          All admin sessions are monitored and logged
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
