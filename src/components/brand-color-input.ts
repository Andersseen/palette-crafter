import { Component, computed, inject, signal } from "@angular/core";
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
  template: `
    <div
      class="flex flex-col gap-3 rounded-lg border border-foreground/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex items-center gap-3">
        <label
          class="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-md border border-foreground/20"
          [style.background-color]="preview()"
          [title]="'Pick a brand color'"
        >
          <input
            type="color"
            class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            [value]="preview()"
            (input)="onPick($event)"
          />
          <span class="sr-only">Brand color picker</span>
        </label>

        <div class="flex flex-col">
          <label class="text-sm font-medium" for="brand-hex">
            Start from a brand color
          </label>
          <span class="text-xs opacity-60">
            The exact hex is kept in the generated scale.
          </span>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <input
          id="brand-hex"
          class="w-32 rounded-md border border-foreground/20 bg-background px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          [class.border-danger]="isInvalid()"
          placeholder="#ff6b35"
          autocomplete="off"
          spellcheck="false"
          [value]="draft()"
          [attr.aria-invalid]="isInvalid()"
          (input)="onType($event)"
          (keydown.enter)="apply()"
        />

        <button
          type="button"
          class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          [disabled]="!canApply()"
          (click)="apply()"
        >
          Apply
        </button>

        @if (active()) {
          <button
            type="button"
            class="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-foreground/10"
            (click)="clear()"
          >
            Clear
          </button>
        }
      </div>
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

  onType(event: Event): void {
    this.draftState.set((event.target as HTMLInputElement).value);
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
