import { Component, computed, inject } from "@angular/core";
import { VoltBadge } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import ColorPalette from "@services/color-palette";
import type { WcagLevel } from "@shared/types";

/**
 * Shows the WCAG audit for the pairs the theme actually renders.
 *
 * The project claims accessible-by-default output; this is where that claim
 * becomes checkable instead of something the user has to take on trust.
 */
@Component({
  selector: "app-contrast-report",
  imports: [VoltBadge, ...MOVEMENT_DIRECTIVES],
  template: `
    <div class="space-y-3 sm:space-y-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <p class="text-sm opacity-60">
          Measured on the pairs the theme actually renders, with transparent
          tokens composited at their real opacity.
        </p>
        <p class="font-mono text-xs tabular-nums opacity-70">
          {{ report().passing }}/{{ report().checks.length }} pass AA
        </p>
      </div>

      <ul class="grid gap-2 sm:grid-cols-2" [moveStagger]="40">
        @for (check of report().checks; track check.label) {
          <li
            class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
            moveInView="fade-up"
            [class.border-foreground\\/15]="check.passes"
            [class.border-danger]="!check.passes"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground/10 text-[11px] font-bold"
                [style.background-color]="check.background"
                [style.color]="check.foreground"
                aria-hidden="true"
              >
                Aa
              </span>

              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ check.label }}</p>
                @if (check.suggestion; as suggestion) {
                  <p class="truncate text-xs opacity-70">
                    Use shade {{ suggestion.shade }} ({{ suggestion.hex }}) for
                    text — {{ suggestion.ratio }}:1
                  </p>
                } @else if (!check.bodyText) {
                  <p class="truncate text-xs opacity-60">
                    Non-text element · needs 3:1
                  </p>
                }
              </div>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <span class="font-mono text-xs opacity-70">
                {{ check.ratio }}:1
              </span>
              <volt-badge [variant]="badgeVariant(check.level)">
                {{ check.level }}
              </volt-badge>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
})
export default class ContrastReport {
  private readonly colorService = inject(ColorPalette);

  report = computed(() => this.colorService.contrastReport());

  /**
   * Volt badges only offer four variants, so "AA Large" (a partial pass) has
   * to share `outline` with nothing else rather than getting a warning colour.
   */
  badgeVariant(level: WcagLevel): "solid" | "secondary" | "outline" | "destructive" {
    switch (level) {
      case "AAA":
        return "solid";
      case "AA":
        return "secondary";
      case "AA Large":
        return "outline";
      case "Fail":
        return "destructive";
    }
  }
}
