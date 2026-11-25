import { useCallback, useEffect, useRef, useState } from 'react';

// Cloudflare Turnstile, the "are you a person" check on the suggest form. In managed mode it is
// usually invisible, and shows an accessible challenge only when it is unsure.
// API: const { containerRef, token, failed, reset } = useTurnstile(siteKey)
//   containerRef: put on an empty element where the widget may appear
//   token: '' until the check passes; send it with the form. Each token works once.
//   failed: the script didn't load (blocked or offline)
//   reset(): get a fresh token, after a send that used the last one
// With no siteKey (dev, tests, forks) it does nothing and token stays ''.

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let scriptPromise = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => {
      scriptPromise = null; // let a later visit try again
      script.remove();
      reject(new Error('Turnstile failed to load'));
    };
    document.head.append(script);
  });
  return scriptPromise;
}

export default function useTurnstile(siteKey) {
  const containerRef = useRef(null);
  const widgetId = useRef(null);
  const [token, setToken] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    loadTurnstile().then(
      (turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          // The site's theme (useTheme.js), which may differ from the device's
          theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
          callback: (t) => setToken(t),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      if (widgetId.current != null) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken('');
    if (widgetId.current != null) window.turnstile?.reset(widgetId.current);
  }, []);

  return { containerRef, token, failed, reset };
}
