import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import CertificateTemplate from '@/components/CertificateTemplate';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

export default function VerifyCertificate() {
  const { code } = useParams();
  const { t, lang, dir } = useTranslation();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  usePageMeta(lang === 'ar' ? 'التحقق من الشهادة | منصة صقر' : 'Verify Certificate | SAQR', lang === 'ar' ? 'تحقق من صحة شهادات منصة صقر التعليمية' : 'Verify the validity of SAQR certificates');

  useEffect(() => {
    if (code) verify();
  }, [code]);

  const verify = async () => {
    try {
      const res = await base44.functions.invoke('verifyCertificate', { code });
      setResult(res.data);
    } catch (e) {
      setResult({ valid: false, error: lang === 'ar' ? 'حدث خطأ أثناء التحقق' : 'An error occurred during verification' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <PublicNavbar />
      <div className="pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-foreground-secondary">{lang === 'ar' ? 'جارٍ التحقق من الشهادة...' : 'Verifying certificate...'}</p>
            </div>
          ) : result?.valid ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-success/10 border border-success/30">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm text-success font-medium">{lang === 'ar' ? 'شهادة صالحة وموثقة' : 'Valid verified certificate'}</span>
                </div>
              </div>

              <CertificateTemplate certificate={result} />

              <div className="flex items-center justify-center gap-2 text-xs text-foreground-secondary">
                <Shield className="w-4 h-4 text-primary" />
                <span>{lang === 'ar' ? 'تم التحقق من صحة هذه الشهادة عبر منصة صقر التعليمية' : 'This certificate was verified through the SAQR educational platform'}</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-base p-8 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-danger" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{lang === 'ar' ? 'شهادة غير صالحة' : 'Invalid certificate'}</h1>
              <p className="text-foreground-secondary text-sm mb-6">
                {result?.error || (lang === 'ar' ? 'لم يتم العثور على شهادة بهذا الرقم' : 'No certificate found with this code')}
              </p>
              <Link to="/" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium">
                {lang === 'ar' ? 'العودة للرئيسية' : 'Back to home'}
              </Link>
            </motion.div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}