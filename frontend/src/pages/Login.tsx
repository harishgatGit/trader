import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from '../components/ui';

/**
 * /login is kept as a valid route but is not shown to users.
 * - If already authenticated → redirect to the appropriate page.
 * - If not authenticated → App.tsx boot sequence handles silent login,
 *   so this page just renders a brief loading indicator and waits.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppStore();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'BASIC' ? '/analyze' : '/dashboard', { replace: true });
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <LoadingSpinner size="lg" />
    </div>
  );
};

export default Login;
