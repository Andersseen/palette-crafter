import { Component, computed, inject } from "@angular/core";
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
  template: `
    <div class="space-y-3 sm:space-y-4">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-base sm:text-lg font-semibold">Accessibility</h3>
        <p class="text-xs sm:text-sm opacity-70">
          {{ report().passing }} of {{ report().checks.length }} checks pass
          WCAG AA
        </p>
      </div>

      <ul class="grid gap-2 sm:grid-cols-2">
        @for (check of report().checks; track check.label) {
          <li
            class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
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
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                [class]="badgeClass(check.level)"
              >
                {{ check.level }}
              </span>
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

  badgeClass(level: WcagLevel): string {
    switch (level) {
      case "AAA":
        return "bg-success text-success-foreground";
      case "AA":
        return "bg-success/70 text-success-foreground";
      case "AA Large":
        return "bg-warning text-warning-foreground";
      case "Fail":
        return "bg-danger text-danger-foreground";
    }
  }
}
