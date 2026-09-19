import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useTranslation } from "@/lib/i18n";

export default function Login() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'تسجيل الدخول | منصة صقر' : 'Log in | SAQR', lang === 'ar' ? 'سجّل دخولك إلى منصة صقر لمتابعة رحلتك التعليمية.' : 'Log in to SAQR to continue your learning journey.');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await base44.auth.loginViaEmailPassword(email, password);
      window.location.href = "/post-login";
    } catch (err) {
      setError(err.message || (lang === 'ar' ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/post-login");
  };

  return (
    <AuthLayout
      icon={LogIn}
      title={t('auth.welcomeBack')}
      subtitle={lang === 'ar' ? 'سجّل دخولك إلى حسابك للمتابعة' : 'Sign in to your account to continue'}
      footer={
        <>
          {t('auth.noAccount')}{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >
            {t('auth.createAccount')}
          </Link>
        </>
      }
    >
      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
      >
        <GoogleIcon className="w-5 h-5 ml-2" />
        {t('auth.continueWithGoogle')}
      </Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-foreground-secondary">{t('auth.or')}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm">
          {error}
        </div>
      )}

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
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              {t('auth.loggingIn')}
            </>
          ) : (
            t('auth.signIn')
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}