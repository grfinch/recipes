import { useState, useRef, useEffect } from 'react';
import useDebounce from '../../hooks/useDebounce';
import styles from './search.module.css';

export default function SearchBox({ recipes = [], onSelect }) {
    // value: immediate input; setValue: sets input and schedules debounce
    // debounced: debounced value that lags by `delay`
    const [query, setQuery, debouncedQuery, controls] = useDebounce('', 200);
    const inputRef = useRef(null);
    const overlayRef = useRef(null);
    const [overlayStyle, setOverlayStyle] = useState(null);

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

    function handleSelect(r) {
        // clear pending debounce and reset state
        if (controls && controls.reset) controls.reset('');
        if (onSelect) onSelect(r);
        setQuery('');
        setOverlayStyle(null);
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

    // position overlay under the input
    function updateOverlayPos() {
        const el = inputRef.current;
        if (!el) return setOverlayStyle(null);
        const rect = el.getBoundingClientRect();
        setOverlayStyle({
            top: rect.bottom + 'px',
            left: rect.left + 'px',
            width: rect.width + 'px'
        });
    }

    useEffect(() => {
        if (query && filtered && filtered.length > 0) updateOverlayPos();
        function onResize() {
            if (query && filtered && filtered.length > 0) updateOverlayPos();
        }
        window.addEventListener('resize', onResize);
        window.addEventListener('scroll', onResize, true);

        // pointerdown (captures clicks/touches) to close overlay when clicking outside
        function onDocPointer(e) {
            const o = overlayRef.current;
            const inp = inputRef.current;
            if (!o || !inp) return;
            // if click is inside overlay or input, do nothing
            if (o.contains(e.target) || inp.contains(e.target)) return;
            // clicked outside -> clear both immediate and debounced values and close overlay
            if (controls && controls.reset) controls.reset('');
            else {
                // fallback
                setQuery('');
            }
            setOverlayStyle(null);
        }
        // use boolean capture for simpler removal compatibility
        const useCapture = true;
        document.addEventListener('pointerdown', onDocPointer, useCapture);

        // Escape key closes overlay
        function onKeyDown(e) {
            if (e.key === 'Escape' || e.key === 'Esc') {
                if (controls && controls.cancel) controls.cancel();
                setOverlayStyle(null);
                // return focus to input
                if (inputRef.current) inputRef.current.focus();
            }
        }
        document.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onResize, true);
            document.removeEventListener('pointerdown', onDocPointer, useCapture);
            document.removeEventListener('keydown', onKeyDown);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, debouncedQuery, filtered]);

    return (
        <div className={styles.container}>
            <label className={styles.label} htmlFor="recipe-search">Search recipes</label>
            <input
                id="recipe-search"
                type="search"
                ref={inputRef}
                value={query}
                onChange={e => {
                    const v = e.target.value;
                    // setQuery schedules debounce via the hook
                    setQuery(v);
                }}
                placeholder="Search by name, ingredient, or instruction..."
                className={styles.input}
            />
            <div className={styles.resultCount}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>

            {/* render overlaid results so the page layout doesn't shift */}
            {query && filtered.length > 0 && overlayStyle && (
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
