import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { EmptyState, SkeletonCard } from '@/components/AnimationSystem';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation, localized } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';

export default function FAQ() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'الأسئلة الشائعة | منصة صقر' : 'FAQ | SAQR', lang === 'ar' ? 'إجابات على أكثر الأسئلة شيوعًا حول منصة صقر التعليمية.' : 'Answers to the most common questions about the SAQR learning platform.');
  const [faqs, setFaqs] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      const data = await base44.entities.FAQ.filter({ is_published: true }, 'order', 50);
      setFaqs(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" dir={dir}>
      <PublicNavbar />
      <div className="pt-24 pb-20 px-4 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HelpCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{lang === 'ar' ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h1>
            <p className="text-foreground-secondary">{lang === 'ar' ? 'إجابات على أكثر الأسئلة شيوعًا حول منصة صقر' : 'Answers to the most common questions about SAQR'}</p>
          </motion.div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-16" />)}
            </div>
          ) : faqs.length === 0 ? (
            <EmptyState icon={HelpCircle} title={lang === 'ar' ? 'لا توجد أسئلة شائعة' : 'No FAQs available'} message={lang === 'ar' ? 'سيتم إضافة الأسئلة قريبًا' : 'FAQs will be added soon'} />
          ) : (
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div
                  key={faq.id || i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-base overflow-hidden"
                >
                  <button
                    onClick={() => setOpenIndex(openIndex === i ? null : i)}
                    aria-label={openIndex === i ? `${lang === 'ar' ? 'إخفاء الإجابة' : 'Hide answer'}: ${localized(faq, 'question', lang)}` : `${lang === 'ar' ? 'إظهار الإجابة' : 'Show answer'}: ${localized(faq, 'question', lang)}`}
                    aria-expanded={openIndex === i}
                    className="w-full flex items-center justify-between p-5 text-right focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-lg"
                  >
                    <span className="font-medium text-foreground">{localized(faq, 'question', lang)}</span>
                    <ChevronDown className={`w-5 h-5 text-foreground-secondary transition-transform shrink-0 ${openIndex === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="px-5 pb-5"
                    >
                      <p className="text-foreground-secondary text-sm leading-relaxed">{localized(faq, 'answer', lang)}</p>
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}