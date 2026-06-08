import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DEFAULT_ADMIN_EMAIL = 'info@otzar-hakodesh.co.il';

async function getSettingsMap(base44: any) {
  const rows = await base44.asServiceRole.entities.SiteSettings.list();
  return (rows || []).reduce((map: Record<string, string>, row: any) => {
    if (row?.key) map[row.key] = row.value || '';
    return map;
  }, {});
}

async function createEmailNotification(base44: any, data: Record<string, any>) {
  try {
    if (base44.asServiceRole.entities.EmailNotification?.create) {
      await base44.asServiceRole.entities.EmailNotification.create({
        ...data,
        created_at: data.created_at || new Date().toISOString(),
      });
    }
  } catch {
    // Email notification logging must never block the order flow.
  }
}

Deno.serve(async (req) => {
  let base44: any;
  let payload: any = {};
  let type = '';
  let to = '';
  let subject = '';
  let body = '';

  try {
    base44 = createClientFromRequest(req);
    payload = await req.json();
    const settings = await getSettingsMap(base44);
    type = payload?.type || '';

    subject = payload?.subject || '';
    body = payload?.body || '';

    if (type === 'admin_new_order') {
      if (settings.enable_order_emails === 'false') {
        return Response.json({ success: true, skipped: true });
      }
      to = settings.admin_email || settings.email || DEFAULT_ADMIN_EMAIL;
      subject = subject || 'התקבלה הזמנה חדשה באתר אוצר הקדושה';
    } else if (type === 'customer_order_received') {
      if (settings.enable_customer_order_emails === 'false') {
        return Response.json({ success: true, skipped: true });
      }
      to = payload?.to || '';
      subject = subject || 'הזמנתך התקבלה באתר אוצר הקדושה';
    } else {
      const user = await base44.auth.me();
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (type === 'customer_order_approved' && settings.enable_approval_emails === 'false') {
        return Response.json({ success: true, skipped: true });
      }
      if (type === 'customer_order_delivered' && settings.enable_delivery_emails === 'false') {
        return Response.json({ success: true, skipped: true });
      }

      to = payload?.to || '';
    }

    if (!to || !subject || !body) {
      return Response.json({ error: 'Missing email recipient, subject or body' }, { status: 400 });
    }

    await base44.asServiceRole.integrations.Core.SendEmail({
      to,
      subject,
      body,
      from_name: 'אוצר הקדושה',
    });

    if (payload?.order_id) {
      await createEmailNotification(base44, {
        type,
        to,
        subject,
        body,
        status: 'sent',
        provider: 'base44_core',
        related_id: payload.order_id,
      });
    }

    return Response.json({ success: true, to });
  } catch (error) {
    if (base44 && payload?.order_id) {
      await createEmailNotification(base44, {
        type: type || payload?.type || 'unknown',
        to: to || payload?.to || '',
        subject: subject || payload?.subject || '',
        body: body || payload?.body || '',
        status: 'failed',
        provider: 'base44_core',
        related_id: payload.order_id,
        error: error.message || 'Email send failed',
      });
    }
    return Response.json({ error: error.message || 'Email send failed' }, { status: 500 });
  }
});
