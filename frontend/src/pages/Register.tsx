import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User as UserIcon, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from '../components/ui';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, authLoading } = useAppStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Username may be taken.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-radial-gradient py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 mb-4 shadow-lg shadow-brand-500/10">
            <UserPlus className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Register a standard user account to access market analysis
          </p>
        </div>

        <div className="card-glass p-8 border border-slate-800/80 shadow-2xl relative overflow-hidden">
          {success ? (
            <div className="py-6 text-center space-y-4 animate-fade-in">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-200">Registration Complete!</h3>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Your account was created successfully. Redirecting you to login…
              </p>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mb-6 p-4 rounded-lg bg-red-950/30 border border-red-500/30 text-red-200 text-sm flex gap-3 items-start animate-fade-in">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block mb-0.5">Registration Error</span>
                    {errorMsg}
                  </div>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Username
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        className="input pl-10"
                        disabled={authLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="input pl-10"
                        disabled={authLoading}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your password"
                        className="input pl-10"
                        disabled={authLoading}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 font-semibold text-sm tracking-wide shadow-lg shadow-brand-500/10"
                  >
                    {authLoading ? (
                      <>
                        <LoadingSpinner size="sm" /> Creating Account…
                      </>
                    ) : (
                      'Register'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center text-sm border-t border-slate-800/80 pt-6">
                <span className="text-slate-500">Already have an account? </span>
                <Link
                  to="/login"
                  className="font-medium text-brand-400 hover:text-brand-300 font-semibold transition"
                >
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
