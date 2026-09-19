import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, Loader2, Eye, EyeOff, User } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import { usePageMeta } from "@/hooks/usePageMeta";
import { useTranslation } from "@/lib/i18n";

export default function Register() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'إنشاء حساب | منصة صقر' : 'Create account | SAQR', lang === 'ar' ? 'أنشئ حسابًا في منصة صقر وابدأ رحلتك في تعلم الأمن السيبراني.' : 'Create a SAQR account and start your cybersecurity learning journey.');
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = lang === 'ar' ? "الاسم مطلوب" : "Name is required";
    if (!email.trim()) {
      errs.email = lang === 'ar' ? "البريد الإلكتروني مطلوب" : "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = lang === 'ar' ? "البريد الإلكتروني غير صحيح" : "Invalid email";
    }
    if (!password) {
      errs.password = lang === 'ar' ? "كلمة المرور مطلوبة" : "Password is required";
    } else if (password.length < 8) {
      errs.password = lang === 'ar' ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = lang === 'ar' ? "كلمتا المرور غير متطابقتين" : "Passwords do not match";
    }
    if (!agreeTerms) {
      errs.terms = lang === 'ar' ? "يجب الموافقة على الشروط وسياسة الخصوصية" : "You must agree to the terms and privacy policy";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setErrors({ form: err.message || (lang === 'ar' ? "فشل التسجيل" : "Registration failed") });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
        // Save full name after token is set
        if (fullName.trim()) {
          try {
            await base44.auth.updateMe({ full_name: fullName.trim() });
          } catch {
            // Non-critical — continue
          }
        }
      }
      window.location.href = "/post-login";
    } catch (err) {
      setErrors({ form: err.message || (lang === 'ar' ? "رمز التحقق غير صحيح" : "Invalid verification code") });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setErrors({});
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: lang === 'ar' ? "تم إرسال الرمز" : "Code sent",
        description: lang === 'ar' ? "تحقق من بريدك الإلكتروني للحصول على الرمز الجديد." : "Check your email for the new code.",
      });
    } catch (err) {
      setErrors({ form: err.message || (lang === 'ar' ? "فشل إعادة إرسال الرمز" : "Failed to resend code") });
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/post-login");
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title={lang === 'ar' ? "تأكيد بريدك الإلكتروني" : "Confirm your email"}
        subtitle={lang === 'ar' ? `أرسلنا رمزًا إلى ${email}` : `We sent a code to ${email}`}
      >
        {errors.form && (
          <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm" role="alert">
            {errors.form}
          </div>
        )}
        <div className="flex justify-center mb-6" dir="ltr">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium bg-gradient-primary hover:opacity-90"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              {lang === 'ar' ? 'جارٍ التحقق...' : 'Verifying...'}
            </>
          ) : (
            lang === 'ar' ? "تأكيد" : "Confirm"
          )}
        </Button>
        <p className="text-center text-sm text-foreground-secondary mt-4">
          {lang === 'ar' ? 'لم يصلك الرمز؟' : "Didn't get the code?"}{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            {lang === 'ar' ? 'إعادة الإرسال' : 'Resend'}
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title={t('auth.createAccount')}
      subtitle={lang === 'ar' ? 'سجّل الآن لتبدأ رحلتك' : 'Register now to start your journey'}
      footer={
        <>
          {t('auth.haveAccount')}{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="text-primary font-medium hover:underline"
          >
            {t('auth.signIn')}
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

      {errors.form && (
        <div className="mb-4 p-3 rounded-lg bg-danger/10 text-danger text-sm" role="alert">
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="fullName">{t('auth.fullName')}</Label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
            <Input
              id="fullName"
              type="text"
              autoComplete="name"
              autoFocus
              placeholder={lang === 'ar' ? 'اسمك الكامل' : 'Your full name'}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="pr-10 h-12"
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              required
            />
          </div>
          {errors.fullName && (
            <p id="fullName-error" className="text-xs text-danger" role="alert">{errors.fullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10 h-12"
              dir="ltr"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              required
            />
          </div>
          {errors.email && (
            <p id="email-error" className="text-xs text-danger" role="alert">{errors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10 pl-10 h-12"
              dir="ltr"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? (lang === 'ar' ? "إخفاء كلمة المرور" : "Hide password") : (lang === 'ar' ? "إظهار كلمة المرور" : "Show password")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-xs text-danger" role="alert">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
          <div className="relative">
            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" aria-hidden="true" />
            <Input
              id="confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pr-10 pl-10 h-12"
              dir="ltr"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label={showConfirm ? (lang === 'ar' ? "إخفاء كلمة المرور" : "Hide password") : (lang === 'ar' ? "إظهار كلمة المرور" : "Show password")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-secondary hover:text-foreground transition-colors"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirm-error" className="text-xs text-danger" role="alert">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border accent-primary cursor-pointer"
              aria-invalid={!!errors.terms}
              aria-describedby={errors.terms ? "terms-error" : undefined}
            />
            <span className="text-sm text-foreground-secondary leading-relaxed">
              {lang === 'ar' ? 'أوافق على' : 'I agree to the'}{" "}
              <Link to="/terms" className="text-primary hover:underline" target="_blank">{lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}</Link>
              {lang === 'ar' ? ' و ' : ' and '}
              <Link to="/privacy" className="text-primary hover:underline" target="_blank">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</Link>
            </span>
          </label>
          {errors.terms && (
            <p id="terms-error" className="text-xs text-danger" role="alert">{errors.terms}</p>
          )}
        </div>

        <Button type="submit" className="w-full h-12 font-medium bg-gradient-primary hover:opacity-90" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              {t('auth.registering')}
            </>
          ) : (
            t('auth.signUp')
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}