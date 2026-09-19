import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Download, ChevronLeft, ChevronRight, CheckCircle2, Sparkles, X, ExternalLink } from 'lucide-react';
import Layout from '@/components/Layout';
import CertificateTemplate from '@/components/CertificateTemplate';
import { StaggerContainer, StaggerItem, EmptyState, SkeletonCard, AnimatedButton } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function Certificates() {
  const { t, lang, dir } = useTranslation();
  const [certificates, setCertificates] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(null);
  const [viewingCert, setViewingCert] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const certRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [certData, enrollData] = await Promise.all([
        base44.entities.Certificate.filter({ user_id: user.id }, '-issue_date', 20),
        base44.entities.TrackEnrollment.filter({ user_id: user.id }),
      ]);
      setCertificates(certData || []);
      setEnrollments(enrollData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (trackId) => {
    setIssuing(trackId);
    try {
      const res = await base44.functions.invoke('issueCertificate', { track_id: trackId });
      if (res.data?.certificate) {
        if (res.data.already_exists) {
          toast.info(lang === 'ar' ? 'لديك شهادة بهذا المسار بالفعل' : 'You already have a certificate for this track');
        } else {
          toast.success(lang === 'ar' ? 'تم إصدار شهادتك بنجاح! 🎉' : 'Certificate issued successfully! 🎉');
        }
        loadData();
      } else if (res.data?.error) {
        toast.error(res.data.error);
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || (lang === 'ar' ? 'حدث خطأ أثناء الإصدار' : 'An error occurred during issuance'));
    }
    setIssuing(null);
  };

  const downloadPDF = async () => {
    if (!certRef.current || !viewingCert) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 2,
        backgroundColor: '#05080F',
        logging: false,
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const y = (pdfHeight - imgHeight) / 2;
      pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight);
      pdf.save(`SAQR-Certificate-${viewingCert.verification_code}.pdf`);
      toast.success(lang === 'ar' ? 'تم تحميل الشهادة' : 'Certificate downloaded');
    } catch (e) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء تحميل PDF' : 'An error occurred while downloading PDF');
    }
    setDownloading(false);
  };

  if (loading) {
    return (
      <Layout role="student">
        <SkeletonCard className="h-64" />
      </Layout>
    );
  }

  const completedTrackIds = new Set(certificates.map((c) => c.track_id));
  const eligibleTracks = enrollments.filter(
    (e) => e.progress_percent >= 100 && !completedTrackIds.has(e.track_id)
  );

  return (
    <Layout role="student">
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-3">
            <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>{t('certificate.title')}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{lang === 'ar' ? 'شهاداتي' : 'My certificates'}</h1>
          <p className="text-foreground-secondary text-sm">{lang === 'ar' ? 'شهاداتك التي حصلت عليها من منصة صقر' : 'Certificates you earned from the SAQR platform'}</p>
        </motion.div>

        {/* Eligible for issuance */}
        {eligibleTracks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6 border-gold/30"
          >
            <h2 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" /> {lang === 'ar' ? 'شهادات جاهزة للإصدار' : 'Certificates ready for issuance'}
            </h2>
            <p className="text-foreground-secondary text-sm mb-4">{lang === 'ar' ? 'أكملت هذه المسارات — احصل على شهادتك الآن' : 'You completed these tracks — get your certificate now'}</p>
            <div className="space-y-3">
              {eligibleTracks.map((enroll) => (
                <div key={enroll.id} className="flex items-center justify-between p-4 rounded-lg bg-gold/5 border border-gold/20">
                  <div>
                    <p className="font-medium text-foreground">{enroll.track_name}</p>
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {lang === 'ar' ? 'مكتمل 100%' : '100% complete'}
                    </p>
                  </div>
                  <AnimatedButton
                    onClick={() => handleIssue(enroll.track_id)}
                    loading={issuing === enroll.track_id}
                    disabled={issuing !== null && issuing !== enroll.track_id}
                  >
                    {lang === 'ar' ? 'إصدار الشهادة' : 'Issue certificate'}
                  </AnimatedButton>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Certificates list */}
        {certificates.length === 0 && eligibleTracks.length === 0 ? (
          <EmptyState
            icon={Award}
            title={t('certificate.noCertificates')}
            message={lang === 'ar' ? 'أكمل المسارات والتخصصات للحصول على شهاداتك' : 'Complete tracks and specializations to earn your certificates'}
            action={
              <Link to="/tracks" className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium">
                {lang === 'ar' ? 'ابدأ التعلم' : 'Start learning'}
              </Link>
            }
          />
        ) : certificates.length === 0 ? null : (
          <StaggerContainer className="grid md:grid-cols-2 gap-6">
            {certificates.map((cert) => (
              <StaggerItem key={cert.id}>
                <div className="card-base p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-2xl" />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center">
                        <Award className="w-7 h-7 text-gold" />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        cert.certificate_type === 'foundation' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                      }`}>
                        {cert.certificate_type === 'foundation' ? t('certificate.foundation') : t('certificate.specialization')}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {cert.track_name || cert.specialization_name}
                    </h3>
                    <p className="text-sm text-foreground-secondary mb-4">{cert.user_name}</p>

                    <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                      <div className="p-2 rounded-lg bg-card">
                        <p className="text-foreground-secondary mb-0.5">{t('certificate.issuedOn')}</p>
                        <p className="text-foreground font-medium">
                          {new Date(cert.issue_date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                        </p>
                      </div>
                      <div className="p-2 rounded-lg bg-card">
                        <p className="text-foreground-secondary mb-0.5">{t('certificate.verifyCode')}</p>
                        <p className="text-foreground font-medium terminal-font" dir="ltr">{cert.verification_code}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingCert(cert)}
                        className="flex-1 text-center py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium btn-press"
                      >
                        {lang === 'ar' ? 'معاينة الشهادة' : 'Preview certificate'}
                      </button>
                      <Link
                        to={`/verify/${cert.verification_code}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-card border border-border text-foreground rounded-lg text-sm flex items-center gap-1 hover:border-primary/50 transition-colors"
                        title={lang === 'ar' ? 'رابط التحقق العام' : 'Public verification link'}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>

      {/* Certificate preview modal */}
      <AnimatePresence>
        {viewingCert && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingCert(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-background-secondary border border-border rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto" dir={dir}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-foreground">{lang === 'ar' ? 'معاينة الشهادة' : 'Certificate preview'}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadPDF}
                      disabled={downloading}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-1.5 btn-press disabled:opacity-50"
                    >
                      {downloading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {lang === 'ar' ? 'تحميل PDF' : 'Download PDF'}
                    </button>
                    <button onClick={() => setViewingCert(null)} className="p-2 text-foreground-secondary hover:text-foreground">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div ref={certRef}>
                  <CertificateTemplate certificate={viewingCert} />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}