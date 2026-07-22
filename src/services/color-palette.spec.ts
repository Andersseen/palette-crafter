import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it } from "vitest";

import ColorPalette from "./color-palette";
import { calculateContrast } from "@shared/utils";

const STORAGE_KEY = "palette-crafter:last-theme";

const create = (): ColorPalette => {
  TestBed.configureTestingModule({ providers: [ColorPalette] });
  return TestBed.inject(ColorPalette);
};

const readVar = (name: string): string =>
  document.documentElement.style.getPropertyValue(name).trim();

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  document.documentElement.style.cssText = "";
  window.history.replaceState({}, "", "/");
});

describe("initial state", () => {
  it("starts with a real palette rather than placeholder colors", () => {
    const service = create();

    // Generated synchronously in the constructor — this is what removes the
    // flash of hardcoded blue/green that used to precede the first request.
    expect(service.meta()).not.toBeNull();
    expect(service.theme().primary.DEFAULT).toMatch(/^#[0-9a-f]{6}$/);
    expect(service.isLoading()).toBe(false);
  });

  it("uses the v2 algorithm", () => {
    expect(create().meta()!.algorithm).toBe("v2");
  });
});

describe("updateActiveShade", () => {
  it("recomputes the foreground for the promoted shade", () => {
    const service = create();
    const lightest = service.theme().primary[50];

    service.updateActiveShade("primary", lightest);

    const scale = service.theme().primary;
    expect(scale.DEFAULT).toBe(lightest);

    // The bug this covers: the foreground stayed pinned to the old DEFAULT's
    // value, leaving white text on shade 50 at about 1.15:1.
    expect(
      calculateContrast(scale.DEFAULT, scale.foreground),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps the foreground correct across every shade", () => {
    const service = create();
    const shades = [
      50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950,
    ] as const;

    for (const shade of shades) {
      const hex = service.theme().primary[shade];
      service.updateActiveShade("primary", hex);

      const scale = service.theme().primary;
      expect(
        calculateContrast(scale.DEFAULT, scale.foreground),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("writes the new foreground to the CSS variables", () => {
    const service = create();
    service.updateActiveShade("primary", service.theme().primary[50]);

    const scale = service.theme().primary;
    const expected = scale.foreground === "#ffffff" ? "255 255 255" : "0 0 0";

    expect(readVar("--primary-foreground")).toBe(expected);
  });
});

describe("locking", () => {
  it("keeps a locked scale untouched while regenerating the rest", async () => {
    const service = create();
    service.setLocked("primary", true);

    const before = service.theme();
    await service.generatePalette({ seed: "something-else" });
    const after = service.theme();

    expect(after.primary).toEqual(before.primary);
    expect(after.secondary).not.toEqual(before.secondary);
  });

  it("regenerates everything when nothing is locked", async () => {
    const service = create();

    const before = service.theme();
    await service.generatePalette({ seed: "another-seed" });

    expect(service.theme().primary).not.toEqual(before.primary);
  });

  it("toggles lock state", () => {
    const service = create();

    expect(service.locked().secondary).toBe(false);
    service.toggleLocked("secondary");
    expect(service.locked().secondary).toBe(true);
  });
});

describe("brand color", () => {
  it("places the supplied hex in the palette verbatim", async () => {
    const service = create();

    await service.setBrandColor("#ff6b35");

    expect(service.theme().primary.DEFAULT).toBe("#ff6b35");
    expect(service.activeBrandColor()).toBe("#ff6b35");
  });

  it("accepts shorthand hex", async () => {
    const service = create();
    await service.setBrandColor("#f63");

    expect(service.theme().primary.DEFAULT).toBe("#ff6633");
  });

  it("reports an invalid hex without changing the palette", async () => {
    const service = create();
    const before = service.theme().primary.DEFAULT;

    const ok = await service.setBrandColor("not-a-color");

    expect(ok).toBe(false);
    expect(service.error()).toContain("not a valid hex color");
    expect(service.theme().primary.DEFAULT).toBe(before);
  });
});

describe("persistence and permalink", () => {
  it("survives a reload with the same palette", async () => {
    const first = create();
    await first.generatePalette({ seed: "persist-me" });
    const expected = first.theme().primary.DEFAULT;

    // A fresh service instance stands in for a page reload. The URL is reset so
    // the cached theme, not the permalink, is what restores it.
    window.history.replaceState({}, "", "/");
    TestBed.resetTestingModule();
    const second = create();

    expect(second.theme().primary.DEFAULT).toBe(expected);
    expect(second.meta()!.seed).toBe("persist-me");
  });

  it("writes the palette into the address bar", async () => {
    const service = create();
    await service.generatePalette({ seed: "shareable" });

    expect(window.location.search).toContain("seed=shareable");
    expect(service.permalink()).toContain("seed=shareable");
  });

  it("restores a palette from the URL, taking priority over the cache", async () => {
    const seeded = create();
    await seeded.generatePalette({ seed: "cached-one" });

    window.history.replaceState({}, "", "/?seed=from-url&mode=dark");
    TestBed.resetTestingModule();
    const restored = create();

    expect(restored.meta()!.seed).toBe("from-url");
    expect(restored.mode()).toBe("dark");
  });

  it("reproduces the exact palette a permalink points at", async () => {
    const original = create();
    await original.generatePalette({ seed: "repro", harmony: "triadic" });
    const expected = original.theme();

    const link = original.permalink()!;
    window.history.replaceState({}, "", link.slice(link.indexOf("/?")));
    TestBed.resetTestingModule();

    expect(create().theme()).toEqual(expected);
  });

  it("recovers from corrupted cached data", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(() => create()).not.toThrow();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("mints a seed when rerolling so the result stays reproducible", async () => {
    const service = create();
    await service.reroll();

    expect(service.meta()!.seed).toBeTruthy();
    expect(window.location.search).toContain("seed=");
  });
});

describe("mode switching", () => {
  it("keeps the palette identity when toggling light and dark", async () => {
    const service = create();
    await service.generatePalette({ seed: "stable", harmony: "complementary" });

    const before = service.meta()!;
    await service.toggleThemeMode();
    const after = service.meta()!;

    expect(after.mode).toBe(before.mode === "light" ? "dark" : "light");
    expect(after.seed).toBe(before.seed);
    expect(after.harmony).toBe(before.harmony);
    expect(after.baseHue).toBe(before.baseHue);
  });

  it("sets the dark class on the document element", async () => {
    const service = create();
    await service.generatePalette({ mode: "dark", seed: "x" });

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

describe("exports and contrast", () => {
  it("renders the selected export format", () => {
    const service = create();

    expect(service.exportedTheme()).toContain("@theme {");

    service.setExportFormat("json");
    expect(() => JSON.parse(service.exportedTheme())).not.toThrow();
  });

  it("reflects the single/scale switch in the export", () => {
    const service = create();
    service.setColorTokenMode("secondary", "single");

    expect(service.exportedTheme()).not.toContain("--color-secondary-500:");
  });

  it("exposes a contrast report that tracks the current theme", () => {
    const service = create();
    const report = service.contrastReport();

    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.passing + report.failing).toBe(report.checks.length);
  });

  it("includes status colors in the report once enabled", () => {
    const service = create();

    const before = service.contrastReport().checks.length;
    service.setStatusColorEnabled("success", true);

    expect(service.contrastReport().checks.length).toBeGreaterThan(before);
  });
});
