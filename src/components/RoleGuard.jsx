import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

const LoadingFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      <p className="text-sm text-foreground-secondary">جارٍ التحقق من الصلاحيات...</p>
    </div>
  </div>
);

export default function RoleGuard({ allowedRole, unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth, authChecked, effectiveRole } = useAuth();

  if (isLoadingAuth || !authChecked) {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement || <Navigate to="/login" replace />;
  }

  if (effectiveRole !== allowedRole) {
    const correctPath = effectiveRole === 'admin' ? '/admin' : '/dashboard';
    if (allowedRole === 'admin') {
      toast.error('ليس لديك صلاحية للوصول إلى لوحة الإدارة');
    } else {
      toast.error('هذا الحساب مخصص لإدارة المنصة');
    }
    return <Navigate to={correctPath} replace />;
  }

  return <Outlet />;
}