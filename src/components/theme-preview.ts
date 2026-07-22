import { Component, signal } from "@angular/core";
import {
  VoltAvatar,
  VoltAvatarFallback,
  VoltBadge,
  VoltButton,
  VoltCard,
  VoltCardContent,
  VoltCardDescription,
  VoltCardHeader,
  VoltCardTitle,
  VoltCheckbox,
  VoltInput,
  VoltLabel,
  VoltProgress,
  VoltSeparator,
  VoltSlider,
  VoltSwitch,
} from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";

/**
 * Live preview of the generated palette on real components.
 *
 * Everything here is a `@voltui/components` primitive rather than a hand-styled
 * div: the point is to show the theme on the same widgets a consumer would use,
 * and it doubles as the integration surface where the component library gets
 * exercised against arbitrary generated colors.
 */
@Component({
  selector: "app-theme-preview",
  imports: [
    VoltAvatar,
    VoltAvatarFallback,
    VoltBadge,
    VoltButton,
    VoltCard,
    VoltCardContent,
    VoltCardDescription,
    VoltCardHeader,
    VoltCardTitle,
    VoltCheckbox,
    VoltInput,
    VoltLabel,
    VoltProgress,
    VoltSeparator,
    VoltSlider,
    VoltSwitch,
    ...MOVEMENT_DIRECTIVES,
  ],
  template: `
    <div class="space-y-6 px-2 sm:px-0">
      <div class="text-center">
        <h2 class="text-2xl sm:text-3xl font-bold mb-2 sm:mb-4">
          Theme Preview
        </h2>
        <p class="text-base sm:text-lg opacity-80">
          See how your generated palette looks in action
        </p>
      </div>

      <div class="grid gap-4 sm:gap-6 lg:grid-cols-2" [moveStagger]="70">
        <volt-card moveInView="fade-up">
          <volt-card-header>
            <volt-card-title>Buttons</volt-card-title>
            <volt-card-description>
              Every variant against the generated primary.
            </volt-card-description>
          </volt-card-header>

          <volt-card-content class="flex flex-wrap gap-2">
            @for (variant of buttonVariants; track variant) {
              <volt-button
                [variant]="variant"
                [moveWhileHover]="{ y: [0, -2] }"
                [moveWhileTap]="{ scale: [1, 0.96] }"
                [moveDuration]="180"
              >
                {{ variant }}
              </volt-button>
            }
          </volt-card-content>
        </volt-card>

        <volt-card moveInView="fade-up">
          <volt-card-header>
            <volt-card-title>Badges &amp; status</volt-card-title>
            <volt-card-description>
              Status colors only render once enabled in Theme Options.
            </volt-card-description>
          </volt-card-header>

          <volt-card-content class="flex flex-wrap items-center gap-2">
            @for (variant of badgeVariants; track variant) {
              <volt-badge [variant]="variant">{{ variant }}</volt-badge>
            }

            <volt-separator orientation="vertical" class="mx-1 h-6" />

            <volt-avatar>
              <volt-avatar-fallback>PC</volt-avatar-fallback>
            </volt-avatar>
          </volt-card-content>
        </volt-card>

        <volt-card moveInView="fade-up">
          <volt-card-header>
            <volt-card-title>Form controls</volt-card-title>
            <volt-card-description>
              Focus rings and checked states use the primary token.
            </volt-card-description>
          </volt-card-header>

          <volt-card-content class="space-y-4">
            <div class="space-y-1.5">
              <volt-label htmlFor="preview-email">Email</volt-label>
              <volt-input
                id="preview-email"
                type="email"
                placeholder="you@example.com"
              />
            </div>

            <label class="flex cursor-pointer items-center gap-3 text-sm">
              <volt-checkbox [(checked)]="subscribed" />
              Subscribe to updates
            </label>

            <label class="flex cursor-pointer items-center gap-3 text-sm">
              <volt-switch [(checked)]="notifications" />
              Enable notifications
            </label>
          </volt-card-content>
        </volt-card>

        <volt-card moveInView="fade-up">
          <volt-card-header>
            <volt-card-title>Indicators</volt-card-title>
            <volt-card-description>
              Filled tracks are where a weak primary shows up fastest.
            </volt-card-description>
          </volt-card-header>

          <volt-card-content class="space-y-5">
            <volt-progress [value]="68" />
            <volt-slider [value]="42" [min]="0" [max]="100" />

            <ul class="space-y-2 pt-1">
              @for (feature of features; track feature) {
                <li class="flex items-center gap-3 text-xs sm:text-sm">
                  <span class="h-2 w-2 shrink-0 rounded-full bg-primary"></span>
                  {{ feature }}
                </li>
              }
            </ul>
          </volt-card-content>
        </volt-card>
      </div>
    </div>
  `,
})
export default class ThemePreview {
  readonly buttonVariants = [
    "solid",
    "outline",
    "ghost",
    "link",
    "destructive",
  ] as const;

  readonly badgeVariants = [
    "solid",
    "secondary",
    "outline",
    "destructive",
  ] as const;

  readonly features = [
    "WCAG AA contrast compliance",
    "Harmonious color relationships",
    "Dark and light mode support",
  ];

  subscribed = signal(true);
  notifications = signal(false);
}
