import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { labApiRequest, getLabApiConfig, buildEndpoint, logLabOperation } from '../../shared/realLabApi.ts';

// Admin-only: stops a test lab session by session_id.

export default async function(req) {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'ممنوع — للأدمن فقط' }, { status: 403 });

    const body = await req.json();
    const { session_id } = body;
    if (!session_id) return Response.json({ error: 'session_id مطلوب' }, { status: 400 });

    const config = await getLabApiConfig(base44);
    const stopEndpoint = buildEndpoint(config.stopTemplate, session_id);
    const apiRes = await labApiRequest(base44, stopEndpoint, 'DELETE', null, config.timeoutMs);

    await logLabOperation(base44, {
      user_id: user.id, user_name: user.full_name || user.email,
      session_id,
      operation: 'test_stop',
      status: apiRes.ok ? 'success' : 'failed',
      http_status: apiRes.status,
      error_message: apiRes.ok ? '' : JSON.stringify(apiRes.data),
      duration_ms: Date.now() - startTime,
    });

    if (!apiRes.ok) {
      return Response.json({ success: false, error: 'فشل إيقاف جلسة الاختبار', details: apiRes.data }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}