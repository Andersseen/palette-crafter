import { isPlatformBrowser } from "@angular/common";
import { Component, PLATFORM_ID, computed, inject, signal } from "@angular/core";
import { VoltCard, VoltCardContent } from "@voltui/components";
import ColorPalette from "@services/color-palette";
import { EXPORT_FORMATS } from "@shared/export";
import type { ExportFormat } from "@shared/types";

@Component({
  selector: "app-export-panel",
  imports: [VoltCard, VoltCardContent],
  template: `
    <div class="space-y-3 sm:space-y-4 px-2 sm:px-0">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h3 class="text-base sm:text-lg font-semibold">Export</h3>
        <p class="text-xs sm:text-sm opacity-70">{{ activeFormat().description }}</p>
      </div>

      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Export format">
        @for (format of formats; track format.id) {
          <button
            type="button"
            role="tab"
            class="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors"
            [class.bg-primary]="format.id === selected()"
            [class.text-primary-foreground]="format.id === selected()"
            [class.border-transparent]="format.id === selected()"
            [class.border-foreground\\/20]="format.id !== selected()"
            [attr.aria-selected]="format.id === selected()"
            (click)="select(format.id)"
          >
            {{ format.label }}
          </button>
        }
      </div>

      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          class="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-md font-medium transition-all duration-200 hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary text-primary-foreground focus:ring-primary"
          (click)="copy()"
        >
          {{ copyLabel() }}
        </button>

        <button
          class="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-md border border-foreground/20 font-medium transition-colors hover:bg-foreground/10"
          (click)="download()"
        >
          Download .{{ activeFormat().extension }}
        </button>

        @if (permalink(); as link) {
          <button
            class="w-full sm:w-auto px-3 sm:px-4 py-2 rounded-md border border-foreground/20 font-medium transition-colors hover:bg-foreground/10"
            [title]="link"
            (click)="copyPermalink()"
          >
            {{ permalinkLabel() }}
          </button>
        }
      </div>

      <volt-card>
        <volt-card-content class="pt-6">
          <pre
            class="font-mono text-[11px] sm:text-xs overflow-auto max-h-48 sm:max-h-64"
          >{{ code() }}</pre>
        </volt-card-content>
      </volt-card>
    </div>
  `,
})
export default class ExportPanel {
  private readonly colorService = inject(ColorPalette);
  private readonly platformId = inject(PLATFORM_ID);

  readonly formats = EXPORT_FORMATS;

  copyLabel = signal("Copy");
  permalinkLabel = signal("Copy link");

  selected = computed(() => this.colorService.exportFormat());
  code = computed(() => this.colorService.exportedTheme());
  permalink = computed(() => this.colorService.permalink());

  activeFormat = computed(
    () => this.formats.find((entry) => entry.id === this.selected())!,
  );

  select(format: ExportFormat): void {
    this.colorService.setExportFormat(format);
  }

  async copy(): Promise<void> {
    await this.writeToClipboard(this.code(), this.copyLabel, "Copied!");
  }

  async copyPermalink(): Promise<void> {
    const link = this.permalink();

    if (link) {
      await this.writeToClipboard(link, this.permalinkLabel, "Link copied!");
    }
  }

  private async writeToClipboard(
    text: string,
    label: ReturnType<typeof signal<string>>,
    success: string,
  ): Promise<void> {
    const original = label();

    try {
      await navigator.clipboard.writeText(text);
      label.set(success);
    } catch (err) {
      label.set("Copy failed");
      console.error("Failed to copy", err);
    }

    setTimeout(() => label.set(original), 2000);
  }

  download(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const format = this.activeFormat();
    const blob = new Blob([this.code()], { type: format.contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `palette-crafter.${format.extension}`;
    anchor.click();

    URL.revokeObjectURL(url);
  }
}
