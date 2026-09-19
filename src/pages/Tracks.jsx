import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Clock, BookOpen, FlaskConical, Bell, Lock, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import NotifyModal from '@/components/NotifyModal';
import { StaggerContainer, StaggerItem, EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { useAuth } from '@/lib/AuthContext';
import { usePageMeta } from '@/hooks/usePageMeta';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation, localized } from '@/lib/i18n';

export default function Tracks() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(t('tracksPage.title') + ' | ' + (lang === 'ar' ? 'منصة صقر' : 'SAQR'), lang === 'ar' ? 'استكشف المسارات التعليمية المتاحة في منصة صقر وابدأ رحلتك في عالم التقنية.' : 'Explore available learning tracks at SAQR and start your journey in technology.');
  const [tracks, setTracks] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifyModal, setNotifyModal] = useState({ open: false, trackName: '' });
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadTracks();
    if (isAuthenticated && user) {
      loadEnrollments();
    }
  }, [isAuthenticated, user]);

  const loadTracks = async () => {
    try {
      const data = await base44.entities.Track.list('-order', 20);
      setTracks(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      const data = await base44.entities.TrackEnrollment.filter({ user_id: user.id });
      setEnrollments(data || []);
      const ints = await base44.entities.TrackInterest.filter({ user_id: user.id });
      setInterests(ints || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEnroll = async (track) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    try {
      const existing = enrollments.find((e) => e.track_id === track.id);
      if (existing) {
        navigate(`/my-subjects/${track.id}`);
        return;
      }
      await base44.entities.TrackEnrollment.create({
        user_id: user.id,
        track_id: track.id,
        track_name: track.name,
        enrolled_date: new Date().toISOString(),
        progress_percent: 0,
        completed_lessons: [],
        completed_activities: [],
        total_points: 0,
        learning_time_minutes: 0,
        status: 'active',
      });
      toast.success(t('tracksPage.enrolledSuccess'));
      loadEnrollments();
      navigate(`/my-subjects/${track.id}`);
    } catch (e) {
      toast.error(t('tracksPage.enrollError'));
    }
  };

  const handleInterest = async (track) => {
    if (!isAuthenticated) {
      setNotifyModal({ open: true, trackName: localized(track, 'name', lang) });
      return;
    }
    try {
      const existing = interests.find((i) => i.track_id === track.id);
      if (existing) {
        toast.info(t('tracksPage.alreadyInterested'));
        return;
      }
      await base44.entities.TrackInterest.create({
        user_id: user.id,
        user_email: user.email,
        track_id: track.id,
        track_name: track.name,
        created_date: new Date().toISOString(),
      });
      toast.success(t('tracksPage.interestSuccess'));
      loadEnrollments();
    } catch (e) {
      toast.error(t('tracksPage.interestError'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir={dir}>
        <PublicNavbar />
        <div className="pt-24 px-4 lg:px-8 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <PublicNavbar />
      <div className="pt-24 pb-20 px-4 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 text-center"
          >
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">{t('tracksPage.title')}</h1>
            <p className="text-foreground-secondary max-w-2xl mx-auto">
              {t('tracksPage.desc')}
            </p>
          </motion.div>

          {tracks.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t('tracksPage.noTracks')}
              message={t('tracksPage.noTracksDesc')}
            />
          ) : (
            <StaggerContainer className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {tracks.map((track) => {
                const enrollment = enrollments.find((e) => e.track_id === track.id);
                const isAvailable = track.availability_status === 'available';
                const isInterested = interests.some((i) => i.track_id === track.id);

                return (
                  <StaggerItem key={track.id}>
                    <div className={`card-base p-6 h-full ${!isAvailable ? 'opacity-80' : ''}`}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center">
                          <Shield className="w-7 h-7 text-white" />
                        </div>
                        {isAvailable ? (
                          <span className="px-3 py-1 rounded-full bg-success/10 text-success text-xs font-medium border border-success/30">
                            {t('home.availableNow')}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium border border-warning/30">
                            {t('common.comingSoon')}
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl font-bold text-foreground mb-2">{localized(track, 'name', lang)}</h2>
                      <p className="text-foreground-secondary text-sm leading-relaxed mb-4">{localized(track, 'description', lang)}</p>

                      <div className="flex items-center gap-4 text-xs text-foreground-secondary mb-4">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {track.estimated_hours || 100} {t('common.hours')}</span>
                        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> 6 {t('tracksPage.subjectsCount')}</span>
                        <span className="flex items-center gap-1"><FlaskConical className="w-3.5 h-3.5" /> {t('common.labs')}</span>
                      </div>

                      {enrollment && (
                        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-foreground-secondary">{t('tracksPage.yourProgress')}</span>
                            <span className="text-xs font-bold text-primary">{enrollment.progress_percent || 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-card rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-primary rounded-full" style={{ width: `${enrollment.progress_percent || 0}%` }} />
                          </div>
                        </div>
                      )}

                      {isAvailable ? (
                        <button
                          onClick={() => handleEnroll(track)}
                          className="w-full py-2.5 bg-gradient-primary text-white rounded-lg font-medium hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {enrollment ? t('tracksPage.continueTrack') : t('tracksPage.startTrack')}
                          {dir === 'rtl' ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInterest(track)}
                          disabled={isInterested}
                          className="w-full py-2.5 bg-card border border-border text-foreground rounded-lg font-medium hover:border-primary/50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          {isInterested ? (
                            <>{t('tracksPage.registered')}</>
                          ) : (
                            <><Bell className="w-4 h-4" /> {t('tracksPage.notifyMe')}</>
                          )}
                        </button>
                      )}
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </div>

      <NotifyModal
        open={notifyModal.open}
        onClose={() => setNotifyModal({ open: false, trackName: '' })}
        trackName={notifyModal.trackName}
      />
    </div>
  );
}