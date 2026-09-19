import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { checkFoundationEligibility } from '../../shared/foundationEligibility.ts';

// Server-side scoring for the Saqr Compass quiz.
// Verifies foundation eligibility (same criterion as specialization enrollment),
// scores answers from the DB's published questions (not client-supplied truth),
// calculates per-specialization percentages, determines a recommendation,
// and saves the attempt with a question/correction snapshot so past results
// stay stable even if questions are edited later.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });

    // 1. Verify foundation eligibility — same criterion as specialization enrollment
    const eligibility = await checkFoundationEligibility(base44, user.id);
    if (!eligibility.eligible) {
      return Response.json({
        error: 'لم تكمل متطلبات المسار التأسيسي بعد',
        totalMissing: eligibility.totalMissing,
      }, { status: 403 });
    }

    const body = await req.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers)) {
      return Response.json({ error: 'الإجابات مطلوبة' }, { status: 400 });
    }

    // 2. Fetch all published compass questions (server-side source of truth)
    const questions = await base44.asServiceRole.entities.CompassQuestion.filter({
      is_published: true,
    }, 'order', 100);

    if (!questions || questions.length === 0) {
      return Response.json({ error: 'لا توجد أسئلة منشورة للبوصلة' }, { status: 404 });
    }

    // 3. Score answers against the DB's correct answers
    const questionMap = new Map(questions.map(q => [q.id, q]));
    const scoredAnswers = (answers || [])
      .map(a => {
        const q = questionMap.get(a.question_id);
        if (!q) return null;
        const isCorrect = a.selected_option_id === q.correct_option_id;
        return {
          question_id: a.question_id,
          selected_option_id: a.selected_option_id,
          is_correct: isCorrect,
          specialization_id: q.specialization_id,
        };
      })
      .filter(Boolean);

    // 4. Calculate scores per specialization
    const specScores = {};
    for (const q of questions) {
      if (!specScores[q.specialization_id]) {
        specScores[q.specialization_id] = {
          correct: 0,
          total: 0,
          specialization_name: q.specialization_name || '',
        };
      }
      specScores[q.specialization_id].total++;
    }
    for (const a of scoredAnswers) {
      if (a.is_correct && specScores[a.specialization_id]) {
        specScores[a.specialization_id].correct++;
      }
    }

    const specResults = Object.entries(specScores).map(([specId, s]) => ({
      specialization_id: specId,
      specialization_name: s.specialization_name,
      correct: s.correct,
      total: s.total,
      percent: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    // 5. Determine recommendation
    const sortedResults = [...specResults].sort((a, b) => b.percent - a.percent);
    const topScore = sortedResults[0]?.percent || 0;
    const tied = sortedResults.filter(s => s.percent === topScore);

    let recommendation = null;
    let isWeak = false;

    if (topScore < 50) {
      // All scores weak — suggest reviewing basics
      isWeak = true;
    } else if (tied.length > 1) {
      // Tie — show all tied specializations, no random pick
      recommendation = {
        tied: true,
        tied_spec_ids: tied.map(s => s.specialization_id),
        tied_spec_names: tied.map(s => s.specialization_name),
      };
    } else {
      // Clear winner
      recommendation = {
        tied: false,
        recommended_spec_id: sortedResults[0].specialization_id,
        recommended_spec_name: sortedResults[0].specialization_name,
        score: topScore,
      };
    }

    // 6. Build question/correction snapshot (so past results stay stable)
    const questionSnapshot = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correct_option_id: q.correct_option_id,
      explanation: q.explanation,
      specialization_id: q.specialization_id,
      specialization_name: q.specialization_name,
    }));

    // 7. Check for existing submitted attempt (prevent re-submission)
    const existing = await base44.asServiceRole.entities.CompassAttempt.filter({
      user_id: user.id,
      status: 'submitted',
    });

    let attempt;
    if (existing && existing.length > 0) {
      // Update the existing attempt (allow re-take to overwrite)
      attempt = await base44.asServiceRole.entities.CompassAttempt.update(existing[0].id, {
        answers: scoredAnswers,
        scores_by_spec: specResults,
        recommended_spec_id: recommendation?.recommended_spec_id || null,
        recommended_spec_name: recommendation?.recommended_spec_name || null,
        tied_spec_ids: recommendation?.tied_spec_ids || [],
        tied_spec_names: recommendation?.tied_spec_names || [],
        is_weak: isWeak,
        question_snapshot: questionSnapshot,
        status: 'submitted',
        submitted_date: new Date().toISOString(),
      });
    } else {
      attempt = await base44.asServiceRole.entities.CompassAttempt.create({
        user_id: user.id,
        answers: scoredAnswers,
        scores_by_spec: specResults,
        recommended_spec_id: recommendation?.recommended_spec_id || null,
        recommended_spec_name: recommendation?.recommended_spec_name || null,
        tied_spec_ids: recommendation?.tied_spec_ids || [],
        tied_spec_names: recommendation?.tied_spec_names || [],
        is_weak: isWeak,
        question_snapshot: questionSnapshot,
        status: 'submitted',
        started_date: new Date().toISOString(),
        submitted_date: new Date().toISOString(),
      });
    }

    // 8. Return results
    return Response.json({
      attempt_id: attempt.id,
      scores: specResults,
      recommendation,
      is_weak: isWeak,
      total_questions: questions.length,
      total_correct: scoredAnswers.filter(a => a.is_correct).length,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}