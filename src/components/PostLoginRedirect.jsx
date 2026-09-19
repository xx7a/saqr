import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-foreground-secondary">جارٍ تحميل حسابك...</p>
    </div>
  </div>
);

export default function PostLoginRedirect() {
  const { isAuthenticated, isLoadingAuth, authChecked, effectiveRole } = useAuth();

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const oauthToken = hashParams.get('token');

  useEffect(() => {
    if (oauthToken) {
      base44.auth.setToken(oauthToken);

      // Remove token from URL after saving it
      window.history.replaceState({}, '', '/post-login');

      // Reload so AuthContext checks the newly saved token
      window.location.reload();
    }
  }, [oauthToken]);

  if (oauthToken) {
    return <LoadingFallback />;
  }

  if (isLoadingAuth || !authChecked) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={effectiveRole === 'admin' ? '/admin' : '/dashboard'}
      replace
    />
  );
}
