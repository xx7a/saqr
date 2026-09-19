import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, ArrowRight, Lock } from 'lucide-react';
import PublicNavbar from '@/components/PublicNavbar';
import PublicFooter from '@/components/PublicFooter';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useTranslation } from '@/lib/i18n';

export default function Privacy() {
  const { t, lang, dir } = useTranslation();
  usePageMeta(lang === 'ar' ? 'سياسة الخصوصية | منصة صقر' : 'Privacy Policy | SAQR', lang === 'ar' ? 'سياسة خصوصية منصة صقر التعليمية: كيف نجمع بياناتك ونستخدمها ونحميها.' : 'SAQR privacy policy: how we collect, use, and protect your data.');

  const sections = lang === 'ar' ? [
    { title: 'مقدمة', body: 'نحرص في منصة صقر على حماية خصوصية مستخدمينا. توضح هذه السياسة أنواع البيانات التي نجمعها وكيفية استخدامها وحمايتها، وحقوقك تجاهها. باستخدامك للمنصة فإنك توافق على ممارسات جمع البيانات الموضحة هنا.' },
    { title: 'البيانات التي قد تجمعها المنصة', body: 'نجمع نوعين من البيانات: البيانات التي تقدمها طوعًا عند إنشاء الحساب أو استخدام المنصة، والبيانات التي تُجمع تلقائيًا مثل عنوان IP ونوع المتصفح ونظام التشغيل وصفحات الزيارة.' },
    { title: 'بيانات إنشاء الحساب', body: 'عند إنشاء حساب نجمع: الاسم، البريد الإلكتروني، كلمة المرور (مشفّرة). عند التسجيل عبر Google نجمع الاسم والبريد الإلكتروني من مزود الخدمة.' },
    { title: 'بيانات التقدم والاختبارات والأنشطة', body: 'نسجّل تقدمك في الدروس والمواد والمسارات، إجابات الاختبارات، نتائج الأنشطة والمختبرات، النقاط والشارات المكتسبة، الشهادات الصادرة، وقت التعلم، وملاحظاتك على الدروس.' },
    { title: 'طريقة استخدام البيانات', body: 'نستخدم بياناتك لـ: توفير المحتوى التعليمي وتتبع تقدمك، إصدار الشهادات، إرسال الإشعارات المتعلقة بالمنصة، تحسين جودة المحتوى والخدمة، ضمان أمن المنصة ومنع إساءة الاستخدام.' },
    { title: 'ملفات تعريف الارتباط (Cookies)', body: 'نستخدم ملفات تعريف الارتباط والتجمعات المحلية لتخزين جلسة الدخول وتفضيلاتك مثل وضع العرض. يمكنك تعطيلها من إعدادات متصفحك، لكن ذلك قد يؤثر على بعض الوظائف.' },
    { title: 'خدمات الطرف الثالث', body: 'نعتمد على مزودي خدمات خارجيين لتشغيل المنصة، مثل خدمات الاستضافة ومزود المصادقة (Google). تخضع بياناتك لدى هؤلاء لسياسات الخصوصية الخاصة بهم. لا نبيع بياناتك لأي طرف ثالث.' },
    { title: 'حماية وأمان البيانات', body: 'نتخذ تدابير تقنية وتنظيمية لحماية بياناتك، تشمل تشفير كلمات المرور، تقييد الوصول للبيانات الحساسة، ومراقبة الأنشطة المشبوهة. ومع ذلك لا يوجد نظام آمن تمامًا.' },
    { title: 'مدة الاحتفاظ بالبيانات', body: 'نحتفظ ببياناتك طوال مدة استخدامك للمنصة. عند حذف حسابك، نحذف بياناتك الشخصية خلال 30 يومًا، باستثناء البيانات المطلوبة لأغراض قانونية أو محاسبية.' },
    { title: 'حقوق المستخدم', body: 'لك الحق في: الوصول إلى بياناتك، طلب تعديلها، طلب حذفها، تصدير بيانات تقدمك، الاعتراض على معالجة بياناتك. لممارسة هذه الحقوق تواصل معنا عبر البريد المذكور في أسفل الصفحة.' },
    { title: 'خصوصية المستخدمين صغار السن', body: 'المنصة مخصصة للمستخدمين الذين تبلغ أعمارهم 16 عامًا فأكثر. لا نجمع عمدًا بيانات من قاصر دون موافقة ولي الأمر. إذا اعتقدت أن قاصرًا سجّل دون موافقة، تواصل معنا لحذف الحساب.' },
    { title: 'تحديثات سياسة الخصوصية', body: 'قد نحدّث هذه السياسة دوريًا. سننشر التغييرات على هذه الصفحة مع تحديث تاريخ آخر تعديل. ننصحك بمراجعتها بانتظام.' },
    { title: 'وسيلة التواصل', body: 'لأي استفسار يتعلق بالخصوصية، تواصل معنا عبر البريد المذكور في أسفل الصفحة.' },
  ] : [
    { title: 'Introduction', body: 'At SAQR, we are committed to protecting our users\' privacy. This policy explains the types of data we collect, how we use and protect it, and your rights regarding it. By using the platform, you agree to the data collection practices described here.' },
    { title: 'Data the platform may collect', body: 'We collect two types of data: data you voluntarily provide when creating an account or using the platform, and data collected automatically such as IP address, browser type, operating system, and pages visited.' },
    { title: 'Account creation data', body: 'When creating an account, we collect: name, email, password (encrypted). When registering via Google, we collect name and email from the provider.' },
    { title: 'Progress, test, and activity data', body: 'We record your progress in lessons, subjects, and tracks, test answers, activity and lab results, points and badges earned, issued certificates, learning time, and your lesson notes.' },
    { title: 'How we use your data', body: 'We use your data to: provide educational content and track your progress, issue certificates, send platform-related notifications, improve content and service quality, ensure platform security and prevent abuse.' },
    { title: 'Cookies', body: 'We use cookies and local storage to maintain your login session and preferences such as display mode. You can disable them from your browser settings, but this may affect some functionality.' },
    { title: 'Third-party services', body: 'We rely on external service providers to operate the platform, such as hosting services and authentication providers (Google). Your data with these providers is subject to their own privacy policies. We do not sell your data to any third party.' },
    { title: 'Data protection and security', body: 'We take technical and organizational measures to protect your data, including password encryption, restricted access to sensitive data, and monitoring of suspicious activities. However, no system is completely secure.' },
    { title: 'Data retention period', body: 'We retain your data for as long as you use the platform. When you delete your account, we delete your personal data within 30 days, except for data required for legal or accounting purposes.' },
    { title: 'User rights', body: 'You have the right to: access your data, request modification, request deletion, export your progress data, and object to the processing of your data. To exercise these rights, contact us via the email mentioned at the bottom of the page.' },
    { title: 'Privacy of underage users', body: 'The platform is intended for users aged 16 and above. We do not knowingly collect data from a minor without parental consent. If you believe a minor registered without consent, contact us to delete the account.' },
    { title: 'Privacy policy updates', body: 'We may update this policy periodically. We will post changes on this page with an updated last-modified date. We recommend reviewing it regularly.' },
    { title: 'Contact', body: 'For any privacy-related inquiries, contact us via the email mentioned at the bottom of the page.' },
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
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">{lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</h1>
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