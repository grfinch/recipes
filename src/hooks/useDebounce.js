import { useState, useRef, useCallback, useEffect } from 'react';

// API: const [value, setValue, debouncedValue, controls] = useDebouncedState(initial, delay)
// controls = { cancel(), flush(), reset() }
export default function useDebounce(initialValue = '', delay = 200) {
    const [value, setValue] = useState(initialValue);
    const [debounced, setDebounced] = useState(initialValue);
    const timerRef = useRef(null);

    // Don't leave a timer running after the component unmounts
    useEffect(() => () => clearTimeout(timerRef.current), []);

    const set = useCallback(
        (v) => {
            setValue(v);
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                setDebounced(v);
                timerRef.current = null;
            }, delay);
        },
        [delay]
    );

    const cancel = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const flush = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setDebounced(value);
    }, [value]);

    const reset = useCallback((next = '') => {
        cancel();
        setValue(next);
        setDebounced(next);
    }, [cancel]);

    return [value, set, debounced, { cancel, flush, reset }];
}
