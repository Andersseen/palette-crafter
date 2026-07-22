import { ElementRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MoveTriggerDirective } from "angular-movement";

import ThemeReveal from "./theme-reveal";

const create = (): ThemeReveal => {
  TestBed.configureTestingModule({ providers: [ThemeReveal] });
  return TestBed.inject(ThemeReveal);
};

/** Minimal stand-in for MoveTriggerDirective: records the frames it is given. */
const fakeTrigger = () => {
  const plays: Array<Record<string, unknown>> = [];

  return {
    directive: {
      play: vi.fn(async (frames?: Record<string, unknown>) => {
        plays.push(frames ?? {});
      }),
    } as unknown as MoveTriggerDirective,
    plays,
  };
};

const fakeOverlay = () => {
  const element = document.createElement("div");
  return new ElementRef(element);
};

beforeEach(() => {
  TestBed.resetTestingModule();
  Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
});

describe("originOf", () => {
  it("uses the click position", () => {
    const origin = create().originOf({ clientX: 120, clientY: 40 } as MouseEvent);
    expect(origin).toEqual({ x: 120, y: 40 });
  });

  it("falls back to the viewport centre without an event", () => {
    expect(create().originOf()).toEqual({ x: 500, y: 400 });
  });

  it("falls back to the centre for keyboard activation", () => {
    // Enter/Space on a button reports clientX/clientY as 0, which would
    // otherwise anchor every keyboard toggle to the top-left corner.
    const origin = create().originOf({ clientX: 0, clientY: 0 } as MouseEvent);
    expect(origin).toEqual({ x: 500, y: 400 });
  });
});

describe("reveal geometry", () => {
  const radiusFor = async (
    service: ThemeReveal,
    x: number,
    y: number,
  ): Promise<number> => {
    const { directive, plays } = fakeTrigger();

    await service.run(directive, fakeOverlay(), {
      color: "#000000",
      origin: { x, y },
      commit: () => undefined,
    });

    const clip = (plays[0]["clipPath"] as string[])[1];
    return Number(/circle\((\d+(?:\.\d+)?)px/.exec(clip)![1]);
  };

  it("covers the furthest corner from any origin", async () => {
    // A percentage radius resolves against the element box and leaves a wedge
    // uncovered when the origin is off-centre, so the corner distance matters.
    const service = create();
    const corners: Array<[number, number]> = [
      [0, 0],
      [1000, 800],
      [0, 800],
      [1000, 0],
    ];

    for (const [x, y] of corners) {
      // Diagonal of the whole viewport when the origin sits in a corner.
      expect(await radiusFor(service, x, y)).toBeCloseTo(
        Math.hypot(1000, 800),
        5,
      );
    }
  });

  it("needs only half the diagonal from the centre", async () => {
    expect(await radiusFor(create(), 500, 400)).toBeCloseTo(
      Math.hypot(500, 400),
      5,
    );
  });

  it("always reaches at least the nearest edge", async () => {
    const service = create();

    for (const [x, y] of [
      [10, 10],
      [990, 400],
      [500, 790],
    ] as Array<[number, number]>) {
      expect(await radiusFor(service, x, y)).toBeGreaterThanOrEqual(500);
    }
  });
});

describe("run", () => {
  it("commits only after the overlay has covered the screen", async () => {
    const service = create();
    const { directive } = fakeTrigger();
    const order: string[] = [];

    (directive.play as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      order.push("animate");
    });

    await service.run(directive, fakeOverlay(), {
      color: "#123456",
      origin: { x: 0, y: 0 },
      commit: () => order.push("commit"),
    });

    // The whole point of the sequence: the palette swap happens hidden.
    expect(order).toEqual(["animate", "commit"]);
  });

  it("paints the overlay with the incoming color", async () => {
    const service = create();
    const { directive } = fakeTrigger();
    const overlay = fakeOverlay();

    await service.run(directive, overlay, {
      color: "rgb(1, 2, 3)",
      commit: () => undefined,
    });

    expect(overlay.nativeElement.style.background).toBe("rgb(1, 2, 3)");
  });

  it("plays a second fade pass only when asked", async () => {
    const service = create();
    const withFade = fakeTrigger();
    const withoutFade = fakeTrigger();

    await service.run(withFade.directive, fakeOverlay(), {
      color: "#000000",
      commit: () => undefined,
      fadeOut: true,
    });
    await service.run(withoutFade.directive, fakeOverlay(), {
      color: "#000000",
      commit: () => undefined,
    });

    expect(withFade.plays).toHaveLength(2);
    expect(withFade.plays[1]).toEqual({ opacity: [1, 0] });
    expect(withoutFade.plays).toHaveLength(1);
  });

  it("hides the overlay again even if the animation throws", async () => {
    const service = create();
    const { directive } = fakeTrigger();
    const overlay = fakeOverlay();

    (directive.play as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("cancelled"),
    );

    // A second click cancels the first animation; the overlay must not be
    // left covering the page.
    await expect(
      service.run(directive, overlay, {
        color: "#000000",
        commit: () => undefined,
      }),
    ).rejects.toThrow("cancelled");

    expect(overlay.nativeElement.dataset["revealing"]).toBe("false");
    expect(overlay.nativeElement.style.opacity).toBe("0");
  });
});
