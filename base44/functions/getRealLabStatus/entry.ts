import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { labApiRequest, getLabApiConfig, buildEndpoint, logLabOperation } from '../../shared/realLabApi.ts';

// Returns the current status of a lab session. Syncs with the external API and
// auto-expires sessions past their expires_at time.

export default async function(req) {
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

    let status = session.status;

    // Auto-expire if past deadline.
    if (session.expires_at && new Date(session.expires_at) < new Date() &&
        (status === 'running' || status === 'preparing')) {
      await base44.entities.RealLabSession.update(session_record_id, { status: 'expired' });
      status = 'expired';
      await logLabOperation(base44, {
        user_id: user.id, lab_id: session.lab_id, lab_title: session.lab_title,
        session_id: session.session_id, operation: 'expire', status: 'success',
      });
    }

    // Sync with external API for live sessions.
    let apiOffline = false;
    if (session.session_id && (status === 'running' || status === 'preparing')) {
      try {
        const config = await getLabApiConfig(base44);
        const statusEndpoint = buildEndpoint(config.statusTemplate, session.session_id);
        const apiRes = await labApiRequest(base44, statusEndpoint, 'GET', null, config.timeoutMs);
        if (apiRes.ok && apiRes.data) {
          const update = {};
          // Map external API status to our internal enum ("started" → "running").
          const mapStatus = (s) => (s === 'started' ? 'running' : s);
          // Handle desktop_ready: transition from preparing to running when ready.
          if (apiRes.data.desktop_ready === true && status === 'preparing') {
            update.status = 'running';
            status = 'running';
          } else if (apiRes.data.status) {
            const mapped = mapStatus(apiRes.data.status);
            update.status = mapped;
            status = mapped;
          }
          if (apiRes.data.desktop_url) update.desktop_url = apiRes.data.desktop_url;
          if (apiRes.data.target_ip) update.target_ip = apiRes.data.target_ip;
          if (Object.keys(update).length > 0) {
            await base44.entities.RealLabSession.update(session_record_id, update);
          }
        } else if (apiRes.status === 0 || apiRes.status >= 500) {
          apiOffline = true;
        }
      } catch {
        // External API unreachable — flag offline but keep last known status.
        apiOffline = true;
      }
    }

    const updated = await base44.entities.RealLabSession.get(session_record_id);
    return Response.json({ session: updated, api_offline: apiOffline });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}