import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// framer-motion relies on IntersectionObserver / matchMedia in some code paths.
class IO {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IO });
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

// jsdom's AbortSignal is not Node's; React Router's data router passes it to Node's
// Request, which throws. Drop foreign signals (navigation aborting is irrelevant in tests).
const NodeRequest = globalThis.Request;
globalThis.Request = class PatchedRequest extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init?.signal ? { ...init, signal: undefined } : init);
  }
} as typeof Request;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
});
