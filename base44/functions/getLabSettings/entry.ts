import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Returns lab infrastructure settings for the admin panel.
// API key is NEVER returned — only whether it's configured.
// Admin-only.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'ممنوع — للأدمن فقط' }, { status: 403 });

    const list = await base44.asServiceRole.entities.LabSettings.list();
    let settings = list && list.length > 0 ? list[0] : null;

    // If no settings record exists, create a default one from current secrets.
    if (!settings) {
      const baseUrl = (secrets.get("LAB_API_BASE_URL") || "").replace(/\/+$/, "");
      if (baseUrl) {
        settings = await base44.asServiceRole.entities.LabSettings.create({
          api_base_url: baseUrl,
          api_key_configured: !!secrets.get("LAB_API_KEY"),
        });
      } else {
        settings = { api_base_url: '', api_key_configured: !!secrets.get("LAB_API_KEY") };
      }
    }

    // Always sync the api_key_configured flag with the actual secret state.
    const apiKeySet = !!secrets.get("LAB_API_KEY");
    if (settings.id && settings.api_key_configured !== apiKeySet) {
      await base44.asServiceRole.entities.LabSettings.update(settings.id, { api_key_configured: apiKeySet });
      settings.api_key_configured = apiKeySet;
    }

    return Response.json({
      settings: {
        ...settings,
        api_key_configured: apiKeySet,
        // Never expose the actual API key
      },
    });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}