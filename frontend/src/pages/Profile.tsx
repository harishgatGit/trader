import React, { useState, useEffect } from 'react';
import { Shield, Key, Laptop, Clock, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from '../components/ui';

const Profile: React.FC = () => {
  const { user, sessions, fetchSessions, updatePassword, authLoading } = useAppStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState<string | null>(null);
  const [passSuccess, setPassSuccess] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPassError('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match');
      return;
    }

    setPassError(null);
    setPassSuccess(false);

    try {
      await updatePassword(oldPassword, newPassword);
      setPassSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password. Verify old password.');
    }
  };

  // Helper to format User-Agent into readable browser/OS string
  const formatUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown Device';
    
    let browser = 'Other Browser';
    let os = 'Unknown OS';

    // Simple parser
    if (ua.includes('Firefox')) browser = 'Mozilla Firefox';
    else if (ua.includes('Chrome')) browser = 'Google Chrome';
    else if (ua.includes('Safari')) browser = 'Apple Safari';
    else if (ua.includes('Edge')) browser = 'Microsoft Edge';

    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Macintosh')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">User Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage credentials and monitor login sessions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info & Password Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-400" /> Account Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Username</span>
                <span className="text-lg font-bold text-slate-200 font-mono">{user?.username || '—'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</span>
                <span className={`inline-flex mt-1 text-xs font-extrabold px-2 py-0.5 rounded ${
                  user?.role === 'SUPERUSER' 
                    ? 'bg-purple-950/40 text-purple-300 border border-purple-800/40' 
                    : 'bg-brand-950/40 text-brand-300 border border-brand-800/40'
                }`}>
                  {user?.role || 'BASIC'}
                </span>
              </div>
            </div>
            {user?.role === 'BASIC' && (
              <div className="mt-4 p-3 rounded bg-brand-950/20 border border-brand-900/30 text-xs text-brand-400 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-brand-400" />
                <span>
                  <strong>Basic User Constraint:</strong> Basic accounts are limited to a single concurrent session. Logging in on a new device will immediately terminate existing active sessions.
                </span>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg">
            <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-400" /> Update Password
            </h2>

            {passError && (
              <div className="mb-4 p-3 rounded bg-red-950/30 border border-red-500/30 text-red-200 text-sm">
                {passError}
              </div>
            )}

            {passSuccess && (
              <div className="mb-4 p-3 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-sm">
                Password changed successfully. You will be logged out…
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Old Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  disabled={authLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    disabled={authLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn-primary px-4 py-2 font-semibold text-sm tracking-wide shadow-md shadow-brand-500/5"
                >
                  {authLoading ? <LoadingSpinner size="sm" /> : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sessions Monitor Card */}
        <div className="lg:col-span-1">
          <div className="card-glass p-6 border border-slate-800/80 shadow-lg h-full flex flex-col">
            <h2 className="text-lg font-bold text-slate-200 mb-2 flex items-center gap-2">
              <Laptop className="w-5 h-5 text-brand-400" /> Session Monitor
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Monitor active logins. Basic users only support 1 concurrent instance.
            </p>

            <div className="space-y-3 overflow-y-auto flex-1 max-h-[360px] pr-1">
              {sessions.map((s, idx) => (
                <div
                  key={s.id}
                  className={`p-3 rounded border text-xs space-y-1.5 transition ${
                    idx === 0
                      ? 'border-brand-500/30 bg-brand-950/15'
                      : 'border-slate-800 bg-slate-900/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                      <Laptop className="w-3.5 h-3.5 text-slate-400" />
                      {formatUserAgent(s.deviceInfo)}
                    </span>
                    {idx === 0 && (
                      <span className="text-[10px] font-bold bg-brand-500/15 text-brand-400 border border-brand-500/30 px-1.5 py-0.5 rounded">
                        Current Session
                      </span>
                    )}
                  </div>

                  <div className="text-slate-500 space-y-0.5">
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="w-3 h-3 text-slate-600" /> Logged in: {new Date(s.createdAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-[10px]">
                      <Clock className="w-3 h-3 text-slate-600" /> Active: {new Date(s.lastActiveAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              {sessions.length === 0 && (
                <div className="text-center text-slate-500 text-xs py-8">
                  No active session listings found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
