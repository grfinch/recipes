import { useEffect, useState } from 'react';

// Keeps the screen awake while `enabled` is true, using the Screen Wake Lock API.
// Browsers drop the lock when the tab is hidden, so it is requested again when the tab
// is visible. If a request is refused (battery saver, permissions policy), `failed` is
// set and the lock turns itself off.
export default function useWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let lock = null;
    let active = true;

    async function acquire() {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request('screen');
        if (active) lock = next;
        else next.release();
      } catch {
        if (active) {
          setFailed(true);
          setEnabled(false);
        }
      }
    }

    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', acquire);
      lock?.release();
    };
  }, [enabled]);

  function toggle(on) {
    setFailed(false);
    setEnabled(on);
  }

  return { supported, enabled, failed, setEnabled: toggle };
}
