import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Award, CheckCircle2, Clock3, FileQuestion, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import Layout from '@/components/Layout';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTranslation, localized } from '@/lib/i18n';

const BANK = [
['أي مبدأ أمني يعني منح المستخدم أقل صلاحيات يحتاجها؟',['أقل صلاحية','التوافر','التكرار','عدم التنصل'],0],
['ما الهدف الأساسي من المصادقة متعددة العوامل؟',['زيادة سرعة الدخول','إضافة طبقة تحقق مستقلة','تشفير القرص','إخفاء عنوان IP'],1],
['أي بروتوكول يوفر تصفح ويب مشفرًا؟',['HTTP','FTP','HTTPS','Telnet'],2],
['ما أفضل وصف للتجزئة Hashing؟',['تشفير قابل للعكس','تحويل أحادي الاتجاه','ضغط الملفات','نسخ احتياطي'],1],
['أي عنصر يساعد في اكتشاف نشاط غير طبيعي على الأنظمة؟',['السجلات Logs','اسم الجهاز','الخلفية','دقة الشاشة'],0],
['ما المقصود بمبدأ Defense in Depth؟',['استخدام جدار ناري فقط','عدة طبقات دفاعية','إلغاء كلمات المرور','فتح جميع المنافذ'],1],
['ما وظيفة DNS بشكل أساسي؟',['ترجمة أسماء النطاقات إلى عناوين IP','تشفير الملفات','إدارة كلمات المرور','فحص البرمجيات'],0],
['أي مما يلي مثال على هندسة اجتماعية؟',['Phishing','RAID','VLAN','NAT'],0],
['ما الغرض من تحديثات الأمان؟',['زيادة حجم النظام','إصلاح ثغرات معروفة','حذف السجلات','تعطيل التشفير'],1],
['أي بروتوكول يستخدم عادة للإدارة الآمنة عن بعد؟',['Telnet','SSH','HTTP','TFTP'],1],
['ما فائدة تقسيم الشبكة Network Segmentation؟',['زيادة المخاطر','تقليل الحركة الجانبية','إلغاء المصادقة','فتح كل الخدمات'],1],
['ماذا يعني مبدأ CIA في الأمن السيبراني؟',['السرية والسلامة والتوافر','السرعة والهوية والنسخ','التشفير فقط','المراقبة فقط'],0],
['ما أول إجراء مناسب عند الاشتباه بحادث أمني؟',['تجاهله','اتباع خطة الاستجابة وجمع المعلومات','حذف كل السجلات','نشر كلمات المرور'],1],
['ما فائدة النسخ الاحتياطية المعزولة؟',['تقليل أثر فقدان البيانات وهجمات الفدية','فتح المنافذ','زيادة الصلاحيات','إلغاء التحديثات'],0],
['أي نوع من الثغرات يرتبط غالبًا بمدخلات غير معالجة في قواعد البيانات؟',['SQL Injection','DDoS','ARP','VLAN'],0],
['ما الغرض من اختبار الاختراق المصرح به؟',['إتلاف الأنظمة','تقييم نقاط الضعف ضمن نطاق مصرح','سرقة البيانات','تعطيل الخدمات'],1],
['ما المقصود بالنطاق Scope في اختبار أمني؟',['الأهداف والحدود المسموح اختبارها','كلمة المرور','نوع المتصفح','سرعة الإنترنت'],0],
['لماذا يجب حماية مفاتيح API؟',['لأنها بيانات اعتماد حساسة','لزيادة سرعة الموقع','لتغيير DNS','لضغط البيانات'],0],
['أي إجراء يقلل مخاطر كلمات المرور المسربة؟',['إعادة استخدامها','استخدام مدير كلمات مرور وMFA','كتابتها علنًا','تعطيل القفل'],1],
['ما فائدة مبدأ Zero Trust؟',['الثقة التلقائية داخل الشبكة','التحقق المستمر وعدم الثقة الافتراضية','إلغاء التسجيل','فتح الوصول للجميع'],1],
['أي سجل يفيد في تتبع محاولات تسجيل الدخول؟',['Authentication log','صورة الخلفية','ملف README','Cache فقط'],0],
['ما أفضل تصرف عند اكتشاف ثغرة في بيئة عمل؟',['استغلالها خارج النطاق','توثيقها والإبلاغ عبر القناة المعتمدة','نشرها فورًا','حذف الأدلة'],1],
['ما وظيفة جدار الحماية Firewall؟',['التحكم بحركة الشبكة وفق قواعد','إنشاء كلمات مرور','ترجمة النصوص','ضغط الصور'],0],
['لماذا يتم التحقق من سلامة الملفات؟',['لاكتشاف التعديل غير المتوقع','لتغيير IP','لزيادة حجم الملف','لإلغاء الصلاحيات'],0],
['أي خطوة مهمة بعد معالجة حادث أمني؟',['مراجعة الدروس المستفادة وتحسين الضوابط','حذف كل التوثيق','إيقاف التحديثات','مشاركة الأسرار'],0],
];

