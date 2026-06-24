import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminAuth } from '@/lib/AdminAuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isAdminAuthenticated, isLoadingAdminAuth } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoadingAdminAuth && isAdminAuthenticated) {
      navigate('/secret-admin', { replace: true });
    }
  }, [isAdminAuthenticated, isLoadingAdminAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/secret-admin', { replace: true });
    } catch (err) {
      setError(err.message === 'Bootstrap admin is not configured'
        ? 'משתמש מנהל ראשוני לא הוגדר בשרת'
        : 'אימייל או סיסמה שגויים');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <img 
            src="/assets/static/admin-login-logo.jpeg" 
            alt="אוצר הקדושה" 
            className="h-20 object-contain mx-auto mb-5 drop-shadow-lg"
          />
          <h1 className="text-3xl font-heading font-bold text-walnut">כניסת מנהל</h1>
          <p className="text-muted-foreground mt-2 font-body text-sm">אזור מוגן — גישה למורשים בלבד</p>
        </div>

        <div className="bg-white border border-gold/20 rounded-2xl p-8 shadow-md">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-body">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-walnut font-body text-sm">אימייל</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="bg-secondary border-border text-foreground pl-10 h-12 font-body focus:border-gold/50 focus:ring-gold/20"
                  placeholder="admin@example.com"
                  required
                  autoFocus
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-walnut font-body text-sm">סיסמה</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground pl-10 h-12 font-body focus:border-gold/50 focus:ring-gold/20"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading || isLoadingAdminAuth}
              className="w-full h-12 bg-gold text-white hover:bg-gold/90 font-body font-semibold text-base mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'כניסה לפאנל'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
