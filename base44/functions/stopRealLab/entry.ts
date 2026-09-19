import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { labApiRequest, getLabApiConfig, buildEndpoint, logLabOperation } from '../../shared/realLabApi.ts';

// Stops a running lab session. Verifies ownership before calling the external API.
// Does NOT delete progress or completion records — only ends the live environment.

export default async function(req) {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });

    const body = await req.json();
    const { session_record_id } = body;
    if (!session_record_id) return Response.json({ error: 'session_record_id مطلوب' }, { status: 400 });

    const session = await base44.entities.RealLabSession.get(session_record_id);
    if (!session || session.user_id !== user.id) {
      return Response.json({ error: 'غير مصرح — لا تملك هذه الجلسة' }, { status: 403 });
    }

    // Call external API to tear down the environment.
    let httpStatus = 200;
    let apiError = '';
    if (session.session_id) {
      try {
        const config = await getLabApiConfig(base44);
        const stopEndpoint = buildEndpoint(config.stopTemplate, session.session_id);
        const apiRes = await labApiRequest(base44, stopEndpoint, 'DELETE', null, config.timeoutMs);
        httpStatus = apiRes.status;
        if (!apiRes.ok) apiError = JSON.stringify(apiRes.data);
      } catch (e) {
        apiError = e.message;
        // Best-effort: mark stopped locally even if external call fails.
      }
    }

    await base44.entities.RealLabSession.update(session_record_id, {
      status: 'stopped',
      stopped_at: new Date().toISOString(),
    });

    await logLabOperation(base44, {
      user_id: user.id, user_name: user.full_name || user.email,
      lab_id: session.lab_id, lab_title: session.lab_title, session_id: session.session_id,
      operation: 'stop', status: apiError ? 'failed' : 'success',
      http_status: httpStatus, error_message: apiError,
      duration_ms: Date.now() - startTime,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}