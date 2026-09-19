import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Save, Award, TrendingUp, Calendar, MapPin, Target, Info } from 'lucide-react';
import Layout from '@/components/Layout';
import { AnimatedButton, SkeletonCard } from '@/components/AnimationSystem';
import AvatarUploader from '@/components/AvatarUploader';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Profile() {
  const { t, lang, dir } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [badges, setBadges] = useState([]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        avatar_url: user.avatar_url || '',
        display_name: user.display_name || '',
        hide_public_identity: user.hide_public_identity || false,
        education_level: user.education_level || '',
        experience_level: user.experience_level || 'beginner',
        learning_goal: user.learning_goal || '',
        city: user.city || '',
        bio: user.bio || '',
        is_profile_public: user.is_profile_public || false,
      });
      const badgeData = await base44.entities.UserBadge.filter({ user_id: user.id }, '-earned_date', 10);
      setBadges(badgeData || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({
        display_name: profile.display_name,
        hide_public_identity: profile.hide_public_identity,
        education_level: profile.education_level,
        experience_level: profile.experience_level,
        learning_goal: profile.learning_goal,
        city: profile.city,
        bio: profile.bio,
        is_profile_public: profile.is_profile_public,
        profile_completed: true,
      });
      toast.success(t('profile.saved'));
    } catch (e) {
      toast.error(lang === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'An error occurred while saving');
    }
    setSaving(false);
  };

  if (!profile) {
    return (
      <Layout role="student">
        <SkeletonCard className="h-96" />
      </Layout>
    );
  }

  return (
    <Layout role="student">
      <div className="max-w-3xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-primary flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name || ''} className="w-full h-full object-cover" />
              ) : (
                <span>{profile.full_name?.[0] || profile.email?.[0] || 'ط'}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{profile.full_name || (lang === 'ar' ? 'طالب' : 'Student')}</h1>
              <p className="text-foreground-secondary text-sm">{profile.email}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-lg bg-card">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{user.total_points || 0}</p>
              <p className="text-xs text-foreground-secondary">{t('profile.points')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <Award className="w-5 h-5 text-gold mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{badges.length}</p>
              <p className="text-xs text-foreground-secondary">{t('profile.badges')}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-card">
              <Calendar className="w-5 h-5 text-success mx-auto mb-1" />
              <p className="text-lg font-bold text-foreground">{user.learning_streak || 0}</p>
              <p className="text-xs text-foreground-secondary">{t('profile.streak')}</p>
            </div>
          </div>
        </motion.div>

        {/* Avatar editor */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-base p-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-1">{t('profile.avatar')}</h2>
          <p className="text-foreground-secondary text-sm mb-4">{lang === 'ar' ? 'تظهر صورتك في الملف الشخصي ولوحة التحكم ولوحة المتصدرين (إن كنت ضمن الأوائل)' : 'Your photo appears in your profile, dashboard, and leaderboard (if you rank among top learners)'}</p>
          <AvatarUploader
            currentAvatar={profile.avatar_url}
            displayName={profile.display_name || profile.full_name}
            onSaved={(url) => setProfile({ ...profile, avatar_url: url })}
          />
        </motion.div>

        {/* Edit form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-base p-6"
        >
          <h2 className="text-lg font-bold text-foreground mb-4">{t('profile.editProfile')}</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('profile.displayName')}</label>
              <input
                type="text"
                value={profile.display_name}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder={lang === 'ar' ? 'الاسم الذي يظهر في لوحة المتصدرين' : 'Name shown on the leaderboard'}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              />
              <p className="text-xs text-foreground-secondary mt-1">{lang === 'ar' ? 'يظهر في لوحة المتصدرين العامة. إن تركته فارغًا يُستخدم اسمك الكامل.' : 'Shown on the public leaderboard. If left empty, your full name is used.'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('profile.educationLevel')}</label>
              <select
                value={profile.education_level}
                onChange={(e) => setProfile({ ...profile, education_level: e.target.value })}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              >
                <option value="">{lang === 'ar' ? 'اختر...' : 'Select...'}</option>
                <option value="high_school">{t('profile.highSchool')}</option>
                <option value="university">{t('profile.university')}</option>
                <option value="graduate">{t('profile.graduate')}</option>
                <option value="professional">{t('profile.professional')}</option>
                <option value="other">{t('profile.other')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('profile.experienceLevel')}</label>
              <select
                value={profile.experience_level}
                onChange={(e) => setProfile({ ...profile, experience_level: e.target.value })}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              >
                <option value="beginner">{t('profile.beginner')}</option>
                <option value="intermediate">{t('profile.intermediate')}</option>
                <option value="advanced">{t('profile.advanced')}</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('profile.learningGoal')}</label>
              <input
                type="text"
                value={profile.learning_goal}
                onChange={(e) => setProfile({ ...profile, learning_goal: e.target.value })}
                placeholder={lang === 'ar' ? 'مثال: أريد أن أصبح محلل أمن سيبراني' : 'Example: I want to become a security analyst'}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('profile.city')}</label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder={lang === 'ar' ? 'مدينتك' : 'Your city'}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('profile.bio')}</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder={lang === 'ar' ? 'اكتب نبذة عنك...' : 'Write a short bio about yourself...'}
                rows={3}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="public-profile"
                checked={profile.is_profile_public}
                onChange={(e) => setProfile({ ...profile, is_profile_public: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="public-profile" className="text-sm text-foreground-secondary">
                {t('profile.makePrivate')}
              </label>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hide-identity"
                checked={profile.hide_public_identity}
                onChange={(e) => setProfile({ ...profile, hide_public_identity: e.target.checked })}
                className="w-4 h-4 accent-primary"
              />
              <label htmlFor="hide-identity" className="text-sm text-foreground-secondary">
                {t('profile.hideIdentity')}
              </label>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground-secondary">
                {lang === 'ar' ? 'اسم العرض وصورة الحساب سيظهران في لوحة المتصدرين العامة إن حصلت على نقاط مختبرات. يمكنك إخفاء هويتك في أي وقت.' : 'Your display name and avatar will appear on the public leaderboard if you earn lab points. You can hide your identity at any time.'}
              </p>
            </div>

            <div className="flex justify-end">
              <AnimatedButton onClick={handleSave} loading={saving}>
                <Save className="w-4 h-4" /> {t('profile.saveChanges')}
              </AnimatedButton>
            </div>
          </div>
        </motion.div>

        {/* Badges */}
        {badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-base p-6"
          >
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-gold" /> {lang === 'ar' ? 'شاراتي' : 'My badges'}
            </h2>
            <div className="flex flex-wrap gap-3">
              {badges.map((b, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold/10 border border-gold/30">
                  <Award className="w-4 h-4 text-gold" />
                  <span className="text-sm text-foreground">{b.badge_name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}