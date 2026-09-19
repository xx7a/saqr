import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkFoundationEligibility } from '../../shared/foundationEligibility.ts';

// Server-side check: is the current user eligible to enroll in a specialization?
// Eligible = all available foundation tracks are fully completed (lessons + tests).
// Returns detailed missing requirements so the UI can show them by name with direct links.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });

    const result = await checkFoundationEligibility(base44, user.id);

    // Also return existing specialization enrollment (if any) so the UI knows
    const existing = await base44.asServiceRole.entities.SpecializationEnrollment.filter({
      user_id: user.id,
    });

    return Response.json({
      eligible: result.eligible,
      foundationTracks: result.foundationTracks,
      missingRequirements: result.missingRequirements,
      totalMissing: result.totalMissing,
      existingEnrollment: existing && existing.length > 0 ? existing[0] : null,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}