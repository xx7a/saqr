import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getLabApiConfig, logLabOperation } from '../../shared/realLabApi.ts';

// Tests connectivity to the Lab API. Admin-only.
// Calls GET / on the base URL and reports status, response time, and HTTP code.

export default async function(req) {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'ممنوع — للأدمن فقط' }, { status: 403 });

    const config = await getLabApiConfig(base44);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

    let httpStatus = 0;
    let responseData = null;
    let errorMessage = '';
    let connected = false;

    try {
      const res = await fetch(`${config.baseUrl}/`, {
        method: 'GET',
        headers: { 'X-API-Key': config.apiKey },
        signal: controller.signal,
      });
      httpStatus = res.status;
      const text = await res.text();
      try { responseData = text ? JSON.parse(text) : { raw: text }; } catch { responseData = { raw: text }; }
      connected = res.ok;
    } catch (e) {
      errorMessage = e.message || 'Network error';
    } finally {
      clearTimeout(timeout);
    }

    const responseTime = Date.now() - startTime;

    // Update settings with test result.
    const settings = config.settings;
    if (settings && settings.id) {
      await base44.asServiceRole.entities.LabSettings.update(settings.id, {
        last_connection_test: new Date().toISOString(),
        last_connection_status: connected ? 'connected' : 'failed',
        last_connection_response_time: responseTime,
      });
    }

    await logLabOperation(base44, {
      user_id: user.id, user_name: user.full_name || user.email,
      operation: 'test_connection',
      status: connected ? 'success' : 'failed',
      http_status: httpStatus,
      error_message: errorMessage,
      response_data: responseData,
      duration_ms: responseTime,
    });

    return Response.json({
      connected,
      http_status: httpStatus,
      response_time_ms: responseTime,
      error: errorMessage,
      data: responseData,
      base_url: config.baseUrl,
    });
  } catch (error) {
    return Response.json({
      connected: false,
      error: error.message || 'خطأ داخلي في الخادم',
      response_time_ms: Date.now() - startTime,
    }, { status: 500 });
  }
}