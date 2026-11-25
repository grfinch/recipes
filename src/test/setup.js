// Adds DOM matchers like toBeInTheDocument() to expect()
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Unmount rendered components between tests
afterEach(() => cleanup());

// Saved checklist state must not leak from one test into the next
afterEach(() => localStorage.clear());
