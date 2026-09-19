import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { labApiRequest, getLabApiConfig, logLabOperation } from '../../shared/realLabApi.ts';

// Validates a submitted flag via the external SAQR Labs API.
// POST /labs/{lab_id}/flag — the correct flag NEVER enters Base44 or the frontend.
// We forward the submission and return only the API's correct/incorrect verdict.
// Awards points ONCE per user+lab (idempotent via RealLabCompletion).
// Points go to user.lab_points — the same field the leaderboard uses.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });
    if (user.role === 'admin') return Response.json({ error: 'حسابات الإدارة لا تشارك في اللابات' }, { status: 403 });
    if (user.is_test_account) return Response.json({ error: 'الحسابات التجريبية لا تشارك في اللابات' }, { status: 403 });

    const body = await req.json();
    const { lab_id, flag } = body;
    if (!lab_id || !flag) return Response.json({ error: 'lab_id و flag مطلوبان' }, { status: 400 });

    const lab = await base44.entities.RealLab.get(lab_id);
    if (!lab || !lab.is_published) return Response.json({ error: 'اللاب غير موجود' }, { status: 404 });

    // Idempotency: already completed — no re-award.
    const existing = await base44.asServiceRole.entities.RealLabCompletion.filter({ user_id: user.id, lab_id });
    if (existing && existing.length > 0) {
      return Response.json({
        already_completed: true,
        correct: true,
        points_awarded: existing[0].points_awarded,
        lab_points: user.lab_points || 0,
      });
    }

    // Find the active session to get the external lab_id (stored as session_id).
    // The external API's lab_id is the session/container identifier returned at start.
    const sessions = await base44.asServiceRole.entities.RealLabSession.filter({ user_id: user.id, lab_id });
    const activeSession = (sessions || []).find(s => s.status === 'running' || s.status === 'preparing');
    if (!activeSession || !activeSession.session_id) {
      return Response.json({ error: 'لا توجد جلسة لاب نشطة — ابدأ اللاب أولاً' }, { status: 400 });
    }

    const externalLabId = activeSession.session_id;

    // Call external SAQR Labs API to verify the flag.
    // POST /labs/{lab_id}/flag with body { flag }
    const config = await getLabApiConfig(base44);
    const flagEndpoint = `/labs/${externalLabId}/flag`;
    let apiRes;
    try {
      apiRes = await labApiRequest(base44, flagEndpoint, 'POST', { flag: String(flag).trim() }, config.timeoutMs);
    } catch (e) {
      // Connection error — don't count as wrong.
      await logLabOperation(base44, {
        user_id: user.id, lab_id, lab_title: lab.title,
        operation: 'submit_flag', status: 'failed',
        error_message: `connection_error: ${e.message}`,
      });
      return Response.json({ error: 'تعذر التحقق من الـFlag، حاول مرة أخرى.' }, { status: 502 });
    }

    if (!apiRes.ok) {
      await logLabOperation(base44, {
        user_id: user.id, lab_id, lab_title: lab.title,
        operation: 'submit_flag', status: 'failed',
        http_status: apiRes.status,
        error_message: JSON.stringify(apiRes.data),
      });
      return Response.json({ error: 'تعذر التحقق من الـFlag، حاول مرة أخرى.' }, { status: 502 });
    }

    const d = apiRes.data || {};

    if (d.correct === true) {
      // Award points (idempotent — already checked above).
      const points = lab.points || 100;
      await base44.asServiceRole.entities.RealLabCompletion.create({
        user_id: user.id,
        lab_id,
        lab_title: lab.title,
        points_awarded: points,
        flag_submitted: String(flag).trim(),
        completed_date: new Date().toISOString(),
      });

      const newLabPoints = (user.lab_points || 0) + points;
      await base44.asServiceRole.entities.User.update(user.id, { lab_points: newLabPoints });

      await logLabOperation(base44, {
        user_id: user.id, lab_id, lab_title: lab.title,
        operation: 'submit_flag', status: 'success',
        response_data: { points_awarded: points, scenario: d.scenario },
      });

      return Response.json({
        correct: true,
        points_awarded: points,
        lab_points: newLabPoints,
        message: d.message || 'Correct flag',
      });
    } else {
      // Incorrect flag — don't stop the lab.
      await logLabOperation(base44, {
        user_id: user.id, lab_id, lab_title: lab.title,
        operation: 'submit_flag', status: 'failed',
        error_message: 'wrong_flag',
      });
      return Response.json({
        correct: false,
        message: d.message || 'Incorrect flag',
      });
    }
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}