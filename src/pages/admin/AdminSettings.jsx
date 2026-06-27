import React, { useEffect, useState } from 'react';
import { appApi } from '@/api/internalClient';
import { changeAdminPassword } from '@/services/adminAuthService';
import { DEFAULT_SITE_SETTINGS } from '@/hooks/useSiteSettings';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Loader2, Store, Phone, Globe, Share2, UserPlus, Trash2, ShieldCheck, KeyRound, Truck } from 'lucide-react';

const STORE_FIELDS = [
  { key: 'store_name', label: 'שם החנות', placeholder: 'אוצר הקדושה', icon: Store },
  { key: 'phone', label: 'טלפון', placeholder: '03-1234567', icon: Phone },
  { key: 'whatsapp', label: 'וואטסאפ', placeholder: '972501234567', icon: Phone },
  { key: 'email', label: 'אימייל', placeholder: 'info@otzar-hakodesh.co.il', icon: Globe },
  { key: 'address', label: 'כתובת', placeholder: 'רחוב הרב קוק 12, ירושלים', icon: Store },
  { key: 'seo_title', label: 'כותרת SEO', placeholder: 'אוצר הקדושה | ספרי קודש', icon: Globe },
  { key: 'seo_description', label: 'תיאור SEO', placeholder: 'החנות המובילה לספרי קודש...', icon: Globe },
  { key: 'google_analytics_id', label: 'Google Analytics Measurement ID', placeholder: 'G-XXXXXXXXXX', icon: Globe },
  { key: 'facebook', label: 'קישור פייסבוק', placeholder: 'https://facebook.com/...', icon: Share2 },
  { key: 'instagram', label: 'קישור אינסטגרם', placeholder: 'https://instagram.com/...', icon: Share2 },
];

const SHIPPING_FIELDS = [
  { key: 'shipping_cost', label: 'עלות משלוח', placeholder: '30', icon: Truck, type: 'number' },
  { key: 'free_shipping_threshold', label: 'משלוח חינם מעל סכום', placeholder: '0', icon: Truck, type: 'number' },
  { key: 'enforce_stock_limit', label: 'הגבלת רכישה לפי מלאי', type: 'boolean' },
];

const NOTIFICATION_FIELDS = [
  { key: 'admin_email', label: 'אימייל מנהל לקבלת הזמנות', placeholder: 'admin@example.com', icon: Bell, type: 'email' },
  { key: 'enable_order_emails', label: 'שליחת מייל הזמנה חדשה למנהל', type: 'boolean' },
  { key: 'enable_customer_order_emails', label: 'שליחת מייל אישור קבלת הזמנה ללקוח', type: 'boolean' },
  { key: 'enable_approval_emails', label: 'שליחת מייל אישור הזמנה ללקוח', type: 'boolean' },
  { key: 'enable_delivery_emails', label: 'שליחת מייל מסירה ללקוח', type: 'boolean' },
  { key: 'enable_abandoned_cart_emails', label: 'שליחת מייל עגלה נטושה', type: 'boolean' },
];

const FIELDS = [...STORE_FIELDS, ...SHIPPING_FIELDS, ...NOTIFICATION_FIELDS];

const DEFAULT_SETTING_VALUES = FIELDS.reduce((values, field) => {
  values[field.key] = DEFAULT_SITE_SETTINGS[field.key] ?? (field.type === 'boolean' ? 'false' : '');
  return values;
}, {});

