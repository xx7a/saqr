import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const entityType = body.entity_type || 'all';
    const summary = {};

    // === Tracks ===
    if (entityType === 'all' || entityType === 'tracks') {
      const items = await base44.asServiceRole.entities.Track.list();
      const need = items.filter(t => !t.name_en);
      summary.tracks = { total: items.length, translated: 0, skipped: items.length - need.length };
      if (need.length > 0) {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Translate these Arabic cybersecurity track names and descriptions to English. Maintain technical accuracy. Return JSON.\n\n${JSON.stringify(need.map(t => ({ id: t.id, name: t.name, description: t.description || '' })))}`,
          response_json_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name_en: { type: 'string' }, description_en: { type: 'string' } } } } } }
        });
        for (const item of result.items || []) {
          try { await base44.asServiceRole.entities.Track.update(item.id, { name_en: item.name_en, description_en: item.description_en }); summary.tracks.translated++; } catch (e) {}
        }
      }
    }

    // === Subjects ===
    if (entityType === 'all' || entityType === 'subjects') {
      const items = await base44.asServiceRole.entities.Subject.list();
      const need = items.filter(s => !s.name_en);
      summary.subjects = { total: items.length, translated: 0, skipped: items.length - need.length };
      if (need.length > 0) {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Translate these Arabic cybersecurity subject names and descriptions to English. Maintain technical accuracy. Return JSON.\n\n${JSON.stringify(need.map(s => ({ id: s.id, name: s.name, description: s.description || '' })))}`,
          response_json_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name_en: { type: 'string' }, description_en: { type: 'string' } } } } } }
        });
        for (const item of result.items || []) {
          try { await base44.asServiceRole.entities.Subject.update(item.id, { name_en: item.name_en, description_en: item.description_en }); summary.subjects.translated++; } catch (e) {}
        }
      }
    }

    // === Specializations ===
    if (entityType === 'all' || entityType === 'specializations') {
      const items = await base44.asServiceRole.entities.Specialization.list();
      const need = items.filter(s => !s.name_en);
      summary.specializations = { total: items.length, translated: 0, skipped: items.length - need.length };
      if (need.length > 0) {
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Translate these Arabic cybersecurity specialization fields to English. name_ar is the Arabic name. Return JSON.\n\n${JSON.stringify(need.map(s => ({ id: s.id, name_ar: s.name_ar || '', description: s.description || '', work_nature: s.work_nature || '' })))}`,
          response_json_schema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name_en: { type: 'string' }, description_en: { type: 'string' }, work_nature_en: { type: 'string' } } } } } }
        });
        for (const item of result.items || []) {
          try { await base44.asServiceRole.entities.Specialization.update(item.id, { name_en: item.name_en, description_en: item.description_en, work_nature_en: item.work_nature_en }); summary.specializations.translated++; } catch (e) {}
        }
      }
    }

    // === Lessons ===
    if (entityType === 'all' || entityType === 'lessons') {
      const items = await base44.asServiceRole.entities.Lesson.list();
      const need = items.filter(l => !l.title_en);
      summary.lessons = { total: items.length, translated: 0, skipped: items.length - need.length };
      for (const lesson of need) {
        try {
          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Translate this Arabic cybersecurity lesson to English. Preserve all markdown formatting, code blocks, and structure. Maintain educational depth and technical accuracy. Return JSON.\n\nTitle: ${lesson.title || ''}\nShort description: ${lesson.short_description || ''}\nContent: ${lesson.content || ''}`,
            response_json_schema: { type: 'object', properties: { title_en: { type: 'string' }, short_description_en: { type: 'string' }, content_en: { type: 'string' } } }
          });
          await base44.asServiceRole.entities.Lesson.update(lesson.id, {
            title_en: result.title_en,
            short_description_en: result.short_description_en,
            content_en: result.content_en
          });
          summary.lessons.translated++;
        } catch (e) {}
      }
    }

    // === Labs ===
    if (entityType === 'all' || entityType === 'labs') {
      const items = await base44.asServiceRole.entities.Lab.list();
      const need = items.filter(l => !l.title_en);
      summary.labs = { total: items.length, translated: 0, skipped: items.length - need.length };
      for (const lab of need) {
        try {
          const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: `Translate this Arabic cybersecurity lab to English. Preserve all formatting. Return JSON.\n\nTitle: ${lab.title || ''}\nShort description: ${lab.short_description || ''}\nScenario: ${lab.scenario || ''}\nGoal: ${lab.goal || ''}\nInstructions: ${lab.instructions || ''}\nIntro: ${lab.intro || ''}\nHint: ${lab.hint || ''}\nSuccess message: ${lab.success_message || ''}`,
            response_json_schema: { type: 'object', properties: { title_en: { type: 'string' }, short_description_en: { type: 'string' }, scenario_en: { type: 'string' }, goal_en: { type: 'string' }, instructions_en: { type: 'string' }, intro_en: { type: 'string' }, hint_en: { type: 'string' }, success_message_en: { type: 'string' } } }
          });
          await base44.asServiceRole.entities.Lab.update(lab.id, {
            title_en: result.title_en,
            short_description_en: result.short_description_en,
            scenario_en: result.scenario_en,
            goal_en: result.goal_en,
            instructions_en: result.instructions_en,
            intro_en: result.intro_en,
            hint_en: result.hint_en,
            success_message_en: result.success_message_en
          });
          summary.labs.translated++;
        } catch (e) {}
      }
    }

    return Response.json({ success: true, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}