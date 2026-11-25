import { useState, useRef, useEffect } from 'react';
import useDebounce from '../../hooks/useDebounce';
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
    const debq = String(debouncedQuery || '').trim().toLowerCase();
    const q = String(query || '').trim();

    let filtered;
    if (!debq && !q) filtered = recipes;
    else if (!debq && q) filtered = [];
    else {
        filtered = recipes.filter(r => {
            if (!r) return false;
            const name = String(r.name || '').toLowerCase();
            if (name.includes(debq)) return true;
            const ingredients = Array.isArray(r.ingredients) ? r.ingredients.join(' ') : '';
            if (String(ingredients).toLowerCase().includes(debq)) return true;
            const instructions = Array.isArray(r.instructions) ? r.instructions.join(' ') : '';
            if (String(instructions).toLowerCase().includes(debq)) return true;
            const notes = Array.isArray(r.notes) ? r.notes.join(' ') : '';
            if (String(notes).toLowerCase().includes(debq)) return true;
            return false;
        });
    }

    const isOpen = Boolean(q) && filtered.length > 0 && !dismissed;

    function handleSelect(r) {
        reset(''); // clears the input and any pending debounce, which closes the overlay
        if (onSelect) onSelect(r);
    }

    // highlight matching substring in the recipe name
    function highlightMatch(text = '', needle = '') {
        if (!needle) return text;
        const lower = String(text).toLowerCase();
        const idx = lower.indexOf(needle.toLowerCase());
        if (idx === -1) return text;
        const before = text.slice(0, idx);
        const match = text.slice(idx, idx + needle.length);
        const after = text.slice(idx + needle.length);
        return (
            <span>
                {before}
                <span className={styles.highlight}>{match}</span>
                {after}
            </span>
        );
    }

    // While the overlay is open: keep it positioned under the input, and close it
    // on an outside click or Escape. Runs only when the overlay opens or closes,
    // not on every render, so listeners are added once per open.
    useEffect(() => {
        if (!isOpen) return;

        function updateOverlayPos() {
            const el = inputRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            setOverlayStyle({
                top: rect.bottom + 'px',
                left: rect.left + 'px',
                width: rect.width + 'px'
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
            <label className={styles.label} htmlFor="recipe-search">Search recipes</label>
            <input
                id="recipe-search"
                type="search"
                ref={inputRef}
                value={query}
                onChange={e => {
                    setQuery(e.target.value); // also schedules the debounced update
                    setDismissed(false); // typing again reopens results closed with Escape
                }}
                placeholder="Search by name, ingredient, or instruction..."
                className={styles.input}
            />
            <div className={styles.resultCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>

            {/* render overlaid results so the page layout doesn't shift */}
            {isOpen && overlayStyle && (
                <div
                    ref={overlayRef}
                    className={styles.overlay}
                    style={{ position: 'fixed', top: overlayStyle.top, left: overlayStyle.left, width: overlayStyle.width }}
                >
                    <div className={styles.overlayHeader}>
                        <div className={styles.overlayCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
                    </div>
                    <ul className={styles.resultsList}>
                        {filtered.map((r, i) => (
                            <li key={r.name + '-' + i} className={i === 0 ? '' : styles.resultItem}>
                                <button
                                    onClick={() => handleSelect(r)}
                                    className={styles.resultButton}
                                >
                                    <div className={styles.resultName}>{highlightMatch(r.name, debq)}</div>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