const EMPTY_USER = {
  full_name: '',
  email: '',
  password: '',
  role: 'user',
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => ({ ...DEFAULT_SETTING_VALUES }));
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [newUser, setNewUser] = useState({ ...EMPTY_USER });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [deletingUserId, setDeletingUserId] = useState('');
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: () => appApi.entities.SiteSettings.list(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => appApi.entities.User.list('-created_date', 500),
  });

  useEffect(() => {
    if (settingsLoaded || settingsLoading) return;
    const map = { ...DEFAULT_SETTING_VALUES };
    settings.forEach((setting) => {
      map[setting.key] = setting.value;
    });
    setValues(map);
    setSettingsLoaded(true);
  }, [settings, settingsLoaded, settingsLoading]);

  const saveSetting = async (key) => {
    setSavingKey(key);
    setSettingsMessage('');
    try {
      const existing = settings.find((setting) => setting.key === key);
      if (existing) {
        await appApi.entities.SiteSettings.update(existing.id, { value: values[key] || '' });
      } else {
        await appApi.entities.SiteSettings.create({
          key,
          value: values[key] || '',
          label: FIELDS.find((field) => field.key === key)?.label || key,
        });
      }
      setSettingsMessage('ההגדרה נשמרה בהצלחה.');
      await queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (error) {
      setSettingsMessage(error.message || 'שמירת ההגדרה נכשלה.');
    } finally {
      setSavingKey('');
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setUserMessage('');

    if (!newUser.email || !newUser.password) {
      setUserMessage('יש למלא אימייל וסיסמה.');
      return;
    }

    setCreatingUser(true);
    try {
      await appApi.auth.register({
        email: newUser.email,
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
      });

      const matches = await appApi.entities.User.filter({ email: newUser.email }, '-created_date', 1);
      const created = matches?.[0];

      if (created?.id) {
        await appApi.entities.User.update(created.id, {
          full_name: newUser.full_name,
          role: newUser.role,
        });
      }

      setNewUser({ ...EMPTY_USER });
      setUserMessage('המשתמש נפתח בהצלחה. אם נדרש אימות אימייל, המשתמש יקבל קוד בכניסה הראשונה.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error) {
      setUserMessage(error.message || 'פתיחת המשתמש נכשלה.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const ok = window.confirm(`להסיר את המשתמש ${user.email}? פעולה זו אינה הפיכה.`);
    if (!ok) return;

    setDeletingUserId(user.id);
    setUserMessage('');
    try {
      await appApi.entities.User.delete(user.id);
      setUserMessage('המשתמש הוסר בהצלחה.');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (error) {
      setUserMessage(error.message || 'הסרת המשתמש נכשלה.');
    } finally {
      setDeletingUserId('');
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage('');

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage('יש למלא סיסמה נוכחית, סיסמה חדשה ואישור סיסמה.');
      return;
    }

    if (passwordForm.newPassword.length < 10) {
      setPasswordMessage('הסיסמה החדשה חייבת להכיל לפחות 10 תווים.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage('אישור הסיסמה אינו תואם לסיסמה החדשה.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeAdminPassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('סיסמת המנהל עודכנה בהצלחה.');
    } catch (error) {
      setPasswordMessage(error.message === 'Invalid current password'
        ? 'הסיסמה הנוכחית שגויה.'
        : (error.message || 'עדכון סיסמת המנהל נכשל.'));
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen space-y-8 bg-white p-6 text-slate-950 lg:p-8" dir="rtl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ניהול הרשאות</h1>
        <p className="mt-1 text-sm text-slate-500">פתיחת משתמשים, בחירת סיסמה, הגדרת תפקידים והסרת משתמשים מהמערכת.</p>
      </div>

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-6">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
          <KeyRound className="h-5 w-5 text-amber-700" /> שינוי סיסמת מנהל
        </h2>
        <p className="mb-5 text-sm text-slate-600">עדכון סיסמת הכניסה לפאנל האדמין. הסיסמה נשמרת מוצפנת בשרת בלבד.</p>

        <form onSubmit={handleChangePassword} className="grid gap-4 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">סיסמה נוכחית *</Label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
              className="border-slate-200 bg-white text-slate-950"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">סיסמה חדשה *</Label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
              className="border-slate-200 bg-white text-slate-950"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">אישור סיסמה חדשה *</Label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              className="border-slate-200 bg-white text-slate-950"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={changingPassword} className="h-10 w-full bg-amber-700 text-white hover:bg-amber-800">
              {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'עדכן סיסמה'}
            </Button>
          </div>
        </form>

        {passwordMessage && <p className="mt-4 text-sm text-slate-700">{passwordMessage}</p>}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-6">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
          <UserPlus className="h-5 w-5 text-blue-600" /> פתיחת משתמש חדש
        </h2>
        <p className="mb-5 text-sm text-slate-600">צור משתמש חדש עם סיסמה לבחירתך ובחר את רמת ההרשאה שלו.</p>

        <form onSubmit={handleCreateUser} className="grid gap-4 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">שם מלא</Label>
            <Input
              value={newUser.full_name}
              onChange={(event) => setNewUser((current) => ({ ...current, full_name: event.target.value }))}
              placeholder="שם המשתמש"
              className="border-slate-200 bg-white text-slate-950"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">אימייל *</Label>
            <Input
              type="email"
              value={newUser.email}
              onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
              placeholder="user@example.com"
              className="border-slate-200 bg-white text-slate-950"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">סיסמה *</Label>
            <div className="relative">
              <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={newUser.password}
                onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                placeholder="בחר סיסמה"
                className="border-slate-200 bg-white pr-10 text-slate-950"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">הרשאה</Label>
            <Select value={newUser.role} onValueChange={(value) => setNewUser((current) => ({ ...current, role: value }))}>
              <SelectTrigger className="border-slate-200 bg-white text-slate-950"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="user">לקוח</SelectItem>
                <SelectItem value="admin">מנהל</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={creatingUser} className="h-10 w-full bg-blue-600 text-white hover:bg-blue-700">
              {creatingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : 'פתח משתמש'}
            </Button>
          </div>
        </form>

        {userMessage && <p className="mt-4 text-sm text-slate-700">{userMessage}</p>}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h2 className="flex items-center gap-2 font-bold text-slate-950">
            <ShieldCheck className="h-5 w-5 text-blue-600" /> משתמשים והרשאות
          </h2>
          <span className="text-sm text-slate-500">{users.length} משתמשים</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-white text-slate-500">
              <tr>
                <th className="px-5 py-3 text-right font-semibold">משתמש</th>
                <th className="px-5 py-3 text-right font-semibold">אימייל</th>
                <th className="px-5 py-3 text-right font-semibold">הרשאה</th>
                <th className="px-5 py-3 text-right font-semibold">נוצר</th>
                <th className="px-5 py-3 text-right font-semibold">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">
                        {user.full_name?.[0] || user.email?.[0] || '?'}
                      </div>
                      <span className="font-semibold text-slate-950">{user.full_name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                      {user.role === 'admin' ? 'מנהל' : 'לקוח'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{user.created_date ? new Date(user.created_date).toLocaleDateString('he-IL') : '-'}</td>
                  <td className="px-5 py-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteUser(user)}
                      disabled={deletingUserId === user.id}
                      className="h-8 w-8 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                      title="הסר משתמש"
                    >
                      {deletingUserId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && <div className="py-16 text-center text-sm text-slate-500">אין משתמשים להצגה</div>}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
          <Truck className="h-5 w-5 text-blue-600" /> הגדרות משלוח
        </h2>
        <p className="mb-6 text-sm text-slate-600">
          העלות שתוזן כאן תופיע אוטומטית בעגלה, בסרגל העגלה ובצ׳ק אאוט. אם אין משלוח חינם, הזן 0 בשדה "משלוח חינם מעל סכום".
          ניתן גם להפעיל או לכבות הגבלת רכישה לפי מלאי.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {SHIPPING_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm text-slate-700">{field.label}</Label>
              <div className="flex gap-2">
                {field.type === 'boolean' ? (
                  <Select value={values[field.key] || 'false'} onValueChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}>
                    <SelectTrigger className="flex-1 border-slate-200 bg-white text-slate-950"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="false">כבוי</SelectItem>
                      <SelectItem value="true">פעיל</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={values[field.key] || ''}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    type={field.type || 'text'}
                    min="0"
                    className="flex-1 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  />
                )}
                <Button
                  type="button"
                  onClick={() => saveSetting(field.key)}
                  disabled={savingKey === field.key}
                  variant="outline"
                  className="h-10 border-slate-200 bg-white px-3 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {savingKey === field.key ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 flex items-center gap-2 font-bold text-slate-950">
          <Bell className="h-5 w-5 text-blue-600" /> התראות ואימיילים
        </h2>
        <p className="mb-6 text-sm text-slate-600">הכנה מלאה לשליחת אימיילים בתהליך הזמנה ידני. אם אין חיבור אימייל פעיל, המערכת תשמור את ההתראה בתור לשליחה עתידית.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          {NOTIFICATION_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm text-slate-700">{field.label}</Label>
              <div className="flex gap-2">
                {field.type === 'boolean' ? (
                  <Select value={values[field.key] || 'true'} onValueChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}>
                    <SelectTrigger className="flex-1 border-slate-200 bg-white text-slate-950"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="true">פעיל</SelectItem>
                      <SelectItem value="false">כבוי</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={values[field.key] || ''}
                    onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    placeholder={field.placeholder}
                    type={field.type || 'text'}
                    className="flex-1 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                  />
                )}
                <Button
                  type="button"
                  onClick={() => saveSetting(field.key)}
                  disabled={savingKey === field.key}
                  variant="outline"
                  className="h-10 border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {savingKey === field.key ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-6 font-bold text-slate-950">הגדרות חנות</h2>
        {settingsMessage && <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{settingsMessage}</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          {STORE_FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label className="text-sm text-slate-700">{field.label}</Label>
              <div className="flex gap-2">
                <Input
                  value={values[field.key] || ''}
                  onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                  placeholder={field.placeholder}
                  type={field.type || 'text'}
                  className="flex-1 border-slate-200 bg-white text-slate-950 placeholder:text-slate-400"
                />
                <Button
                  type="button"
                  onClick={() => saveSetting(field.key)}
                  disabled={savingKey === field.key}
                  variant="outline"
                  className="h-10 border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50"
                >
                  {savingKey === field.key ? <Loader2 className="h-4 w-4 animate-spin" /> : 'שמור'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
