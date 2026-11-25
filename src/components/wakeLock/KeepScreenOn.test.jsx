import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KeepScreenOn from './KeepScreenOn';

// jsdom has no Screen Wake Lock API; each test installs a fake one.
function mockWakeLock(request) {
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
}

function fakeLock() {
  const lock = { released: false, release: vi.fn(() => (lock.released = true)) };
  return lock;
}

function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  delete navigator.wakeLock;
  delete document.visibilityState; // back to jsdom's own getter
});

describe('KeepScreenOn', () => {
  it('renders nothing when the browser lacks the API', () => {
    const { container } = render(<KeepScreenOn />);
    expect(container).toBeEmptyDOMElement();
  });

  it('holds a wake lock only while checked', async () => {
    const lock = fakeLock();
    const request = vi.fn().mockResolvedValue(lock);
    mockWakeLock(request);
    const user = userEvent.setup();
    render(<KeepScreenOn />);

    const box = screen.getByRole('checkbox', { name: 'Keep screen on while cooking' });
    expect(request).not.toHaveBeenCalled(); // opt-in, not on page load

    await user.click(box);
    expect(box).toBeChecked();
    expect(request).toHaveBeenCalledWith('screen');

    await user.click(box);
    expect(lock.release).toHaveBeenCalled();
  });

  it('requests the lock again when the tab becomes visible', async () => {
    const first = fakeLock();
    const request = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(fakeLock());
    mockWakeLock(request);
    const user = userEvent.setup();
    render(<KeepScreenOn />);
    await user.click(screen.getByRole('checkbox', { name: /Keep screen on/ }));
    expect(request).toHaveBeenCalledTimes(1);

    // The browser releases the lock when the tab is hidden
    first.released = true;
    await act(async () => setVisibility('hidden'));
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => setVisibility('visible'));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('unchecks and explains when the browser refuses', async () => {
    mockWakeLock(vi.fn().mockRejectedValue(new Error('NotAllowedError')));
    const user = userEvent.setup();
    render(<KeepScreenOn />);
    const box = screen.getByRole('checkbox', { name: /Keep screen on/ });

    await user.click(box);
    expect(await screen.findByText(/didn't allow keeping the screen on/)).toBeInTheDocument();
    expect(box).not.toBeChecked();
  });
});
