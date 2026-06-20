let deferredInstallPrompt = null;

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

export function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    document.getElementById('pwaInstallBtn')?.classList.remove('hidden');
    document.getElementById('pwaInstallBanner')?.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.getElementById('pwaInstallBtn')?.classList.add('hidden');
    document.getElementById('pwaInstallBanner')?.classList.add('hidden');
  });

  document.getElementById('pwaInstallBtn')?.addEventListener('click', () => promptInstall());
  document.getElementById('pwaInstallBannerBtn')?.addEventListener('click', () => promptInstall());
  document.getElementById('pwaInstallDismiss')?.addEventListener('click', () => {
    document.getElementById('pwaInstallBanner')?.classList.add('hidden');
  });
}

export async function promptInstall() {
  if (!deferredInstallPrompt) {
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      window.Toast?.info?.('On iPhone/iPad: tap Share, then "Add to Home Screen".');
    }
    return false;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  if (outcome === 'accepted') {
    document.getElementById('pwaInstallBtn')?.classList.add('hidden');
    document.getElementById('pwaInstallBanner')?.classList.add('hidden');
  }
  return outcome === 'accepted';
}

export function isStandalonePwa() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}
