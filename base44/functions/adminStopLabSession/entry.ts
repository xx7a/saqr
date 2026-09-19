import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Admin-only: stops any user's lab session by session record ID.
// Used from the admin sessions management page.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'ممنوع — للأدمن فقط' }, { status: 403 });

    const body = await req.json();
    const { session_record_id } = body;
    if (!session_record_id) return Response.json({ error: 'session_record_id مطلوب' }, { status: 400 });

    const session = await base44.asServiceRole.entities.RealLabSession.get(session_record_id);
    if (!session) return Response.json({ error: 'الجلسة غير موجودة' }, { status: 404 });

    // Call external API to stop the environment.
    if (session.session_id) {
      try {
        const { labApiRequest, getLabApiConfig, buildEndpoint } = await import('../../shared/realLabApi.ts');
        const config = await getLabApiConfig(base44);
        const stopEndpoint = buildEndpoint(config.stopTemplate, session.session_id);
        await labApiRequest(base44, stopEndpoint, 'DELETE', null, config.timeoutMs);
      } catch {
        // Best-effort
      }
    }

    await base44.asServiceRole.entities.RealLabSession.update(session_record_id, {
      status: 'stopped',
      stopped_at: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}