import { base44 } from '@/api/base44Client';

/**
 * Compute progress for a set of lessons given progress records.
 * - Deduplicates by lesson_id (Set), so duplicate LessonProgress records don't inflate counts.
 * - Only counts lessons that exist in the published lessons list.
 * - Clamps to 0–100, uses Math.floor (not round) so incomplete never shows 100%.
 * - Returns 0% when no published lessons exist.
 *
 * @param {Array} lessons — Published lesson objects (must have .id)
 * @param {Array} progressRecords — LessonProgress records for the user
 * @returns {{ completed: number, total: number, percent: number, isComplete: boolean, completedLessonIds: Set<string> }}
 */
export function computeProgress(lessons, progressRecords) {
  const publishedLessonIds = new Set((lessons || []).map((l) => l.id));
  const total = publishedLessonIds.size;

  const completedLessonIds = new Set();
  for (const p of progressRecords || []) {
    if (p.status === 'completed' && publishedLessonIds.has(p.lesson_id)) {
      completedLessonIds.add(p.lesson_id);
    }
  }
  const completed = completedLessonIds.size;
  const percent = total > 0 ? Math.min(100, Math.floor((completed / total) * 100)) : 0;
  const isComplete = total > 0 && completed === total;

  return { completed, total, percent, isComplete, completedLessonIds };
}

/**
 * Recompute track enrollment progress from actual data and sync to DB.
 * Fixes stale/wrong progress_percent and completed_lessons arrays.
 * Does NOT delete any LessonProgress records — just recalculates from them.
 *
 * @param {string} userId
 * @param {string} trackId
 * @returns {Promise<{ completed, total, percent, isComplete, completedLessonIds }>}
 */
export async function recomputeTrackProgress(userId, trackId) {
  const [allLessons, allProgress, enrollments] = await Promise.all([
    base44.entities.Lesson.filter({ track_id: trackId, is_published: true }),
    base44.entities.LessonProgress.filter({ user_id: userId, track_id: trackId }),
    base44.entities.TrackEnrollment.filter({ user_id: userId, track_id: trackId }),
  ]);

  const result = computeProgress(allLessons, allProgress);

  const enroll = enrollments?.[0];
  if (enroll) {
    const updates = {
      completed_lessons: [...result.completedLessonIds],
      progress_percent: result.percent,
      status: result.isComplete ? 'completed' : 'active',
    };
    // Only update if values actually changed to avoid unnecessary writes
    if (
      enroll.progress_percent !== result.percent ||
      enroll.status !== updates.status ||
      (enroll.completed_lessons || []).length !== result.completed
    ) {
      await base44.entities.TrackEnrollment.update(enroll.id, updates);
    }
  }

  return result;
}

/**
 * Recompute specialization enrollment progress from actual data and sync to DB.
 * Fetches all published lessons linked to the specialization, reads the user's
 * LessonProgress for those lessons, and updates SpecializationEnrollment.
 *
 * @param {string} userId
 * @param {string} specializationId
 * @returns {Promise<{ completed, total, percent, isComplete, completedLessonIds }>}
 */
export async function recomputeSpecializationProgress(userId, specializationId) {
  const [allLessons, enrollments] = await Promise.all([
    base44.entities.Lesson.filter({ specialization_id: specializationId, is_published: true }),
    base44.entities.SpecializationEnrollment.filter({ user_id: userId, specialization_id: specializationId }),
  ]);

  const lessonIds = new Set((allLessons || []).map((l) => l.id));
  const allProgress = await base44.entities.LessonProgress.filter({ user_id: userId, specialization_id: specializationId });

  const result = computeProgress(allLessons, allProgress);

  const enroll = enrollments?.[0];
  if (enroll) {
    const updates = {
      progress_percent: result.percent,
      status: result.isComplete ? 'completed' : 'active',
    };
    if (enroll.progress_percent !== result.percent || enroll.status !== updates.status) {
      await base44.entities.SpecializationEnrollment.update(enroll.id, updates);
    }
  }

  return result;
}

/**
 * Group lessons by subject_id.
 * @param {Array} lessons
 * @returns {Record<string, Array>} Map of subject_id → lessons array
 */
export function groupLessonsBySubject(lessons) {
  const map = {};
  for (const l of lessons || []) {
    if (!map[l.subject_id]) map[l.subject_id] = [];
    map[l.subject_id].push(l);
  }
  return map;
}