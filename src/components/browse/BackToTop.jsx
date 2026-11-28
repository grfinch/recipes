import { useSyncExternalStore } from 'react';
import styles from './browse.module.css';

// How far down the page, in pixels, before the button shows
export const BACK_TO_TOP_THRESHOLD = 200;

function subscribe(onChange) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

const isScrolledDown = () => window.scrollY > BACK_TO_TOP_THRESHOLD;

// A "Back to top" button for the long browse list. It shows once the visitor has scrolled down,
// and stays at the bottom of the screen (sticky, so it never covers the footer). headingRef is
// the page's h1: focus goes there, so keyboard and screen-reader users start over at the top
// rather than losing focus when the button goes away.
export default function BackToTop({ headingRef }) {
  const shown = useSyncExternalStore(subscribe, isScrolledDown, () => false);
  if (!shown) return null;

  function backToTop() {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    headingRef.current?.focus({ preventScroll: true });
  }

  return (
    <button type="button" className={styles.backToTop} onClick={backToTop}>
      <span aria-hidden="true">↑&nbsp;</span>Back to top
    </button>
  );
}
