import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from "@angular/core";
import { withNavigationErrorHandler } from "@angular/router";
import {
  provideClientHydration,
  withEventReplay,
} from "@angular/platform-browser";
import { provideFileRouter } from "@analogjs/router";
import { provideMovement } from "angular-movement";

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideFileRouter(withNavigationErrorHandler(console.error)),
    provideClientHydration(withEventReplay()),
    // Single source of truth for motion. Every animation in the app goes
    // through angular-movement rather than ad-hoc CSS transitions, so timing
    // and easing stay consistent — and the library itself honours
    // prefers-reduced-motion for us.
    provideMovement({
      duration: 320,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    }),
  ],
};
