import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useTranslation } from "@/lib/i18n";

export default function ForgotPassword() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'استعادة كلمة المرور | منصة صقر' : 'Reset password | SAQR', lang === 'ar' ? 'استعادة كلمة المرور الخاصة بحسابك في منصة صقر.' : 'Reset your SAQR account password.');
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Always show success regardless
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout
      icon={Mail}
      title={t('auth.forgotPassword')}
      subtitle={lang === 'ar' ? 'سنرسل لك رابطًا لإعادة تعيينها' : 'We will send you a link to reset it'}
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
          <ArrowRight className="w-3 h-3" /> {t('auth.backToLogin')}
        </Link>
      }
    >
      {sent ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-success/10 mb-4">
            <CheckCircle2 className="w-7 h-7 text-success" />
          </div>
          <p className="text-sm text-foreground">
            {t('auth.resetSuccess')}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <div className="relative">
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                {lang === 'ar' ? 'جارٍ الإرسال...' : 'Sending...'}
              </>
            ) : (
              t('auth.sendResetLink')
            )}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}