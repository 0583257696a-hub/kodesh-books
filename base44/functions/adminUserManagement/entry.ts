import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action, userId, newRole, targetEmail } = await req.json();

    if (action === 'setRole') {
      await base44.asServiceRole.entities.User.update(userId, { role: newRole });
      return Response.json({ success: true, message: `תפקיד עודכן ל-${newRole}` });
    }

    if (action === 'sendPasswordReset') {
      // Send password reset email to user
      await base44.auth.resetPasswordRequest(targetEmail);
      return Response.json({ success: true, message: `נשלח מייל לאיפוס סיסמה ל-${targetEmail}` });
    }

    return Response.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});