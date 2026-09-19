import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Shield, Lock, CheckCircle2, ChevronLeft, ChevronRight, Sparkles, Target, Wrench, Briefcase,
  AlertCircle, RefreshCw, BookOpen, FileText, XCircle, Play, Compass
} from 'lucide-react';
import Layout from '@/components/Layout';
import { StaggerContainer, StaggerItem, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Specializations() {
  const { t, lang, dir } = useTranslation();
  const [specializations, setSpecializations] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityError, setEligibilityError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    setEligibilityError(false);
    try {
      const specs = await base44.entities.Specialization.list('order', 20);
      setSpecializations(specs || []);

      // Server-side eligibility check — single source of truth
      const res = await base44.functions.invoke('checkSpecializationEligibility', {});
      const data = res?.data || res;
      setEligibility(data);
      setEnrollment(data?.existingEnrollment || null);
    } catch (e) {
      console.error(e);
      setEligibilityError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  const handleEnroll = async (spec) => {
    if (enrolling) return;
    if (spec.availability_status !== 'available') {
      toast.info(lang === 'ar' ? 'هذا التخصص سيكون متاحًا قريبًا' : 'This specialization will be available soon');
      return;
    }
    if (enrollment) {
      toast.info(lang === 'ar' ? 'أنت مسجل في تخصص بالفعل' : 'You are already enrolled in a specialization');
      return;
    }
    setEnrolling(true);
    try {
      const res = await base44.functions.invoke('enrollInSpecialization', {
        specialization_id: spec.id,
      });
      const data = res?.data || res;
      if (data?.already_enrolled) {
        setEnrollment(data.enrollment);
        toast.info(lang === 'ar' ? 'أنت مسجل في تخصص بالفعل' : 'You are already enrolled in a specialization');
      } else if (data?.enrollment) {
        setEnrollment(data.enrollment);
        toast.success(lang === 'ar' ? `تم التسجيل في تخصص ${spec.name_ar}` : `Enrolled in ${spec.name_en || spec.name_ar}`);
        navigate(`/specialization/${spec.id}`);
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (e) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  // Loading state — neutral, no "locked" claim before verification finishes
  if (loading) {
    return (
      <Layout role="student">
        <div className="space-y-6">
          <SkeletonCard className="h-28" />
          <div className="grid md:grid-cols-2 gap-6">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64" />
          </div>
        </div>
      </Layout>
    );
  }

  // Error state — don't claim the student didn't complete; offer retry
  if (eligibilityError) {
    return (
      <Layout role="student">
        <div className="max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-8 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{lang === 'ar' ? 'تعذّر التحقق من أهليتك' : 'Could not verify eligibility'}</h2>
            <p className="text-foreground-secondary text-sm mb-6">
              {lang === 'ar' ? 'لم نتمكن من التحقق من إكمالك للمسار التأسيسي. يرجى إعادة المحاولة.' : 'We could not verify your foundation track completion. Please try again.'}
            </p>
            <button
              onClick={loadData}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium inline-flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> {t('common.retry')}
            </button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  const eligible = eligibility?.eligible === true;
  const missingRequirements = eligibility?.missingRequirements || [];
  const foundationTracks = eligibility?.foundationTracks || [];

  return (
    <Layout role="student">
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-center gap-2 text-sm text-foreground-secondary mb-3">
            <Link to="/dashboard" className="hover:text-foreground">{t('layout.dashboard')}</Link>
            {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            <span>{t('layout.specializations')}</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{lang === 'ar' ? 'اختر تخصصك في الأمن السيبراني' : 'Choose your cybersecurity specialization'}</h1>
          <p className="text-foreground-secondary text-sm">
            {eligible
              ? (lang === 'ar' ? 'أكملت جميع متطلبات المسار التأسيسي! اختر التخصص الذي يناسب ميولك وأهدافك' : 'You have completed all foundation requirements! Choose the specialization that suits your interests and goals')
              : (lang === 'ar' ? 'يجب إكمال جميع متطلبات المسار التأسيسي أولاً قبل اختيار التخصص' : 'You must complete all foundation track requirements before choosing a specialization')}
          </p>
        </motion.div>

        {/* Compass card — shown only after foundation completion */}
        {eligible && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-base p-6 border-primary/20"
          >
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shrink-0">
                <Compass className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground mb-1">{lang === 'ar' ? 'محتار في اختيار تخصصك؟' : 'Unsure about your specialization?'}</h3>
                <p className="text-sm text-foreground-secondary mb-3">
                  {lang === 'ar' ? 'اكتشف المجال الذي كان أداؤك فيه أقوى من خلال «بوصلة صقر» — اختبار توجيهي اختياري يقيس معرفتك ويقترح التخصص المناسب.' : 'Discover the field where you performed best through the SAQR Compass — an optional guided test that measures your knowledge and suggests a specialization.'}
                </p>
                <Link
                  to="/compass"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <Compass className="w-4 h-4" /> {t('compass.start')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Eligibility detail panel */}
        {!eligible && (
          <EligibilityPanel
            foundationTracks={foundationTracks}
            missingRequirements={missingRequirements}
          />
        )}

        {/* Specializations list */}
        {specializations.length === 0 ? (
          <EmptyState icon={Shield} title={lang === 'ar' ? 'لا توجد تخصصات متاحة' : 'No specializations available'} message={lang === 'ar' ? 'سيتم إضافة التخصصات قريبًا' : 'Specializations will be added soon'} />
        ) : (
          <StaggerContainer className="grid md:grid-cols-2 gap-6">
            {specializations.map((spec) => {
              const isAvailable = spec.availability_status === 'available' && eligible;
              const isEnrolled = enrollment?.specialization_id === spec.id;

              return (
                <StaggerItem key={spec.id}>
                  <div className={`card-base p-6 h-full ${!isAvailable && !isEnrolled ? 'opacity-75' : ''}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        {isEnrolled && (
                          <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/30">
                            {lang === 'ar' ? 'مسجل' : 'Enrolled'}
                          </span>
                        )}
                        {spec.availability_status === 'available' ? (
                          <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/30">
                            {t('common.available')}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/30">
                            {t('common.comingSoon')}
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-foreground mb-1">{lang === 'ar' ? spec.name_ar : (spec.name_en || spec.name_ar)}</h3>
                    <p className="text-xs text-foreground-secondary terminal-font mb-3" dir="ltr">{spec.name_en || spec.name_ar}</p>
                    <p className="text-foreground-secondary text-sm leading-relaxed mb-4">{localized(spec, 'description', lang)}</p>

                    {spec.work_nature && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-foreground mb-1">{lang === 'ar' ? 'طبيعة العمل:' : 'Work nature:'}</p>
                        <p className="text-xs text-foreground-secondary">{localized(spec, 'work_nature', lang)}</p>
                      </div>
                    )}

                    {spec.skills && spec.skills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> {lang === 'ar' ? 'المهارات:' : 'Skills:'}</p>
                        <div className="flex flex-wrap gap-1">
                          {spec.skills.map((skill, j) => (
                            <span key={j} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px]">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {spec.tools && spec.tools.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1"><Wrench className="w-3 h-3" /> {lang === 'ar' ? 'الأدوات:' : 'Tools:'}</p>
                        <div className="flex flex-wrap gap-1">
                          {spec.tools.map((tool, j) => (
                            <span key={j} className="px-2 py-0.5 rounded bg-secondary/10 text-secondary text-[10px]">{tool}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {spec.related_jobs && spec.related_jobs.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1"><Briefcase className="w-3 h-3" /> {lang === 'ar' ? 'الوظائف:' : 'Jobs:'}</p>
                        <div className="flex flex-wrap gap-1">
                          {spec.related_jobs.map((job, j) => (
                            <span key={j} className="px-2 py-0.5 rounded bg-card text-foreground-secondary text-[10px]">{job}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-foreground-secondary mb-4">
                      <span>{spec.subject_count || 0} {t('common.subjects')}</span>
                      <span>•</span>
                      <span>{spec.estimated_hours || 0} {t('common.hours')}</span>
                      <span>•</span>
                      <span>{spec.difficulty === 'beginner' ? t('profile.beginner') : spec.difficulty === 'intermediate' ? t('profile.intermediate') : t('profile.advanced')}</span>
                    </div>

                    {isEnrolled ? (
                      <Link
                        to={`/specialization/${spec.id}`}
                        className="w-full py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" /> {t('dashboard.continueLearning')} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Link>
                    ) : isAvailable ? (
                      <button
                        onClick={() => handleEnroll(spec)}
                        disabled={enrolling}
                        className="w-full py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {enrolling ? (lang === 'ar' ? 'جارٍ التسجيل...' : 'Enrolling...') : <>{lang === 'ar' ? 'ابدأ التخصص' : 'Start specialization'} {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</>}
                      </button>
                    ) : (
                      <button disabled className="w-full py-2.5 bg-card border border-border text-foreground-secondary rounded-lg font-medium flex items-center justify-center gap-2 cursor-not-allowed">
                        <Lock className="w-4 h-4" /> {eligible ? t('common.comingSoon') : t('common.locked')}
                      </button>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </Layout>
  );
}

/**
 * Eligibility panel — shows per-track status and specific missing requirements
 * with direct links. Distinguishes "lessons completed" from "track requirements completed".
 */
function EligibilityPanel({ foundationTracks, missingRequirements }) {
  const { t, lang, dir } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-base p-6 space-y-5"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
          <Lock className="w-5 h-5 text-warning" />
        </div>
        <div>
          <h3 className="font-bold text-foreground">{lang === 'ar' ? 'التخصصات مقفلة' : 'Specializations are locked'}</h3>
          <p className="text-sm text-foreground-secondary mt-1">
            {lang === 'ar' ? 'أكمل جميع متطلبات المسار التأسيسي لفتح التخصصات. فيما يلي تفاصيل متطلباتك المتبقية:' : 'Complete all foundation track requirements to unlock specializations. Here are your remaining requirements:'}
          </p>
        </div>
      </div>

      {/* Per-track status */}
      <div className="space-y-3">
        {foundationTracks.map((track) => (
          <div key={track.id} className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {track.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <XCircle className="w-4 h-4 text-warning" />
                )}
                <span className="font-medium text-foreground text-sm">{track.name}</span>
              </div>
              <span className={`text-xs font-medium ${track.isComplete ? 'text-success' : 'text-warning'}`}>
                {track.isComplete ? t('common.completed') : (lang === 'ar' ? 'غير مكتمل' : 'Incomplete')}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-secondary">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {lang === 'ar' ? 'الدروس' : 'Lessons'}: {track.lessonsCompleted}/{track.lessonsTotal}
              </span>
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {lang === 'ar' ? 'الاختبارات' : 'Tests'}: {track.testsPassed}/{track.testsTotal}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Specific missing requirements with direct links */}
      {missingRequirements.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-foreground">{lang === 'ar' ? 'المتطلبات الناقصة' : 'Missing requirements'} ({missingRequirements.length}):</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {missingRequirements.map((req, i) => (
              <Link
                key={`${req.type}-${req.id}-${i}`}
                to={req.link}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors group"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  req.type === 'lesson' ? 'bg-primary/10' : 'bg-gold/10'
                }`}>
                  {req.type === 'lesson' ? (
                    <BookOpen className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-gold" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{req.title}</p>
                  <p className="text-xs text-foreground-secondary">
                    {req.type === 'lesson' ? (lang === 'ar' ? 'درس' : 'Lesson') : (lang === 'ar' ? 'اختبار' : 'Test')} • {req.track_name}
                  </p>
                </div>
                {dir === 'rtl' ? <ChevronLeft className="w-4 h-4 text-foreground-secondary group-hover:text-primary transition-colors shrink-0" /> : <ChevronRight className="w-4 h-4 text-foreground-secondary group-hover:text-primary transition-colors shrink-0" />}
              </Link>
            ))}
          </div>
        </div>
      )}

      {missingRequirements.length === 0 && foundationTracks.length === 0 && (
        <p className="text-sm text-foreground-secondary">
          {lang === 'ar' ? 'لا توجد مسارات تأسيسية منشورة بعد. سيتم فتح التخصصات عند توفر المسار التأسيسي.' : 'No foundation tracks published yet. Specializations will open when the foundation track is available.'}
        </p>
      )}
    </motion.div>
  );
}