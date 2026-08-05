// Service-worker bootstrap (externalized so script-src 'self' stays strict — no inline scripts).
// Disable Service Worker in localhost development to avoid stale asset caching.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const isLocalhost = Boolean(
      window.location.hostname === 'localhost' ||
      window.location.hostname === '[::1]' ||
      window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    if (isLocalhost) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.unregister();
        }
        console.log('[SW] Service workers unregistered for development.');
      } catch (e) {
        console.error('[SW] Failed to unregister service worker:', e);
      }
    } else {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      } catch (e) {}
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (e) {}
    }
  });
}