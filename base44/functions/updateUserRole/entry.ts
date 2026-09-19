import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Protected server-side function for changing user roles.
// Only admins can call this — the role is verified from the database on every request.
// Students calling this endpoint directly get 403 Forbidden.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // 1. Verify the caller is authenticated
    const admin = await base44.auth.me();
    if (!admin) {
      return Response.json({ error: 'غير مصرح — يجب تسجيل الدخول' }, { status: 401 });
    }

    // 2. Verify admin role — read from database, not from the client
    if (admin.role !== 'admin') {
      return Response.json({ error: 'ممنوع: هذه العملية للمديرين فقط' }, { status: 403 });
    }

    // 3. Parse and validate input
    const body = await req.json();
    const { targetUserId, newRole } = body;

    if (!targetUserId || !newRole) {
      return Response.json({ error: 'targetUserId و newRole مطلوبان' }, { status: 400 });
    }

    if (!['admin', 'student'].includes(newRole)) {
      return Response.json({ error: 'قيمة الدور غير صالحة' }, { status: 400 });
    }

    // 4. Prevent self-modification — an admin cannot change their own role
    if (targetUserId === admin.id) {
      return Response.json({ error: 'لا يمكنك تغيير دورك الخاص' }, { status: 403 });
    }

    // 5. Update the target user's role using the service role (elevated privileges)
    const updated = await base44.asServiceRole.entities.User.update(targetUserId, { role: newRole });

    return Response.json({
      success: true,
      user: { id: updated.id, email: updated.email, role: updated.role }
    });
  } catch (error) {
    return Response.json({ error: error.message || 'خطأ داخلي في الخادم' }, { status: 500 });
  }
}