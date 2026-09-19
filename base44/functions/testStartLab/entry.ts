import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { labApiRequest, getLabApiConfig, buildEndpoint, logLabOperation } from '../../shared/realLabApi.ts';

// Admin-only: starts a test lab session to verify the full Start Lab flow.
// Returns session_id, status, target_ip, desktop_url from the external API.
// The admin can stop the test session via stopTestLab.

export default async function(req) {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'ممنوع — للأدمن فقط' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const templateId = body.template_id || body.lab_type || 'test-lab';

    const config = await getLabApiConfig(base44);
    const apiRes = await labApiRequest(base44, config.startEndpoint, 'POST', {
      template_id: templateId,
      lab_type: templateId,
      user_id: `admin-test-${user.id}`,
      duration_minutes: 10,
    }, config.timeoutMs);

    const responseTime = Date.now() - startTime;

    await logLabOperation(base44, {
      user_id: user.id, user_name: user.full_name || user.email,
      operation: 'test_start',
      status: apiRes.ok ? 'success' : 'failed',
      http_status: apiRes.status,
      error_message: apiRes.ok ? '' : JSON.stringify(apiRes.data),
      response_data: apiRes.data,
      duration_ms: responseTime,
    });

    if (!apiRes.ok) {
      return Response.json({
        success: false,
        error: 'فشل تشغيل لاب الاختبار',
        details: apiRes.data,
        http_status: apiRes.status,
      }, { status: 502 });
    }

    const d = apiRes.data || {};
    return Response.json({
      success: true,
      session_id: d.session_id || d.id || '',
      status: d.status || 'running',
      target_ip: d.target_ip || d.targetIp || d.ip || '',
      desktop_url: d.desktop_url || d.url || d.desktopUrl || '',
      raw: d,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message || 'خطأ داخلي في الخادم',
    }, { status: 500 });
  }
}