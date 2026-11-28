import { useState, useRef, useEffect } from 'react';
import useDebounce from '../../hooks/useDebounce';
import { matchRanges, matchesQuery } from '../../utils/recipeSearch';
import styles from './search.module.css';

export default function SearchBox({ recipes = [], onSelect }) {
  // value: immediate input; setValue: sets input and schedules debounce
  // debounced: debounced value that lags by `delay`
  const [query, setQuery, debouncedQuery, { reset, cancel }] = useDebounce('', 200);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const [overlayStyle, setOverlayStyle] = useState(null);
  // Set by Escape; cleared when the user types again
  const [dismissed, setDismissed] = useState(false);

  // compute filtered results directly (useMemo not necessary here)
  const debq = String(debouncedQuery || '')
    .trim()
    .toLowerCase();
  const q = String(query || '').trim();

  // Results come from the settled (debounced) query only. While the user is still
  // typing, this keeps the previous results instead of flashing an empty list.
  const filtered = debq ? recipes.filter((r) => matchesQuery(r, debq)) : [];

  // Only show a count when there's text in the box and a settled search to count.
  // An empty box (on load, or after Escape clears it natively) shows nothing.
  const hasResults = Boolean(q) && Boolean(debq);
  // Opens for 0 matches too, so "No recipes match" shows where the results would be
  const isOpen = hasResults && !dismissed;
  const countText = `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`;

  function handleSelect(r) {
    reset(''); // clears the input and any pending debounce, which closes the overlay
    if (onSelect) onSelect(r);
  }

  // highlight each query word in the recipe name, which may differ in case and accents
  function highlightMatch(text = '', query = '') {
    const ranges = matchRanges(text, query);
    if (ranges.length === 0) return text;
    const pieces = [];
    let pos = 0;
    for (const [start, end] of ranges) {
      pieces.push(text.slice(pos, start));
      pieces.push(
        <span key={start} className={styles.highlight}>
          {text.slice(start, end)}
        </span>,
      );
      pos = end;
    }
    pieces.push(text.slice(pos));
    return <span>{pieces}</span>;
  }

  // While the overlay is open: keep it positioned under the input, and close it
  // on an outside click or Escape. Runs only when the overlay opens or closes,
  // not on every render, so listeners are added once per open.
  useEffect(() => {
    if (!isOpen) return;

    const rem = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

    function updateOverlayPos() {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setOverlayStyle({
        top: rect.bottom + 'px',
        left: rect.left + 'px',
        // At least 22rem where there's room, so names don't wrap under a narrow header input
        width:
          Math.max(rect.width, Math.min(22 * rem(), window.innerWidth - rect.left - 16)) + 'px',
        // Never taller than the space below the input, so the panel fits short screens
        // (a phone in landscape, a kitchen display). At most 320px, at least 120px.
        maxHeight: Math.min(320, Math.max(120, window.innerHeight - rect.bottom - 12)) + 'px',
      });
    }
    updateOverlayPos();

    // pointerdown covers mouse and touch; capture phase sees it before other handlers
    function onDocPointer(e) {
      const o = overlayRef.current;
      const inp = inputRef.current;
      if (o?.contains(e.target) || inp?.contains(e.target)) return;
      reset('');
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cancel();
        setDismissed(true);
        inputRef.current?.focus();
      }
    }

    window.addEventListener('resize', updateOverlayPos);
    window.addEventListener('scroll', updateOverlayPos, true);
    document.addEventListener('pointerdown', onDocPointer, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', updateOverlayPos);
      window.removeEventListener('scroll', updateOverlayPos, true);
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, reset, cancel]);

  return (
    <div className={styles.container}>
      <label className={styles.label} htmlFor="recipe-search">
        Search recipes
      </label>
      <input
        id="recipe-search"
        type="search"
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value); // also schedules the debounced update
          setDismissed(false); // typing again reopens results closed with Escape
        }}
        placeholder="Search by name, ingredient, or instruction..."
        className={styles.input}
      />
      {/* Announced to screen readers; on screen, the results panel shows the count, so
          this line doesn't push the page down while searching */}
      {hasResults && (
        <div role="status" className="visuallyHidden">
          {countText}
        </div>
      )}

      {/* render overlaid results so the page layout doesn't shift */}
      {isOpen && overlayStyle && (
        <div
          ref={overlayRef}
          className={styles.overlay}
          style={{
            position: 'fixed',
            top: overlayStyle.top,
            left: overlayStyle.left,
            width: overlayStyle.width,
            maxHeight: overlayStyle.maxHeight,
          }}
        >
          <div className={styles.overlayHeader}>
            {/* aria-hidden: the status line above already announces the count */}
            <div className={styles.overlayCount} aria-hidden="true">
              {filtered.length > 0 ? countText : 'No recipes match'}
            </div>
          </div>
          {filtered.length > 0 && (
            <ul className={styles.resultsList}>
              {filtered.map((r, i) => (
                <li key={r.id} className={i === 0 ? '' : styles.resultItem}>
                  <button onClick={() => handleSelect(r)} className={styles.resultButton}>
                    <div className={styles.resultName}>{highlightMatch(r.name, debq)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
