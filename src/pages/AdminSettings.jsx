import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Shield, Upload } from 'lucide-react';
import Layout from '@/components/Layout';
import { AnimatedButton, SkeletonCard } from '@/components/AnimationSystem';
import { refreshLogoCache } from '@/components/Logo';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function AdminSettings() {
  const { t, lang, dir } = useTranslation();
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await base44.entities.SiteSettings.list();
      if (data && data.length > 0) {
        setSettings(data[0]);
      } else {
        // Create default settings
        const created = await base44.entities.SiteSettings.create({
          platform_name: 'صقر',
          platform_slogan: 'تعلّم التقنية، طبّق مهاراتك، واصنع مستقبلك',
          hero_title: 'ابدأ رحلتك في الأمن السيبراني',
          hero_description: 'منصة عربية تفاعلية تجمع بين الشرح والتطبيق العملي، وتأخذك من أساسيات الحاسب إلى التخصص الاحترافي في الأمن السيبراني.',
          contact_email: 'support@saqr.edu',
          video_completion_threshold: 80,
          test_pass_score: 70,
          max_test_attempts: 2,
          max_activity_attempts: 3,
        });
        setSettings(created);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setSettings({ ...settings, logo_url: file_url });
      toast.success(lang === 'ar' ? 'تم رفع الشعار — احفظ الإعدادات لتطبيقه' : 'Logo uploaded — save settings to apply');
    } catch (err) {
      toast.error(lang === 'ar' ? 'فشل رفع الشعار' : 'Failed to upload logo');
    }
    setUploadingLogo(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.SiteSettings.update(settings.id, settings);
      refreshLogoCache();
      toast.success(lang === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch (e) {
      toast.error(t('common.error'));
    }
    setSaving(false);
  };

  if (loading || !settings) {
    return (
      <Layout role="admin">
        <SkeletonCard className="h-96" />
      </Layout>
    );
  }

  return (
    <Layout role="admin">
      <div className="max-w-3xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-6"
        >
          <h1 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-primary" /> {t('admin.settings')}
          </h1>
          <p className="text-foreground-secondary text-sm">{lang === 'ar' ? 'تعديل اسم المنصة والشعار والإعدادات العامة' : 'Edit platform name, logo, and general settings'}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-base p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-foreground">{lang === 'ar' ? 'الهوية' : 'Identity'}</h2>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{lang === 'ar' ? 'شعار المنصة' : 'Platform logo'}</label>
            <div className="flex items-center gap-4">
              <img
                src={settings.logo_url || 'https://media.base44.com/images/public/6aa933d7dfc0b83e285003ae/9b05ca066_image.png'}
                alt={lang === 'ar' ? 'شعار المنصة' : 'Platform logo'}
                className="w-16 h-16 rounded-xl object-cover border border-border shrink-0"
              />
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? (lang === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (lang === 'ar' ? 'رفع شعار جديد' : 'Upload new logo')}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-foreground-secondary mt-1.5">{lang === 'ar' ? 'مربعة، PNG أو JPG. احفظ الإعدادات بعد الرفع لتطبيق الشعار.' : 'Square, PNG or JPG. Save settings after upload to apply the logo.'}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.platformName')}</label>
            <input
              type="text"
              value={settings.platform_name || ''}
              onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.platformSlogan')}</label>
            <input
              type="text"
              value={settings.platform_slogan || ''}
              onChange={(e) => setSettings({ ...settings, platform_slogan: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{lang === 'ar' ? 'عنوان الصفحة الرئيسية' : 'Homepage title'}</label>
            <input
              type="text"
              value={settings.hero_title || ''}
              onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{lang === 'ar' ? 'وصف الصفحة الرئيسية' : 'Homepage description'}</label>
            <textarea
              value={settings.hero_description || ''}
              onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
              rows={3}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.contactEmail')}</label>
            <input
              type="email"
              value={settings.contact_email || ''}
              onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
              className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-base p-6 space-y-4"
        >
          <h2 className="text-lg font-bold text-foreground">{lang === 'ar' ? 'إعدادات التعلم' : 'Learning settings'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.videoCompletion')}</label>
              <input
                type="number"
                value={settings.video_completion_threshold || 80}
                onChange={(e) => setSettings({ ...settings, video_completion_threshold: parseInt(e.target.value) })}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.testPassScore')}</label>
              <input
                type="number"
                value={settings.test_pass_score || 70}
                onChange={(e) => setSettings({ ...settings, test_pass_score: parseInt(e.target.value) })}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.maxTestAttempts')}</label>
              <input
                type="number"
                value={settings.max_test_attempts || 2}
                onChange={(e) => setSettings({ ...settings, max_test_attempts: parseInt(e.target.value) })}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{t('admin.maxActivityAttempts')}</label>
              <input
                type="number"
                value={settings.max_activity_attempts || 3}
                onChange={(e) => setSettings({ ...settings, max_activity_attempts: parseInt(e.target.value) })}
                className="w-full bg-card border border-border rounded-lg px-4 py-2.5 text-foreground text-sm focus:border-primary/50 outline-none"
              />
            </div>
          </div>
        </motion.div>

        <div className="flex justify-end">
          <AnimatedButton onClick={handleSave} loading={saving}>
            <Save className="w-4 h-4" /> {lang === 'ar' ? 'حفظ الإعدادات' : 'Save settings'}
          </AnimatedButton>
        </div>
      </div>
    </Layout>
  );
}