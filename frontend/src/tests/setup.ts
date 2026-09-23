import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn((query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })),
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});

const dialogFocus = new WeakMap<HTMLDialogElement, HTMLElement>();

Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      if (this.open) return;
      if (document.activeElement instanceof HTMLElement) dialogFocus.set(this, document.activeElement);
      this.open = true;
      this.querySelector<HTMLElement>('[autofocus], button, [href], input, select, textarea, [tabindex]')?.focus();
    },
  },
  close: {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      if (!this.open) return;
      this.open = false;
      this.dispatchEvent(new Event('close'));
      dialogFocus.get(this)?.focus();
      dialogFocus.delete(this);
    },
  },
});

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
});
