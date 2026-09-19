import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Shield, Target, Users, Award, FlaskConical, BookOpen,
  Terminal, Lock, Play, CheckCircle2, ArrowLeft, ArrowRight, AlertTriangle, Sparkles
} from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from '@/lib/i18n';

export default function About() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'عن منصة صقر' : 'About SAQR', lang === 'ar' ? 'تعرف على منصة صقر التعليمية، رؤيتها ورسالتها ومنهجيتها في تعليم الأمن السيبراني بالعربية.' : 'Learn about the SAQR educational platform, its vision, mission, and methodology in teaching cybersecurity.');

  const values = [
    { icon: Target, title: t('about.v1Title'), desc: t('about.v1Desc') },
    { icon: BookOpen, title: t('about.v2Title'), desc: t('about.v2Desc') },
    { icon: FlaskConical, title: t('about.v3Title'), desc: t('about.v3Desc') },
    { icon: Award, title: t('about.v4Title'), desc: t('about.v4Desc') },
    { icon: Users, title: t('about.v5Title'), desc: t('about.v5Desc') },
    { icon: Lock, title: t('about.v6Title'), desc: t('about.v6Desc') },
  ];

  const learningSteps = [
    { icon: BookOpen, title: t('about.s1Title'), desc: t('about.s1Desc') },
    { icon: Play, title: t('about.s2Title'), desc: t('about.s2Desc') },
    { icon: FlaskConical, title: t('about.s3Title'), desc: t('about.s3Desc') },
    { icon: CheckCircle2, title: t('about.s4Title'), desc: t('about.s4Desc') },
  ];

  const whyItems = [t('about.why1'), t('about.why2'), t('about.why3'), t('about.why4'), t('about.why5')];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <PublicNavbar />

      <div className="flex-1 pt-24 pb-20 px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center mx-auto mb-6 glow-primary">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-4">{t('about.title')}</h1>
            <p className="text-lg text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
              {t('about.heroDesc')}
            </p>
          </motion.section>

          {/* About */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-base p-8 mb-12"
          >
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('about.aboutTitle')}</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              {t('about.aboutP1')}
            </p>
            <p className="text-foreground-secondary leading-relaxed">
              {t('about.aboutP2')}
            </p>
          </motion.section>

          {/* Vision & Mission */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card-base p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-3">{t('about.visionTitle')}</h2>
              <p className="text-foreground-secondary leading-relaxed">
                {t('about.visionDesc')}
              </p>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card-base p-8"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-3">{t('about.missionTitle')}</h2>
              <p className="text-foreground-secondary leading-relaxed">
                {t('about.missionDesc')}
              </p>
            </motion.section>
          </div>

          {/* Why */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-base p-8 mb-12"
          >
            <h2 className="text-2xl font-bold text-foreground mb-4">{t('about.whyTitle')}</h2>
            <p className="text-foreground-secondary leading-relaxed mb-4">
              {t('about.whyDesc')}
            </p>
            <ul className="space-y-3">
              {whyItems.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
                  <span className="text-foreground-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </motion.section>

          {/* Learning Method */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">{t('about.methodTitle')}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {learningSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="card-base p-6 text-center"
                >
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-foreground-secondary">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Values */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-foreground mb-6 text-center">{t('about.valuesTitle')}</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {values.map((v, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="card-base p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <v.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-2">{v.title}</h3>
                  <p className="text-sm text-foreground-secondary leading-relaxed">{v.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Available tracks */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-base p-8 mb-12"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">{t('about.availableTitle')}</h2>
                <p className="text-foreground-secondary leading-relaxed mb-3">
                  {t('about.availableDesc')}
                </p>
                <Link
                  to="/tracks"
                  className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                >
                  {t('about.exploreTracks')} {dir === 'rtl' ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Link>
              </div>
            </div>
          </motion.section>

          {/* Coming soon tracks */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-base p-8 mb-12"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">{t('about.comingTitle')}</h2>
                <p className="text-foreground-secondary leading-relaxed">
                  {t('about.comingDesc')}
                </p>
              </div>
            </div>
          </motion.section>

          {/* Legal notice */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-base p-8 mb-12 border-warning/30"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">{t('about.legalTitle')}</h2>
                <p className="text-foreground-secondary leading-relaxed">
                  {t('about.legalDesc')}
                </p>
              </div>
            </div>
          </motion.section>

          {/* CTA */}
          <motion.section
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="card-base p-12">
              <Terminal className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-3">{t('about.ctaTitle')}</h2>
              <p className="text-foreground-secondary mb-6 max-w-xl mx-auto">
                {t('about.ctaDesc')}
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  to="/register"
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors glow-primary flex items-center gap-2"
                >
                  {t('about.ctaStart')} {dir === 'rtl' ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                </Link>
                <Link
                  to="/tracks"
                  className="px-6 py-3 bg-card border border-border text-foreground rounded-xl font-medium hover:border-primary/50 transition-colors"
                >
                  {t('about.exploreTracks')}
                </Link>
              </div>
            </div>
          </motion.section>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}