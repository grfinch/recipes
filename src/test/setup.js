// Adds DOM matchers like toBeInTheDocument() to expect()
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount rendered components between tests
afterEach(() => cleanup());

// Saved checklist state must not leak from one test into the next
afterEach(() => localStorage.clear());

// The theme lives on <html>, which outlives each test's render
afterEach(() => delete document.documentElement.dataset.theme);

// Recipe links live in the URL hash; start each test without one
afterEach(() => window.history.replaceState(null, '', '/'));
