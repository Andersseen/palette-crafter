import { Component, inject, signal } from "@angular/core";
import ColorPalette from "@services/color-palette";

@Component({
  selector: "app-export-panel",
  template: `
    <div class="space-y-3 sm:space-y-4 px-2 sm:px-0">
      <h3 class="text-base sm:text-lg font-semibold">Export Configuration</h3>

      <div class="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
        <button
          class="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-md font-medium transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-contrast focus:ring-primary"
          (click)="copyTailwindConfig()"
        >
          {{ buttonText() }}
        </button>
      </div>

      <div
        class="p-3 sm:p-4 rounded-lg border font-mono text-[11px] sm:text-xs overflow-auto max-h-48 sm:max-h-64 border-foreground/20"
      >
        <pre>{{ getTailwindConfig() }}</pre>
      </div>
    </div>
  `,
})
export default class ExportPanel {
  private colorService = inject(ColorPalette);
  buttonText = signal("Copy Tailwind @theme");

  getTailwindConfig(): string {
    return this.colorService.getTailwindConfig();
  }

  async copyTailwindConfig(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getTailwindConfig());
      this.buttonText.set("@theme Copied!");
      setTimeout(() => {
        this.buttonText.set("Copy Tailwind @theme");
      }, 2000);
    } catch (err) {
      this.buttonText.set("Failed to copy @theme");
      console.error("Failed to copy config:", err);
    }
  }
}
