import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Awards lab competition points when a student completes all tasks in an
// independent lab. Points are awarded ONCE per user+lab — idempotent.
// Server-side verification: checks lab type, task completion, existing reward.
// Excludes admins and test accounts from the competition.
// Default points by difficulty: easy=50, medium=100, hard=150.

const DEFAULT_POINTS = { easy: 50, medium: 100, hard: 150 };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });

    // Exclude admins and test accounts from competition
    if (user.role === 'admin') return Response.json({ error: 'حسابات الإدارة لا تشارك في المنافسة' }, { status: 403 });
    if (user.is_test_account) return Response.json({ error: 'الحسابات التجريبية لا تشارك في المنافسة' }, { status: 403 });

    const body = await req.json();
    const { lab_id } = body;
    if (!lab_id) return Response.json({ error: 'lab_id مطلوب' }, { status: 400 });

    // 1. Get lab data — must be independent type
    const lab = await base44.entities.Lab.get(lab_id);
    if (!lab) return Response.json({ error: 'المختبر غير موجود' }, { status: 404 });
    if (lab.lab_type !== 'independent') return Response.json({ error: 'النقاط تُمنح للمختبرات المستقلة فقط' }, { status: 400 });

    // 2. Check if reward already exists — idempotent, no double award
    const existing = await base44.asServiceRole.entities.LabReward.filter({ user_id: user.id, lab_id });
    if (existing && existing.length > 0) {
      return Response.json({ already_awarded: true, points: existing[0].points_awarded, lab_points: user.lab_points || 0 });
    }

    // 3. Verify all tasks are actually completed in LabProgress
    const progressData = await base44.entities.LabProgress.filter({ user_id: user.id, lab_id });
    const lp = progressData?.[0];
    if (!lp) return Response.json({ error: 'لم يبدأ هذا المختبر بعد' }, { status: 400 });

    const totalTasks = (lab.tasks || []).length;
    const completedTasks = (lp.completed_tasks || []).length;
    if (totalTasks === 0 || completedTasks < totalTasks) {
      return Response.json({ error: `لم تكتمل جميع المهام (${completedTasks}/${totalTasks})` }, { status: 400 });
    }

    // 4. Calculate points from lab difficulty (or custom points field)
    const points = lab.points || DEFAULT_POINTS[lab.difficulty] || 50;

    // 5. Create reward record (service role — RLS blocks direct user create)
    const reward = await base44.asServiceRole.entities.LabReward.create({
      user_id: user.id,
      lab_id,
      lab_title: lab.title,
      points_awarded: points,
      awarded_date: new Date().toISOString(),
    });

    // 6. Update user's lab_points total (service role to bypass RLS)
    const newLabPoints = (user.lab_points || 0) + points;
    await base44.asServiceRole.entities.User.update(user.id, { lab_points: newLabPoints });

    return Response.json({ awarded: true, points, lab_points: newLabPoints, reward_id: reward.id });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}