import React, { useState } from 'react';
import { MessageCircle, X, ChevronLeft, ArrowRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from '@/lib/i18n';

const faqAr = [
  { q: 'كيف أستخدم منصة صقر؟', a: 'ابدأ باختيار المسار التأسيسي، ثم ادخل المواد وأكمل الدروس والأنشطة بالترتيب. بعد إكمال التأسيسي يمكنك استخدام بوصلة صقر والانتقال إلى التخصص.' },
  { q: 'كيف أبدأ مسارًا؟', a: 'من صفحة المسارات اختر المسار المناسب ثم اضغط بدء المسار. بعدها ستظهر مواده في صفحة موادي.' },
  { q: 'كيف يتم احتساب تقدم الدروس؟', a: 'يتقدم إنجازك عند إكمال متطلبات الدرس والأنشطة المرتبطة به. يمكنك متابعة تقدمك من لوحة التحكم وصفحة التقدم.' },
  { q: 'ما هي بوصلة صقر؟', a: 'اختبار يساعدك بعد إنهاء المسار التأسيسي على معرفة التخصص الأقرب لك بناءً على إجاباتك.' },
  { q: 'كيف أختار تخصصي؟', a: 'بعد استيفاء متطلبات المسار التأسيسي، ادخل صفحة التخصصات. يمكنك الاستفادة من نتيجة بوصلة صقر ثم اختيار التخصص الذي تريد متابعته.' },
  { q: 'ما هي التحديات والمختبرات؟', a: 'تطبيقات عملية تساعدك على تجربة المهارات التي تعلمتها. بعض التحديات محاكاة تعليمية، وهناك أيضًا مختبرات عملية مخصصة داخل المنصة.' },
  { q: 'كيف أحصل على الشهادة؟', a: 'أكمل متطلبات المسار أو التخصص المطلوبة واجتز الاختبار النهائي حسب شروط المسار، وبعدها تظهر الشهادة المؤهلة لك في صفحة الشهادات.' },
  { q: 'أين أجد شهاداتي وتقدمي؟', a: 'من القائمة الجانبية يمكنك فتح صفحة التقدم لمتابعة إنجازك وصفحة الشهادات لعرض الشهادات التي حصلت عليها.' },
];

const faqEn = [
  { q: 'How do I use Saqr?', a: 'Start with the foundation track, open its subjects, and complete lessons and activities in order. After the foundation track, you can use Saqr Compass and continue to a specialization.' },
  { q: 'How do I start a track?', a: 'Open Tracks, choose a track, then select Start Track. Its subjects will then be available from My Subjects.' },
  { q: 'How is lesson progress calculated?', a: 'Your progress updates as you complete lesson requirements and related activities. You can follow it from the dashboard and Progress page.' },
  { q: 'What is Saqr Compass?', a: 'It is an assessment available after the foundation track that helps identify a suitable specialization based on your answers.' },
  { q: 'How do I choose a specialization?', a: 'After meeting the foundation requirements, open Specializations. You can use your Compass result as guidance and select the specialization you want.' },
  { q: 'What are challenges and labs?', a: 'They are practical activities for applying what you learn. Saqr includes educational simulations as well as dedicated practical labs.' },
  { q: 'How do I earn a certificate?', a: 'Complete the required track or specialization requirements and pass its final assessment when required. Eligible certificates then appear on the Certificates page.' },
  { q: 'Where can I find my certificates and progress?', a: 'Use the navigation menu to open Progress for your learning status and Certificates for certificates you have earned.' },
];

export default function HelpChat() {
  const { lang, dir } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const items = lang === 'ar' ? faqAr : faqEn;

  return (
    <div className="fixed bottom-5 end-5 z-[100]" dir={dir}>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 12, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .97 }}
            className="absolute bottom-16 end-0 w-[min(360px,calc(100vw-32px))] max-h-[520px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border p-4">
              <div>
                <h3 className="font-bold text-foreground">{lang === 'ar' ? 'مساعد صقر' : 'Saqr Help'}</h3>
                <p className="text-xs text-foreground-secondary">{lang === 'ar' ? 'اختر سؤالًا وسنساعدك' : 'Choose a question to get help'}</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-foreground-secondary hover:bg-card" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[430px] overflow-y-auto p-3">
              {selected ? (
                <div>
                  <button onClick={() => setSelected(null)} className="mb-3 flex items-center gap-1 text-sm text-primary">
                    <ArrowRight className="h-4 w-4" /> {lang === 'ar' ? 'الأسئلة' : 'Questions'}
                  </button>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="mb-2 font-semibold text-foreground">{selected.q}</p>
                    <p className="text-sm leading-7 text-foreground-secondary">{selected.a}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <button key={i} onClick={() => setSelected(item)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-start text-sm text-foreground transition-colors hover:border-primary/40">
                      <span>{item.q}</span><ChevronLeft className="h-4 w-4 shrink-0 text-foreground-secondary" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => { setOpen(v => !v); if (open) setSelected(null); }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-primary text-white shadow-lg transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label={lang === 'ar' ? 'فتح المساعدة' : 'Open help'}>
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
