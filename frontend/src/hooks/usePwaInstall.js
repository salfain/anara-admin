import { useEffect, useState } from 'react';

export default function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
  );

  useEffect(() => {
    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return { canInstall: Boolean(deferredPrompt) && !installed, installed, promptInstall };
}
