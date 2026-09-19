import React from 'react';
import { Shield, Star, Award } from 'lucide-react';

export default function CertificateTemplate({ certificate, className = '' }) {
  if (!certificate) return null;

  const isFoundation = certificate.certificate_type === 'foundation';
  const trackName = certificate.track_name || certificate.specialization_name || '';
  const issueDate = certificate.issue_date
    ? new Date(certificate.issue_date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <div
      className={`relative w-full aspect-[1.414/1] bg-gradient-to-br from-[#05080F] via-[#0A0E1A] to-[#05080F] rounded-xl overflow-hidden ${className}`}
      dir="rtl"
    >
      {/* Background glows */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-secondary/5 rounded-full blur-3xl" />

      {/* Dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, #22D3EE 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Borders */}
      <div className="absolute inset-3 border-2 border-gold/40 rounded-lg" />
      <div className="absolute inset-4 border border-primary/25 rounded-md" />

      {/* Corner ornaments */}
      <div className="absolute top-6 right-6 flex items-center gap-1">
        <Star className="w-3 h-3 text-gold/40" fill="currentColor" />
        <div className="w-8 h-px bg-gold/30" />
      </div>
      <div className="absolute top-6 left-6 flex items-center gap-1">
        <div className="w-8 h-px bg-gold/30" />
        <Star className="w-3 h-3 text-gold/40" fill="currentColor" />
      </div>
      <div className="absolute bottom-6 right-6 flex items-center gap-1">
        <Star className="w-3 h-3 text-gold/40" fill="currentColor" />
        <div className="w-8 h-px bg-gold/30" />
      </div>
      <div className="absolute bottom-6 left-6 flex items-center gap-1">
        <div className="w-8 h-px bg-gold/30" />
        <Star className="w-3 h-3 text-gold/40" fill="currentColor" />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-12 py-6 text-center">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center glow-primary">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="text-right">
            <span className="text-base font-bold text-foreground leading-none block">صقر</span>
            <span className="text-[8px] text-foreground-secondary tracking-[0.2em]">SAQR</span>
          </div>
        </div>

        {/* Certificate type */}
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gold/10 border border-gold/30 mb-2">
          <Award className="w-3 h-3 text-gold" />
          <span className="text-[10px] text-gold font-medium tracking-wide">
            {isFoundation ? 'شهادة إكمال مسار تأسيسي' : 'شهادة إكمال تخصص'}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-gradient mb-0.5">شهادة إكمال</h2>
        <p className="text-[10px] text-foreground-secondary tracking-[0.3em] mb-4">CERTIFICATE OF COMPLETION</p>

        {/* Student name */}
        <p className="text-xs text-foreground-secondary mb-1">تشهد منصة صقر التعليمية بأن</p>
        <h1 className="text-2xl font-bold text-gold mb-3 px-6 py-1 border-b border-gold/20">{certificate.user_name}</h1>

        {/* Track name */}
        <p className="text-xs text-foreground-secondary mb-1">قد أتمّ بنجاح متطلبات مسار</p>
        <h3 className="text-lg font-bold text-primary mb-5">{trackName}</h3>

        {/* Footer */}
        <div className="flex items-end justify-between w-full max-w-lg mt-auto">
          <div className="text-right">
            <p className="text-[9px] text-foreground-secondary mb-0.5">تاريخ الإصدار</p>
            <p className="text-xs font-medium text-foreground">{issueDate}</p>
          </div>

          {/* Seal */}
          <div className="relative flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center glow-primary border-2 border-gold/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="absolute -bottom-3 text-[7px] text-primary font-bold tracking-widest">SAQR</div>
          </div>

          <div className="text-left">
            <p className="text-[9px] text-foreground-secondary mb-0.5">رقم التحقق</p>
            <p className="text-xs font-medium text-foreground terminal-font" dir="ltr">{certificate.verification_code}</p>
          </div>
        </div>
      </div>
    </div>
  );
}