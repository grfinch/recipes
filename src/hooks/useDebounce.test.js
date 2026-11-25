import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDebounce from './useDebounce';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebounce', () => {
  it('updates the debounced value after the delay', () => {
    const { result } = renderHook(() => useDebounce('', 200));
    act(() => result.current[1]('pan'));
    expect(result.current[0]).toBe('pan');
    expect(result.current[2]).toBe('');
    act(() => vi.advanceTimersByTime(200));
    expect(result.current[2]).toBe('pan');
  });

  it('clears its pending timer when unmounted', () => {
    const { result, unmount } = renderHook(() => useDebounce('', 200));
    act(() => result.current[1]('pan'));
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