function shuffledQuestions() {
  return BANK.map(([q, opts, correct], qi) => {
    const tagged = opts.map((text, i) => ({ text, correct: i === correct }));
    for (let i = tagged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tagged[i], tagged[j]] = [tagged[j], tagged[i]];
    }
    return { id: qi, q, options: tagged };
  });
}

export default function SpecializationFinalExam() {
  const { specId } = useParams();
  const { user } = useAuth();
  const { lang } = useTranslation();
  const [searchParams] = useSearchParams();
  const isAdminPreview = user?.role === 'admin' && searchParams.get('preview') === '1';
  const backToSpecialization = isAdminPreview ? '/admin/curriculum' : `/specialization/${specId}`;
  const questions = useMemo(shuffledQuestions, []);
  const [spec, setSpec] = useState(null);
  const [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [seconds, setSeconds] = useState(30 * 60);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!user || !specId) return;
    (async () => {
      try {
        const [s, lessons, progress] = await Promise.all([
          base44.entities.Specialization.get(specId),
          base44.entities.Lesson.filter({ specialization_id: specId, is_published: true }, 'order', 200),
          base44.entities.LessonProgress.filter({ user_id: user.id, specialization_id: specId }),
        ]);
        setSpec(s);
        const done = new Set((progress || []).filter(p => p.status === 'completed').map(p => String(p.lesson_id)));
        setEligible(isAdminPreview || ((lessons || []).length > 0 && lessons.every(l => done.has(String(l.id)))));
      } finally { setLoading(false); }
    })();
  }, [user, specId, isAdminPreview]);

  const finish = async () => {
    const correct = questions.reduce((n, q) => n + (q.options[answers[q.id]]?.correct ? 1 : 0), 0);
    const percent = Math.round(correct / questions.length * 100);
    const passed = percent >= 70;
    const data = { correct, total: questions.length, percent, passed };
    setResult(data); setStarted(false);
    try {
      await base44.entities.FinalExamAttempt.create({
        user_id: user.id, specialization_id: specId, score_percent: percent,
        correct_answers: correct, total_questions: questions.length,
        passed, submitted_date: new Date().toISOString(), exam_version: 'prototype-v1'
      });
    } catch {}
  };

  useEffect(() => {
    if (!started || result) return;
    if (seconds <= 0) { finish(); return; }
    const t = setInterval(() => setSeconds(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [started, seconds, result]);

  const reset = () => { setAnswers({}); setIndex(0); setSeconds(30*60); setResult(null); setStarted(true); };
  const mm = String(Math.floor(seconds/60)).padStart(2,'0'), ss = String(seconds%60).padStart(2,'0');

  if (loading) return <Layout role="student"><div className="card-base p-8 animate-pulse h-52" /></Layout>;
  if (!eligible) return <Layout role="student"><div className="max-w-2xl mx-auto card-base p-8 text-center"><ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4"/><h1 className="text-2xl font-bold mb-2">الاختبار التخصصي النهائي</h1><p className="text-foreground-secondary mb-5">يُفتح الاختبار بعد إكمال جميع دروس تخصصك.</p><Link to={backToSpecialization} className="text-primary">العودة إلى التخصص</Link></div></Layout>;

  if (result) return <Layout role="student"><div className="max-w-2xl mx-auto card-base p-8 text-center">
    {result.passed ? <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4"/> : <XCircle className="w-16 h-16 text-destructive mx-auto mb-4"/>}
    <p className="text-sm text-primary font-medium mb-2">الاختبار التخصصي النهائي</p>
    <h1 className="text-3xl font-bold mb-2">{result.passed ? 'مبروك، اجتزت الاختبار!' : 'لم تجتز الاختبار هذه المرة'}</h1>
    <p className="text-5xl font-black my-6">{result.percent}%</p>
    <p className="text-foreground-secondary mb-6">أجبت بشكل صحيح على {result.correct} من {result.total}. درجة النجاح 70%.</p>
    <div className="flex justify-center gap-3 flex-wrap">
      {!result.passed && <button onClick={reset} className="px-5 py-3 rounded-xl bg-primary text-primary-foreground flex items-center gap-2"><RotateCcw className="w-4 h-4"/> إعادة الاختبار</button>}
      {result.passed && (isAdminPreview
        ? <div className="px-5 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary flex items-center gap-2"><Award className="w-4 h-4"/> معاينة فقط — لن تُصدر شهادة للأدمن</div>
        : <Link to="/certificates" className="px-5 py-3 rounded-xl bg-gradient-primary text-white flex items-center gap-2"><Award className="w-4 h-4"/> الشهادة الاحترافية</Link>
      )}
      <Link to={backToSpecialization} className="px-5 py-3 rounded-xl border border-border">العودة للتخصص</Link>
    </div>
  </div></Layout>;

  if (!started) return <Layout role="student"><div className="max-w-3xl mx-auto space-y-5">
    <div className="card-base p-8">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"><Award className="w-7 h-7 text-primary"/></div>
      <p className="text-primary text-sm font-medium mb-2">{isAdminPreview ? 'وضع المعاينة للأدمن' : 'المرحلة الأخيرة'}</p>
      <h1 className="text-3xl font-bold mb-2">الاختبار التخصصي النهائي</h1>
      <p className="text-foreground-secondary">{spec ? localized(spec,'name',lang) : ''}</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-7">
        <div className="rounded-xl bg-card p-4"><FileQuestion className="w-5 h-5 text-primary mb-2"/><b>25 سؤالًا</b><p className="text-xs text-foreground-secondary mt-1">اختيار من متعدد</p></div>
        <div className="rounded-xl bg-card p-4"><Clock3 className="w-5 h-5 text-primary mb-2"/><b>30 دقيقة</b><p className="text-xs text-foreground-secondary mt-1">ينتهي تلقائيًا</p></div>
        <div className="rounded-xl bg-card p-4"><ShieldCheck className="w-5 h-5 text-primary mb-2"/><b>70% للنجاح</b><p className="text-xs text-foreground-secondary mt-1">يمكن إعادة المحاولة</p></div>
      </div>
      <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-foreground-secondary">النسخة الحالية تعرض الجزء النظري فقط. قسم المختبر العملي سيُضاف في المرحلة التالية.</div>
      <button onClick={() => setStarted(true)} className="mt-6 w-full sm:w-auto px-7 py-3 bg-gradient-primary text-white rounded-xl font-bold">ابدأ الاختبار النهائي</button>
    </div>
  </div></Layout>;

  const q = questions[index];
  return <Layout role="student"><div className="max-w-3xl mx-auto">
    <div className="flex items-center justify-between mb-4"><div><p className="text-sm text-foreground-secondary">السؤال {index+1} من 25</p><div className="w-48 h-1.5 bg-card rounded-full mt-2"><div className="h-full bg-primary rounded-full" style={{width:`${((index+1)/25)*100}%`}}/></div></div><div className="flex items-center gap-2 font-mono text-lg"><Clock3 className="w-5 h-5 text-primary"/>{mm}:{ss}</div></div>
    <div className="card-base p-7"><h2 className="text-xl font-bold leading-8 mb-6">{q.q}</h2><div className="space-y-3">{q.options.map((o,i)=><button key={i} onClick={()=>setAnswers(a=>({...a,[q.id]:i}))} className={`w-full text-start p-4 rounded-xl border transition-colors ${answers[q.id]===i?'border-primary bg-primary/10':'border-border bg-card hover:border-primary/40'}`}><span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-background me-3">{i+1}</span>{o.text}</button>)}</div>
      <div className="flex justify-between mt-7"><button disabled={index===0} onClick={()=>setIndex(i=>i-1)} className="px-5 py-2.5 rounded-lg border border-border disabled:opacity-30">السابق</button>{index<24?<button onClick={()=>setIndex(i=>i+1)} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground">التالي</button>:<button onClick={finish} className="px-5 py-2.5 rounded-lg bg-success text-white font-bold">تسليم الاختبار</button>}</div>
    </div>
  </div></Layout>;
}
