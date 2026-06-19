import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User as UserIcon, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from '../components/ui';
import { useGoogleOAuth } from '../utils/useGoogleOAuth';
import { useMicrosoftOAuth } from '../utils/useMicrosoftOAuth';
import { useSEO } from '../utils/useSEO';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, socialLogin, authLoading, user } = useAppStore();

  useSEO({
    title: 'Sign Up | Investing Atti',
    description: 'Create a free account on Investing Atti to start researching stocks, tracking market indicators, and building watchlists.',
    robots: 'noindex, nofollow',
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // If already logged in (e.g. immediately after Google/MS signup), redirect
  useEffect(() => {
    if (user) {
      navigate(user.role === 'SUPERUSER' ? '/' : '/analyze', { replace: true });
    }
  }, [user, navigate]);

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleOAuthError = useCallback((msg: string) => setErrorMsg(msg), []);

  const handleGoogleCode = useCallback(async (code: string) => {
    setErrorMsg(null);
    setOauthLoading(true);
    try {
      await socialLogin({ code }, 'google');
      // redirect handled by useEffect
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-up failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  }, [socialLogin]);

  const { triggerGoogleLogin, googleConfigured } = useGoogleOAuth(handleGoogleCode, handleOAuthError);

  // ── Microsoft OAuth ─────────────────────────────────────────────────────────
  const handleMicrosoftIdToken = useCallback(async (idToken: string) => {
    setErrorMsg(null);
    setOauthLoading(true);
    try {
      await socialLogin({ idToken }, 'microsoft');
      // redirect handled by useEffect
    } catch (err: any) {
      setErrorMsg(err.message || 'Microsoft sign-up failed. Please try again.');
    } finally {
      setOauthLoading(false);
    }
  }, [socialLogin]);

  const { triggerMicrosoftLogin, microsoftConfigured } = useMicrosoftOAuth(handleMicrosoftIdToken, handleOAuthError);

  // ── Username / Password registration ───────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !confirmPassword) {
      setErrorMsg('All fields are required');
      return;
    }
    if (username.length < 3) {
      setErrorMsg('Username must be at least 3 characters long');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setErrorMsg(null);
    try {
      await register(username, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Username may be taken.');
    }
  };

  const isLoading = authLoading || oauthLoading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 py-12 px-4 relative overflow-hidden transition-colors duration-200">
      {/* Decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-brand-500/10 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-brand-500/10 pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-5">
            <img src="/brand/icon_256.png" alt="InvestingAtti" className="w-20 h-20 object-contain drop-shadow-lg" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Create your account</h1>
          <p className="mt-1.5 text-xs text-slate-450 font-medium">
            Join InvestingAtti — free market analysis &amp; AI insights
          </p>
          <div className="flex items-center gap-3 mt-6">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-[10px] font-bold text-slate-450 tracking-widest px-2">SIGN UP</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>
        </div>

        {/* Card */}
        <div className="card p-8 border border-slate-800 shadow-2xl">

          {/* Success state */}
          {success ? (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-100">Account Created!</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto font-medium">
                Your account was created. Redirecting to sign in…
              </p>
            </div>
          ) : (
            <>
              {/* Error banner */}
              {errorMsg && (
                <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* ── Social signup buttons ─────────────────────────────────── */}
              <div className="flex flex-col gap-2.5 mb-5">

                {/* Google */}
                <button
                  type="button"
                  id="google-signup-btn"
                  onClick={triggerGoogleLogin}
                  disabled={isLoading || !googleConfigured}
                  title={!googleConfigured ? 'Google sign-up not configured' : 'Sign up instantly with your Google account'}
                  className="relative flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-850 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {oauthLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  )}
                  Sign up with Google
                </button>

                {/* Microsoft */}
                <button
                  type="button"
                  id="microsoft-signup-btn"
                  onClick={triggerMicrosoftLogin}
                  disabled={isLoading || !microsoftConfigured}
                  title={!microsoftConfigured ? 'Microsoft sign-up not configured' : 'Sign up with your Microsoft account'}
                  className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-850 text-sm font-semibold text-slate-300 hover:text-slate-100 transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {oauthLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                      <rect fill="#F25022" x="1" y="1" width="10" height="10" />
                      <rect fill="#00A4EF" x="1" y="12" width="10" height="10" />
                      <rect fill="#7FBA00" x="12" y="1" width="10" height="10" />
                      <rect fill="#FFB900" x="12" y="12" width="10" height="10" />
                    </svg>
                  )}
                  Sign up with Microsoft
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] font-bold text-slate-500 tracking-wider">OR CREATE WITH EMAIL</span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              {/* ── Username / Password form ─────────────────────────────── */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 tracking-wider mb-2">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Choose a username (min 3 chars)"
                      className="input pl-10 w-full"
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 tracking-wider mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="input pl-10 pr-10 w-full"
                      disabled={isLoading}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors cursor-pointer" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 tracking-wider mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      className="input pl-10 pr-10 w-full"
                      disabled={isLoading}
                    />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-350 transition-colors cursor-pointer" tabIndex={-1}>
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="register-btn"
                  disabled={isLoading}
                  className="w-full btn btn-primary py-3 flex items-center justify-center gap-2 font-bold text-sm shadow-md shadow-brand-500/10 mt-2"
                >
                  {authLoading ? (
                    <><LoadingSpinner size="sm" />Creating Account…</>
                  ) : (
                    <><UserPlus className="w-4 h-4" />Create Account</>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs border-t border-slate-800 pt-5">
                <span className="text-slate-450">Already have an account? </span>
                <Link to="/login" className="font-bold text-brand-500 hover:text-brand-600 transition">Sign in</Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold tracking-wider">
          <Lock className="w-3.5 h-3.5" />
          Secure encrypted session
        </div>
      </div>
    </div>
  );
};

export default Register;
