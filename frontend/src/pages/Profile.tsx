import React, { useState, useEffect } from 'react';
import { Shield, Key, Laptop, Clock, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner, PageContainer, PageHeader, SectionHeader, ResponsiveGrid, InsightCard } from '../components/ui';

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
    <PageContainer>
      <PageHeader
        title="User Profile"
        subtitle="Manage credentials and monitor login sessions"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info & Password Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Info */}
          <div className="card shadow-lg">
            <SectionHeader
              title="Account Settings"
              badge={
                <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                  user?.role === 'SUPERUSER' 
                    ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' 
                    : 'bg-brand-500/10 text-brand-505 dark:text-brand-400 border-brand-500/20'
                }`}>
                  {user?.role || 'BASIC'}
                </span>
              }
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <span className="block text-xs font-bold text-slate-450 uppercase tracking-wider">Username</span>
                <span className="text-lg font-bold text-slate-100 font-mono mt-0.5 block">{user?.username || '—'}</span>
              </div>
            </div>
            {user?.role === 'BASIC' && (
              <div className="mt-5 p-4 rounded-xl bg-brand-500/3 border border-brand-500/10 text-xs text-slate-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-brand-500 dark:text-brand-400" />
                <span className="leading-relaxed">
                  <strong className="text-brand-500 dark:text-brand-400 font-semibold mr-1">Basic User Constraint:</strong>
                  Basic accounts are limited to a single concurrent session. Logging in on a new device will immediately terminate existing active sessions.
                </span>
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="card shadow-lg">
            <SectionHeader
              title="Update Password"
              subtitle="Change your security credentials safely."
            />

            {passError && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium">
                {passError}
              </div>
            )}

            {passSuccess && (
              <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                Password changed successfully. You will be logged out…
              </div>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">
                  Old Password
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="input w-full"
                  placeholder="••••••••"
                  disabled={authLoading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input w-full"
                    placeholder="••••••••"
                    disabled={authLoading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input w-full"
                    placeholder="••••••••"
                    disabled={authLoading}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="btn btn-primary shadow-md shadow-brand-500/5 font-bold px-5"
                >
                  {authLoading ? <LoadingSpinner size="sm" /> : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sessions Monitor Card */}
        <div className="lg:col-span-1">
          <div className="card shadow-lg h-full flex flex-col justify-between">
            <div>
              <SectionHeader
                title="Session Monitor"
                subtitle="Monitor active logins. Basic users only support 1 concurrent instance."
              />

              <div className="space-y-3 overflow-y-auto max-h-[360px] pr-1 mt-4">
                {sessions.map((s, idx) => (
                  <div
                    key={s.id}
                    className={`p-3.5 rounded-xl border text-xs space-y-2 transition ${
                      idx === 0
                        ? 'border-brand-500/30 bg-brand-500/5 dark:bg-brand-950/15'
                        : 'border-slate-800 bg-slate-900/10 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-200 flex items-center gap-1.5 font-mono truncate">
                        <Laptop className="w-3.5 h-3.5 text-slate-450 shrink-0" />
                        {formatUserAgent(s.deviceInfo)}
                      </span>
                      {idx === 0 && (
                        <span className="text-[9px] font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-lg shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    <div className="text-slate-450 space-y-1 text-[10px] border-t border-slate-850/50 pt-2">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Logged in: {new Date(s.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Active: {new Date(s.lastActiveAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {sessions.length === 0 && (
                  <div className="text-center text-slate-550 text-xs py-8">
                    No active session listings found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default Profile;
