import { Component, computed, inject, signal } from "@angular/core";
import { VoltButton, VoltInput, VoltLabel } from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import ColorPalette from "@services/color-palette";
import { normalizeHex } from "@shared/utils";

/**
 * Lets the user start from their own brand color instead of a hue number.
 *
 * This is the input most people actually arrive with — nobody knows their brand
 * is "hue 217", they know it is #FF6B35 — and v2 places that exact hex in the
 * generated scale rather than approximating it.
 */
@Component({
  selector: "app-brand-color-input",
  imports: [VoltButton, VoltInput, VoltLabel, ...MOVEMENT_DIRECTIVES],
  template: `
    <div class="flex min-w-0 items-center gap-2">
      <volt-label
        htmlFor="brand-hex"
        class="shrink-0 text-[11px] uppercase tracking-wide opacity-50"
        [error]="isInvalid()"
      >
        Brand
      </volt-label>

      <label
        class="relative h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md ring-1 ring-inset ring-foreground/20"
        [style.background-color]="preview()"
        title="Pick a brand color"
      >
        <input
          type="color"
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          [value]="preview()"
          (input)="onPick($event)"
        />
        <span class="sr-only">Brand color picker</span>
      </label>

      <volt-input
        id="brand-hex"
        class="w-28 min-w-0 font-mono text-xs"
        placeholder="#ff6b35"
        autocomplete="off"
        [value]="draft()"
        [attr.aria-invalid]="isInvalid()"
        (valueChange)="onValue($event)"
        (keydown.enter)="apply()"
      />

      <volt-button
        size="sm"
        variant="outline"
        class="shrink-0"
        [disabled]="!canApply()"
        [moveWhileTap]="{ scale: [1, 0.95] }"
        (click)="apply()"
      >
        Apply
      </volt-button>

      @if (active()) {
        <volt-button
          size="sm"
          variant="ghost"
          class="shrink-0"
          title="Back to generated hues"
          [moveWhileTap]="{ scale: [1, 0.95] }"
          (click)="clear()"
        >
          Clear
        </volt-button>
      }
    </div>
  `,
})
export default class BrandColorInput {
  private readonly colorService = inject(ColorPalette);

  private draftState = signal("");

  active = computed(() => this.colorService.activeBrandColor());
  draft = computed(() => this.draftState() || (this.active() ?? ""));

  preview = computed(
    () =>
      normalizeHex(this.draft()) ??
      this.active() ??
      this.colorService.theme().primary.DEFAULT,
  );

  isInvalid = computed(
    () => this.draftState().length > 0 && normalizeHex(this.draftState()) === null,
  );

  canApply = computed(() => normalizeHex(this.draft()) !== null);

  /** `volt-input` exposes `value` as a model signal, so it emits the string. */
  onValue(value: string): void {
    this.draftState.set(value);
  }

  onPick(event: Event): void {
    this.draftState.set((event.target as HTMLInputElement).value);
    void this.apply();
  }

  async apply(): Promise<void> {
    const hex = normalizeHex(this.draft());

    if (!hex) {
      return;
    }

    await this.colorService.setBrandColor(hex);
    this.draftState.set("");
  }

  async clear(): Promise<void> {
    this.draftState.set("");
    await this.colorService.setBrandColor(null);
  }
}
