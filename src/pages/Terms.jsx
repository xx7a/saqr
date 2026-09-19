import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ScrollText } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from '@/lib/i18n';

export default function Terms() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'شروط الاستخدام | منصة صقر' : 'Terms of Use | SAQR', lang === 'ar' ? 'شروط استخدام منصة صقر التعليمية: قواعد استخدام المنصة والمحتوى والمختبرات.' : 'SAQR terms of use: rules for using the platform, content, and labs.');

  const sections = lang === 'ar' ? [
    { title: 'قبول الشروط', body: 'باستخدامك لمنصة صقر أو إنشائك حسابًا فيها، فإنك توافق على هذه الشروط بالكامل. إذا لم توافق على أي بند منها، يرجى عدم استخدام المنصة.' },
    { title: 'إنشاء الحساب', body: 'يجب أن يكون عمرك 16 عامًا على الأقل لإنشاء حساب. تلتزم بتقديم معلومات صحيحة عند التسجيل وتحديثها عند تغييرها. يُسمح بإنشاء حساب واحد لكل شخص.' },
    { title: 'مسؤولية المستخدم عن حسابه', body: 'أنت مسؤول عن الحفاظ على سرية كلمة المرور وعن جميع الأنشطة التي تتم عبر حسابك. يرجى إبلاغنا فورًا عند أي استخدام غير مصرح به لحسابك.' },
    { title: 'الاستخدام التعليمي والقانوني', body: 'المنصة مخصصة لأغراض تعليمية قانونية فقط. تلتزم باستخدام المعرفة والمهارات المكتسبة بشكل قانوني وأخلاقي، ووفقًا لقوانين بلدك.' },
    { title: 'منع استخدام المعلومات في اختراق أنظمة دون تصريح', body: 'يُمنع صراحة استخدام أي معلومات أو أدوات أو تقنيات مكتسبة من المنصة لاختراق أو الوصول غير المصرح به إلى أي نظام أو شبكة أو بيانات. المخالف يتحمل المسؤولية القانونية كاملة.' },
    { title: 'قواعد استخدام المختبرات والمحاكيات', body: 'المختبرات والمحاكيات مخصصة للتدرب ضمن بيئات المنصة التعليمية فقط. يُمنع محاولة الخروج من بيئة المحاكاة أو استخدامها لاستهداف أنظمة خارجية أو مشاركة بيانات الدخول مع آخرين.' },
    { title: 'حقوق الملكية الفكرية', body: 'جميع المحتويات (الدروس، الفيديوهات، النصوص، المختبرات، الأنشطة، الشهادات) مملوكة لمنصة صقر ومحمية بحقوق الملكية الفكرية. لا يجوز نسخها أو إعادة نشرها أو تعديلها دون إذن كتابي.' },
    { title: 'منع نسخ المحتوى أو إعادة نشره', body: 'يُمنع نسخ أو تنزيل أو إعادة نشر المحتوى التعليمي (نصوص، فيديوهات، أكواد) على أي منصة أو موقع آخر دون إذن كتابي مسبق. يُسمح بالاستخدام الشخصي للتعلم فقط.' },
    { title: 'سياسة الشهادات والإنجازات', body: 'تصدر الشهادات عند إكمال متطلبات المسار أو التخصص. الشهادة موثقة برقم تحقق وQR. لا يجوز تزوير الشهادة أو تعديل بياناتها. الشهادة تثبت إكمال المتطلبات ولا تضمن الحصول على وظيفة.' },
    { title: 'حدود مسؤولية المنصة', body: 'المنصة تقدم محتوى تعليميًا «كما هو» دون ضمانات صريحة أو ضمنية. لا نتحمل مسؤولية أي ضرر مباشر أو غير مباشر ناتج عن استخدام المنصة أو تطبيق المعرفة المكتسبة منها.' },
    { title: 'تعليق أو حذف الحساب', body: 'نحتفظ بحق تعليق أو حذف أي حساب يخالف هذه الشروط أو يستخدم المنصة بشكل ضار أو غير قانوني. يشمل ذلك: إساءة استخدام المختبرات، إزعاج مستخدمين آخرين، نشر محتوى غير لائق.' },
    { title: 'تحديث الشروط', body: 'قد نحدّث هذه الشروط دوريًا. سننشر التغييرات على هذه الصفحة مع تحديث تاريخ آخر تعديل. استمرارك في استخدام المنصة بعد التحديث يعني موافقتك على الشروط المعدّلة.' },
    { title: 'وسيلة التواصل', body: 'لأي استفسار يتعلق بهذه الشروط، تواصل معنا عبر البريد المذكور في أسفل الصفحة.' },
  ] : [
    { title: 'Acceptance of terms', body: 'By using the SAQR platform or creating an account, you agree to these terms in full. If you do not agree to any provision, please do not use the platform.' },
    { title: 'Account creation', body: 'You must be at least 16 years old to create an account. You agree to provide accurate information when registering and to update it when it changes. One account per person is allowed.' },
    { title: 'User responsibility for account', body: 'You are responsible for keeping your password confidential and for all activities conducted through your account. Please notify us immediately of any unauthorized use of your account.' },
    { title: 'Educational and legal use', body: 'The platform is intended for legal educational purposes only. You agree to use the knowledge and skills acquired legally and ethically, in accordance with the laws of your country.' },
    { title: 'Prohibition of using information for unauthorized hacking', body: 'It is expressly prohibited to use any information, tools, or techniques acquired from the platform to hack or gain unauthorized access to any system, network, or data. Violators bear full legal responsibility.' },
    { title: 'Rules for using labs and simulations', body: 'Labs and simulations are intended for training within the platform\'s educational environments only. Attempting to escape the simulation environment or using it to target external systems or sharing login credentials with others is prohibited.' },
    { title: 'Intellectual property rights', body: 'All content (lessons, videos, texts, labs, activities, certificates) is owned by the SAQR platform and protected by intellectual property rights. It may not be copied, republished, or modified without written permission.' },
    { title: 'Prohibition of copying or republishing content', body: 'Copying, downloading, or republishing educational content (texts, videos, code) on any other platform or website without prior written permission is prohibited. Personal use for learning is allowed.' },
    { title: 'Certificate and achievement policy', body: 'Certificates are issued upon completing track or specialization requirements. The certificate is verified with a verification number and QR. Forging or modifying certificate data is prohibited. The certificate proves completion of requirements but does not guarantee employment.' },
    { title: 'Limitation of platform liability', body: 'The platform provides educational content "as is" without express or implied warranties. We are not liable for any direct or indirect damage resulting from using the platform or applying the knowledge acquired from it.' },
    { title: 'Account suspension or deletion', body: 'We reserve the right to suspend or delete any account that violates these terms or uses the platform in a harmful or illegal way. This includes: abusing labs, harassing other users, posting inappropriate content.' },
    { title: 'Terms updates', body: 'We may update these terms periodically. We will post changes on this page with an updated last-modified date. Your continued use of the platform after updates means you agree to the modified terms.' },
    { title: 'Contact', body: 'For any inquiries related to these terms, contact us via the email mentioned at the bottom of the page.' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <PublicNavbar />

      <div className="flex-1 pt-24 pb-20 px-4 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
              <ScrollText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{lang === 'ar' ? 'شروط الاستخدام' : 'Terms of Use'}</h1>
            <p className="text-sm text-foreground-secondary">
              {lang === 'ar' ? 'آخر تحديث: 15 سبتمبر 2026' : 'Last updated: September 15, 2026'}
            </p>
          </motion.div>

          <div className="space-y-6">
            {sections.map((s, i) => (
              <motion.section
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.03 }}
                className="card-base p-6"
              >
                <h2 className="text-lg font-bold text-foreground mb-3">{i + 1}. {s.title}</h2>
                <p className="text-foreground-secondary leading-relaxed text-sm">{s.body}</p>
              </motion.section>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-card border border-border text-foreground rounded-xl font-medium hover:border-primary/50 transition-colors"
            >
              {dir === 'rtl' ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />} {lang === 'ar' ? 'العودة إلى الرئيسية' : 'Back to home'}
            </Link>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}