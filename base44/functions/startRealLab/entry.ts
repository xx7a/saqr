import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { labApiRequest, getLabApiConfig, logLabOperation } from '../../shared/realLabApi.ts';

// Starts a real interactive lab (Kali desktop + target) via the external Lab API.
// Auth required (students only). Max one active session per user across all labs.
// Returns the session record (session_id, desktop_url, target_ip, status).

export default async function(req) {
  const startTime = Date.now();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });
    if (user.role === 'admin') return Response.json({ error: 'حسابات الإدارة لا تشارك في اللابات' }, { status: 403 });
    if (user.is_test_account) return Response.json({ error: 'الحسابات التجريبية لا تشارك في اللابات' }, { status: 403 });

    const body = await req.json();
    const { lab_id } = body;
    if (!lab_id) return Response.json({ error: 'lab_id مطلوب' }, { status: 400 });

    const lab = await base44.entities.RealLab.get(lab_id);
    if (!lab || !lab.is_published) return Response.json({ error: 'اللاب غير موجود أو غير منشور' }, { status: 404 });
    if (lab.is_enabled === false) return Response.json({ error: 'هذا اللاب غير متاح حاليًا' }, { status: 403 });

    // Check settings: labs_enabled + maintenance_mode
    const config = await getLabApiConfig(base44);
    const settings = config.settings;
    if (settings && settings.labs_enabled === false) {
      return Response.json({ error: 'نظام اللابات غير مفعّل حاليًا' }, { status: 503 });
    }
    if (settings && settings.maintenance_mode === true) {
      return Response.json({ error: settings.maintenance_message || 'نظام اللابات تحت الصيانة حاليًا' }, { status: 503 });
    }

    // Already has an active session for THIS lab? Return it.
    const existing = await base44.asServiceRole.entities.RealLabSession.filter({ user_id: user.id, lab_id });
    const active = (existing || []).find(s => s.status === 'running' || s.status === 'preparing');
    if (active) {
      return Response.json({ session: active, already_active: true });
    }

    // Policy: max one active session across all labs (unless allow_multiple_labs).
    const allowMultiple = settings && settings.allow_multiple_labs === true;
    if (!allowMultiple) {
      const allSessions = await base44.asServiceRole.entities.RealLabSession.filter({ user_id: user.id });
      const anyActive = (allSessions || []).find(s => s.status === 'running' || s.status === 'preparing');
      if (anyActive) {
        return Response.json({
          error: 'لديك جلسة لاب نشطة بالفعل — أوقفها أولاً',
          active_session_id: anyActive.id,
          active_lab_id: anyActive.lab_id,
        }, { status: 409 });
      }
    }

    // Call external Lab API to provision the environment.
    // Send template_id, lab_type, and lab_id to cover different API contract variants.
    const apiRes = await labApiRequest(base44, config.startEndpoint, 'POST', {
      template_id: lab.lab_template_id || lab.backend_lab_type || lab_id,
      lab_type: lab.backend_lab_type || lab.lab_template_id || lab_id,
      lab_id: lab_id,
      user_id: user.id,
      duration_minutes: lab.estimated_minutes || (settings && settings.default_lab_duration) || 45,
    }, config.timeoutMs);

    if (!apiRes.ok) {
      await logLabOperation(base44, {
        user_id: user.id, user_name: user.full_name || user.email,
        lab_id, lab_title: lab.title,
        operation: 'start', status: 'failed',
        http_status: apiRes.status,
        error_message: JSON.stringify(apiRes.data),
        response_data: apiRes.data,
        duration_ms: Date.now() - startTime,
      });
      return Response.json({ error: 'فشل تجهيز اللاب من الخادم الخارجي', details: apiRes.data }, { status: 502 });
    }

    const d = apiRes.data || {};
    const now = new Date();
    const minutes = lab.estimated_minutes || (settings && settings.default_lab_duration) || 45;
    const expires = new Date(now.getTime() + minutes * 60000);

    // Map external API status to our internal enum.
    // "started" → "running" (external API uses "started", our schema uses "running").
    const mapStatus = (s) => (s === 'started' ? 'running' : s);
    // desktop_ready: API may provision asynchronously. Stay in 'preparing' until ready.
    const desktopReady = d.desktop_ready !== false;
    const sessionStatus = desktopReady ? mapStatus(d.status || 'running') : 'preparing';

    // session_id: the external API returns "lab_id" as the session/container identifier.
    // We store it so stop/status calls can target /labs/{lab_id}.
    const session = await base44.asServiceRole.entities.RealLabSession.create({
      user_id: user.id,
      lab_id,
      lab_title: lab.title,
      session_id: d.session_id || d.id || d.lab_id || '',
      status: sessionStatus,
      desktop_url: d.desktop_url || d.url || d.desktopUrl || '',
      target_ip: d.target_ip || d.targetIp || d.ip || '',
      started_at: now.toISOString(),
      expires_at: expires.toISOString(),
    });

    await logLabOperation(base44, {
      user_id: user.id, user_name: user.full_name || user.email,
      lab_id, lab_title: lab.title, session_id: session.session_id,
      operation: 'start', status: 'success',
      http_status: apiRes.status, response_data: d,
      duration_ms: Date.now() - startTime,
    });

    // Return poll interval so frontend knows how often to check status.
    const pollInterval = (settings && settings.status_check_interval_seconds) || 15;
    return Response.json({ session, poll_interval_seconds: pollInterval });
  } catch (error) {
    const base44 = createClientFromRequest(req);
    await logLabOperation(base44, {
      operation: 'start', status: 'failed',
      error_message: error.message || 'خطأ داخلي في الخادم',
      duration_ms: Date.now() - startTime,
    });
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}