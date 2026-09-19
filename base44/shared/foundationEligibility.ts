/**
 * Unified foundation-eligibility logic — single source of truth.
 * Used by checkSpecializationEligibility and enrollInSpecialization backend functions.
 *
 * A foundation track is "complete" when:
 *  - It is published/available (availability_status === 'available'), AND
 *  - All its published lessons have LessonProgress status='completed' for the user, AND
 *  - All its published SubjectTests have a passed TestAttempt for the user.
 * A track with 0 published lessons is trivially satisfied (nothing to complete).
 * "coming_soon"/"hidden" tracks are not requirements.
 *
 * Foundation is eligible for specialization enrollment iff ALL available foundation tracks are complete.
 */

export async function checkFoundationEligibility(base44, userId) {
  // 1. Find all foundation tracks that are available (not coming_soon/hidden)
  const allTracks = await base44.asServiceRole.entities.Track.filter({ track_type: 'foundation' });
  const foundationTracks = (allTracks || []).filter(
    (t) => t.availability_status !== 'coming_soon' && t.availability_status !== 'hidden'
  );

  const trackResults = [];
  const missingRequirements = [];

  for (const track of foundationTracks) {
    // Published lessons in this track
    const lessons = await base44.asServiceRole.entities.Lesson.filter({
      track_id: track.id,
      is_published: true,
    });
    const lessonIds = new Set((lessons || []).map((l) => l.id));

    // Completed lesson progress for this user in this track
    const progress = await base44.asServiceRole.entities.LessonProgress.filter({
      user_id: userId,
      track_id: track.id,
      status: 'completed',
    });
    const completedLessonIds = new Set((progress || []).map((p) => p.lesson_id));

    // Published subject tests in this track
    const tests = await base44.asServiceRole.entities.SubjectTest.filter({
      track_id: track.id,
      is_published: true,
    });
    const testIds = new Set((tests || []).map((t) => t.id));

    // Passed test attempts for this user in this track
    const attempts = await base44.asServiceRole.entities.TestAttempt.filter({
      user_id: userId,
      track_id: track.id,
      passed: true,
    });
    const passedTestIds = new Set((attempts || []).map((a) => a.test_id));

    // Missing lessons (exist in track but not completed)
    const missingLessons = (lessons || [])
      .filter((l) => !completedLessonIds.has(l.id))
      .map((l) => ({
        type: 'lesson',
        id: l.id,
        title: l.title,
        subject_id: l.subject_id,
        track_name: track.name,
        link: `/lesson/${l.id}`,
      }));

    // Missing tests (exist in track but not passed)
    const missingTests = (tests || [])
      .filter((t) => !passedTestIds.has(t.id))
      .map((t) => ({
        type: 'test',
        id: t.id,
        title: t.title || 'اختبار المادة',
        subject_id: t.subject_id,
        track_name: track.name,
        link: `/test/${t.id}`,
      }));

    const lessonsTotal = lessonIds.size;
    const lessonsCompleted = lessonsTotal === 0 ? 0 : (lessons || []).filter((l) => completedLessonIds.has(l.id)).length;
    const testsTotal = testIds.size;
    const testsPassed = testsTotal === 0 ? 0 : (tests || []).filter((t) => passedTestIds.has(t.id)).length;

    // A track with 0 lessons and 0 tests is trivially complete (nothing to do)
    const hasContent = lessonsTotal > 0 || testsTotal > 0;
    const isComplete = !hasContent || (missingLessons.length === 0 && missingTests.length === 0);

    trackResults.push({
      id: track.id,
      name: track.name,
      lessonsTotal,
      lessonsCompleted,
      testsTotal,
      testsPassed,
      isComplete,
      missingLessons,
      missingTests,
    });

    for (const ml of missingLessons) missingRequirements.push(ml);
    for (const mt of missingTests) missingRequirements.push(mt);
  }

  const eligible = trackResults.length > 0 && trackResults.every((t) => t.isComplete);

  return {
    eligible,
    foundationTracks: trackResults,
    missingRequirements,
    totalMissing: missingRequirements.length,
  };
}