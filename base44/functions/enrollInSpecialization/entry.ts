import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkFoundationEligibility } from '../../shared/foundationEligibility.ts';

// Server-side enrollment in a specialization.
// Verifies foundation eligibility from actual DB records (not a stored flag),
// then creates the SpecializationEnrollment via service role.
// Prevents ineligible students from enrolling even via direct API calls.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });

    const body = await req.json();
    const { specialization_id } = body;
    if (!specialization_id) return Response.json({ error: 'specialization_id مطلوب' }, { status: 400 });

    // 1. Verify foundation eligibility from real records
    const eligibility = await checkFoundationEligibility(base44, user.id);
    if (!eligibility.eligible) {
      return Response.json({
        error: 'لم تكمل جميع متطلبات المسار التأسيسي',
        missingRequirements: eligibility.missingRequirements,
        totalMissing: eligibility.totalMissing,
      }, { status: 403 });
    }

    // 2. Check for existing enrollment (one specialization per student)
    const existing = await base44.asServiceRole.entities.SpecializationEnrollment.filter({
      user_id: user.id,
    });
    if (existing && existing.length > 0) {
      return Response.json({ enrollment: existing[0], already_enrolled: true });
    }

    // 3. Get specialization info
    const spec = await base44.asServiceRole.entities.Specialization.get(specialization_id);
    if (!spec) return Response.json({ error: 'التخصص غير موجود' }, { status: 404 });
    if (spec.availability_status !== 'available') {
      return Response.json({ error: 'هذا التخصص غير متاح حاليًا' }, { status: 400 });
    }

    // 4. Create enrollment via service role (bypasses RLS — create restricted to admin)
    const enrollment = await base44.asServiceRole.entities.SpecializationEnrollment.create({
      user_id: user.id,
      specialization_id: spec.id,
      specialization_name: spec.name_ar,
      enrolled_date: new Date().toISOString(),
      progress_percent: 0,
      status: 'active',
    });

    return Response.json({ enrollment, enrolled: true });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}