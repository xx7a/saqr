import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useTranslation } from "@/lib/i18n";

export default function ResetPassword() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'كلمة مرور جديدة | منصة صقر' : 'New password | SAQR', lang === 'ar' ? 'إعادة تعيين كلمة المرور الخاصة بحسابك في منصة صقر.' : 'Reset your SAQR account password.');
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError(lang === 'ar' ? "كلمتا المرور غير متطابقتين" : "Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await base44.auth.resetPassword({ resetToken, newPassword });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || (lang === 'ar' ? "فشل إعادة تعيين كلمة المرور" : "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <AuthLayout
        icon={AlertTriangle}
        title={lang === 'ar' ? 'رابط غير صالح' : 'Invalid link'}
        subtitle={lang === 'ar' ? 'رابط استعادة كلمة المرور مفقود أو غير صالح' : 'Reset password link is missing or invalid'}
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            {lang === 'ar' ? 'اطلب رابطًا جديدًا' : 'Request a new link'}
          </Link>
        }
      >
        <p className="text-sm text-foreground text-center">
          {lang === 'ar' ? 'الرابط الذي استخدمته يبدو غير مكتمل. يرجى طلب رسالة استعادة كلمة مرور جديدة.' : 'The link you used appears incomplete. Please request a new password reset email.'}
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Lock}
      title={lang === 'ar' ? 'كلمة مرور جديدة' : 'New password'}
      subtitle={lang === 'ar' ? 'أدخل كلمة المرور الجديدة أدناه' : 'Enter your new password below'}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pr-10 h-12"
              dir="ltr"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 h-12"
              dir="ltr"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium bg-gradient-primary hover:opacity-90" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              {lang === 'ar' ? 'جارٍ إعادة التعيين...' : 'Resetting...'}
            </>
          ) : (
            t('auth.resetPassword')
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}