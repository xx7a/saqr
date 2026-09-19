import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public certificate verification — no auth required.
// Anyone with a verification code can check a certificate's validity.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { code } = body;

    if (!code) return Response.json({ valid: false, error: 'الرمز مطلوب' }, { status: 400 });

    const certs = await base44.asServiceRole.entities.Certificate.filter({ verification_code: code });
    if (!certs || certs.length === 0) {
      return Response.json({ valid: false, error: 'لم يتم العثور على شهادة بهذا الرقم' });
    }

    const cert = certs[0];
    return Response.json({
      valid: cert.is_valid !== false,
      user_name: cert.user_name,
      certificate_type: cert.certificate_type,
      track_name: cert.track_name,
      specialization_name: cert.specialization_name,
      issue_date: cert.issue_date,
      verification_code: cert.verification_code,
    });
  } catch (error) {
    return Response.json({ valid: false, error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}