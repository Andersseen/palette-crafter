import { isPlatformBrowser } from "@angular/common";
import { Component, PLATFORM_ID, computed, inject, signal } from "@angular/core";
import {
  VoltButton,
  VoltCard,
  VoltCardContent,
  VoltTabs,
  VoltTabsList,
  VoltTabsTrigger,
} from "@voltui/components";
import { MOVEMENT_DIRECTIVES } from "angular-movement";
import ColorPalette from "@services/color-palette";
import { EXPORT_FORMATS } from "@shared/export";
import type { ExportFormat } from "@shared/types";

@Component({
  selector: "app-export-panel",
  imports: [
    VoltButton,
    VoltCard,
    VoltCardContent,
    VoltTabs,
    VoltTabsList,
    VoltTabsTrigger,
    ...MOVEMENT_DIRECTIVES,
  ],
  template: `
    <div class="space-y-3 sm:space-y-4">
      <p class="text-sm opacity-60">{{ activeFormat().description }}</p>

      <volt-tabs [value]="selected()" (valueChange)="onTabChange($event)">
        <volt-tabs-list class="flex-wrap" aria-label="Export format">
          @for (format of formats; track format.id) {
            <volt-tabs-trigger [value]="format.id">
              {{ format.label }}
            </volt-tabs-trigger>
          }
        </volt-tabs-list>
      </volt-tabs>

      <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <volt-button
          class="w-full sm:w-auto"
          [moveWhileTap]="{ scale: [1, 0.96] }"
          (click)="copy()"
        >
          {{ copyLabel() }}
        </volt-button>

        <volt-button
          variant="outline"
          class="w-full sm:w-auto"
          [moveWhileTap]="{ scale: [1, 0.96] }"
          (click)="download()"
        >
          Download .{{ activeFormat().extension }}
        </volt-button>

        @if (permalink(); as link) {
          <volt-button
            variant="outline"
            class="w-full sm:w-auto"
            [title]="link"
            [moveWhileTap]="{ scale: [1, 0.96] }"
            (click)="copyPermalink()"
          >
            {{ permalinkLabel() }}
          </volt-button>
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

  /** `volt-tabs` emits the raw trigger value, which is the format id. */
  onTabChange(value: string | undefined): void {
    if (value) {
      this.colorService.setExportFormat(value as ExportFormat);
    }
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
