import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'otzar_install_prompt_dismissed';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      if (window.sessionStorage.getItem(DISMISS_KEY)) return;
      setDeferredPrompt(event);
      setVisible(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-gold/30 bg-white pl-2 pr-1 py-1 shadow-2xl font-body"
      dir="rtl"
      role="region"
      aria-label="התקנת אפליקציה"
    >
      <button
        type="button"
        onClick={handleInstall}
        className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
        style={{ background: 'linear-gradient(135deg, #D4AF37, #C99722)', color: '#1F1008' }}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        התקן אפליקציה
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#6B5A45] hover:bg-[#F8F3E8] hover:text-gold-deep transition-colors"
        aria-label="סגור הצעת התקנה"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
