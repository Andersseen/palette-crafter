/**
 * Vitest setup file, referenced by `test.setupFiles` in `vite.config.ts`.
 *
 * Most suites cover `src/shared/` — pure, framework-agnostic logic — but the
 * Angular TestBed is initialised here so services and components can be tested
 * too.
 */

import { getTestBed } from "@angular/core/testing";
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from "@angular/platform-browser/testing";

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
);

// jsdom ships no matchMedia, and the palette service reads the OS colour-scheme
// preference on start-up.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
