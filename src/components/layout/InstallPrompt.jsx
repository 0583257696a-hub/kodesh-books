import React, { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';

const DISMISS_KEY = 'otzar_install_prompt_dismissed';
const IOS_DISMISS_KEY = 'otzar_ios_install_dismissed';

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIosDevice = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  return isIosDevice && !isStandalone;
}

// iOS Safari never fires beforeinstallprompt and has no programmatic install
// API at all -- Add to Home Screen is a manual, user-driven action only.
// Detecting this and showing instructions is the only way to offer install
// guidance there; there is no way to trigger the native flow from JS.
function IosInstallHint({ onDismiss }) {
  return (
    <div
      className="fixed inset-x-3 z-50 flex items-center gap-3 rounded-2xl border border-gold/30 bg-white p-3 shadow-2xl font-body"
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      dir="rtl"
      role="region"
      aria-label="הוספה למסך הבית"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gold/10">
        <Share className="h-5 w-5 text-gold-deep" aria-hidden="true" />
      </span>
      <p className="flex-1 text-sm leading-snug text-[#3A2415]">
        להתקנת האפליקציה: הקישו על <Share className="inline h-3.5 w-3.5 -mt-0.5" aria-hidden="true" /> שיתוף, ואז על
        <SquarePlus className="inline h-3.5 w-3.5 mx-1 -mt-0.5" aria-hidden="true" />
        &quot;הוסף למסך הבית&quot;
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#6B5A45] hover:bg-[#F8F3E8] hover:text-gold-deep transition-colors"
        aria-label="סגור"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isIosSafari() && !window.sessionStorage.getItem(IOS_DISMISS_KEY)) {
      setShowIosHint(true);
      return undefined;
    }

    const applyInstallEvent = (event) => {
      if (!event || window.sessionStorage.getItem(DISMISS_KEY)) return;
      setDeferredPrompt(event);
      setVisible(true);
    };

    // The event may have already fired (and been captured by the inline
    // script in index.html) before this component ever mounted.
    if (window.__pwaInstallEvent) applyInstallEvent(window.__pwaInstallEvent);

    const handleReady = () => applyInstallEvent(window.__pwaInstallEvent);
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      applyInstallEvent(event);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener('pwa-install-ready', handleReady);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('pwa-install-ready', handleReady);
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

  const handleDismissIos = () => {
    window.sessionStorage.setItem(IOS_DISMISS_KEY, '1');
    setShowIosHint(false);
  };

  if (showIosHint) return <IosInstallHint onDismiss={handleDismissIos} />;
  if (!visible) return null;

  return (
    <div
      className="fixed right-5 z-50 flex items-center gap-2 rounded-full border border-gold/30 bg-white pl-2 pr-1 py-1 shadow-2xl font-body"
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
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
