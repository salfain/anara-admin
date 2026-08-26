import { useEffect, useRef } from 'react';

/**
 * Re-runs `callback` on an interval, and immediately when the tab/window
 * regains focus or becomes visible again — keeps list/summary views fresh
 * without a websocket. `deps` controls when the interval itself restarts
 * (e.g. active filters); the callback ref avoids resetting the timer on
 * every render caused by the fetch's own state updates.
 */
export default function useAutoRefresh(callback, intervalMs = 15000, deps = []) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    function tick() {
      callbackRef.current();
    }
    const id = setInterval(tick, intervalMs);

    function onVisible() {
      if (document.visibilityState === 'visible') tick();
    }
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);
}
