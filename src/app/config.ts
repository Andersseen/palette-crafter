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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideFileRouter(withNavigationErrorHandler(console.error)),
    provideClientHydration(withEventReplay()),
  ],
};
