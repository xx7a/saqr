import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Updates lab infrastructure settings. Admin-only.
// API key is NEVER stored here — it stays in secrets and is managed separately.
// If api_base_url is empty, falls back to the LAB_API_BASE_URL secret.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'ممنوع — للأدمن فقط' }, { status: 403 });

    const body = await req.json();
    const updates = body.settings || body;

    // Strip any attempt to set api_key_configured or other protected fields from the client.
    delete updates.id;
    delete updates.created_date;
    delete updates.updated_date;
    delete updates.created_by_id;

    const list = await base44.asServiceRole.entities.LabSettings.list();
    let settings = list && list.length > 0 ? list[0] : null;

    if (settings && settings.id) {
      const updated = await base44.asServiceRole.entities.LabSettings.update(settings.id, updates);
      return Response.json({ settings: updated });
    } else {
      const created = await base44.asServiceRole.entities.LabSettings.create(updates);
      return Response.json({ settings: created });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}