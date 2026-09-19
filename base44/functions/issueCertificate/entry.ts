import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Issues a foundation certificate after verifying the student completed
// all lessons and passed all tests in the track.
// Uses service role to create the certificate (bypasses RLS) so users can't
// self-issue via the client SDK directly.
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SAQR-';
  for (let s = 0; s < 3; s++) {
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (s < 2) code += '-';
  }
  return code;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });

    const body = await req.json();
    const { track_id, specialization_id } = body;

    // === Specialization certificate ===
    if (specialization_id) {
      // 1. Check if certificate already exists — avoid duplicates
      const existingSpec = await base44.asServiceRole.entities.Certificate.filter({ user_id: user.id, specialization_id });
      if (existingSpec && existingSpec.length > 0) {
        return Response.json({ certificate: existingSpec[0], already_exists: true });
      }

      // 2. Get specialization info
      const specialization = await base44.entities.Specialization.get(specialization_id);

      // 3. Get all published lessons in the specialization
      const specLessons = await base44.entities.Lesson.filter({ specialization_id, is_published: true });
      if (!specLessons || specLessons.length === 0) {
        return Response.json({ error: 'لا توجد دروس منشورة في هذا التخصص' }, { status: 400 });
      }

      // 4. Check all lessons are completed
      const specProgress = await base44.entities.LessonProgress.filter({ user_id: user.id, specialization_id, status: 'completed' });
      const specCompletedIds = new Set(specProgress.map(p => p.lesson_id));
      const allSpecLessonsCompleted = specLessons.every(l => specCompletedIds.has(l.id));

      if (!allSpecLessonsCompleted) {
        return Response.json({
          error: `لم تكمل جميع الدروس (${specProgress.length}/${specLessons.length})`,
          completed: specProgress.length,
          total: specLessons.length
        }, { status: 400 });
      }

      // 5. Check all tests are passed (if any tests exist for subjects in this specialization)
      const specSubjects = await base44.entities.Subject.filter({ specialization_id, is_published: true });
      let allSpecTestsPassed = true;
      let specTestCount = 0;
      let specPassedCount = 0;
      for (const subj of specSubjects) {
        const subjTests = await base44.entities.SubjectTest.filter({ subject_id: subj.id, is_published: true });
        for (const t of subjTests) {
          specTestCount++;
          const attempts = await base44.entities.TestAttempt.filter({ user_id: user.id, test_id: t.id, passed: true });
          if (attempts && attempts.length > 0) {
            specPassedCount++;
          } else {
            allSpecTestsPassed = false;
          }
        }
      }
      if (specTestCount > 0 && !allSpecTestsPassed) {
        return Response.json({
          error: `لم تجتز جميع الاختبارات (${specPassedCount}/${specTestCount})`,
          passed: specPassedCount,
          total: specTestCount
        }, { status: 400 });
      }

      // 6. Generate unique verification code and create certificate
      const specVerificationCode = generateCode();
      const specCert = await base44.asServiceRole.entities.Certificate.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        certificate_type: 'specialization',
        specialization_id,
        specialization_name: specialization.name_ar || specialization.name_en,
        issue_date: new Date().toISOString(),
        verification_code: specVerificationCode,
        is_valid: true,
      });

      // 7. Update enrollment status to completed
      const specEnrollments = await base44.entities.SpecializationEnrollment.filter({ user_id: user.id, specialization_id });
      if (specEnrollments && specEnrollments.length > 0) {
        await base44.entities.SpecializationEnrollment.update(specEnrollments[0].id, {
          status: 'completed',
          progress_percent: 100,
        });
      }

      return Response.json({ certificate: specCert, issued: true });
    }

    // === Foundation certificate (existing logic) ===
    if (!track_id) return Response.json({ error: 'track_id أو specialization_id مطلوب' }, { status: 400 });

    // 1. Check if certificate already exists — avoid duplicates
    const existing = await base44.asServiceRole.entities.Certificate.filter({ user_id: user.id, track_id });
    if (existing && existing.length > 0) {
      return Response.json({ certificate: existing[0], already_exists: true });
    }

    // 2. Get track info
    const track = await base44.entities.Track.get(track_id);

    // 3. Get all published lessons in the track
    const lessons = await base44.entities.Lesson.filter({ track_id, is_published: true });
    if (!lessons || lessons.length === 0) {
      return Response.json({ error: 'لا توجد دروس منشورة في هذا المسار' }, { status: 400 });
    }

    // 4. Check all lessons are completed
    const progress = await base44.entities.LessonProgress.filter({ user_id: user.id, track_id, status: 'completed' });
    const completedLessonIds = new Set(progress.map(p => p.lesson_id));
    const allLessonsCompleted = lessons.every(l => completedLessonIds.has(l.id));

    if (!allLessonsCompleted) {
      return Response.json({
        error: `لم تكمل جميع الدروس (${progress.length}/${lessons.length})`,
        completed: progress.length,
        total: lessons.length
      }, { status: 400 });
    }

    // 5. Check all tests are passed (if any tests exist)
    const tests = await base44.entities.SubjectTest.filter({ track_id, is_published: true });
    if (tests && tests.length > 0) {
      const attempts = await base44.entities.TestAttempt.filter({ user_id: user.id, track_id, passed: true });
      const passedTestIds = new Set(attempts.map(a => a.test_id));
      const allTestsPassed = tests.every(t => passedTestIds.has(t.id));

      if (!allTestsPassed) {
        return Response.json({
          error: `لم تجتز جميع الاختبارات (${attempts.length}/${tests.length})`,
          passed: attempts.length,
          total: tests.length
        }, { status: 400 });
      }
    }

    // 6. Generate unique verification code and create certificate
    const verificationCode = generateCode();
    const cert = await base44.asServiceRole.entities.Certificate.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      certificate_type: 'foundation',
      track_id,
      track_name: track.name,
      issue_date: new Date().toISOString(),
      verification_code: verificationCode,
      is_valid: true,
    });

    // 7. Update enrollment status to completed
    const enrollments = await base44.entities.TrackEnrollment.filter({ user_id: user.id, track_id });
    if (enrollments && enrollments.length > 0) {
      await base44.entities.TrackEnrollment.update(enrollments[0].id, {
        status: 'completed',
        progress_percent: 100,
      });
    }

    return Response.json({ certificate: cert, issued: true });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}