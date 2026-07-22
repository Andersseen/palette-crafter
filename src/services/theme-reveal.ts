import { DOCUMENT, isPlatformBrowser } from "@angular/common";
import { ElementRef, Injectable, PLATFORM_ID, inject } from "@angular/core";
import type { MoveKeyframes, MoveTriggerDirective } from "angular-movement";

/** Where the wipe originates. Falls back to the viewport centre. */
export interface RevealOrigin {
  x: number;
  y: number;
}

export interface RevealOptions {
  /** Color painted into the overlay while it expands. */
  color: string;
  /** Runs once the overlay fully covers the viewport. */
  commit: () => void;
  origin?: RevealOrigin;
  /** Fade the overlay out afterwards instead of cutting; used by "generate". */
  fadeOut?: boolean;
}

/**
 * Circular theme reveal.
 *
 * The sequence is what makes it read as a transition rather than decoration:
 *
 *   1. paint the overlay with the *incoming* color
 *   2. grow a circle from the click point until it covers the viewport
 *   3. commit the new theme underneath, hidden by the overlay
 *   4. uncover
 *
 * The old implementation applied the theme first and then played a decorative
 * pulse behind the content (`z-index: -1`), so the actual color swap was an
 * abrupt jump that the animation never hid.
 */
@Injectable({ providedIn: "root" })
export default class ThemeReveal {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Radius needed to cover the viewport from an arbitrary origin.
   *
   * `circle(100%)` resolves against the element's own box, which leaves a
   * visible wedge uncovered whenever the origin is off-centre — so the corner
   * distance is computed explicitly.
   */
  private coveringRadius({ x, y }: RevealOrigin): number {
    const view = this.document.defaultView;
    const width = view?.innerWidth ?? 0;
    const height = view?.innerHeight ?? 0;

    return Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  }

  private centre(): RevealOrigin {
    const view = this.document.defaultView;
    return {
      x: (view?.innerWidth ?? 0) / 2,
      y: (view?.innerHeight ?? 0) / 2,
    };
  }

  /** Reads the click position, falling back to the centre for keyboard use. */
  originOf(event?: MouseEvent): RevealOrigin {
    if (!event || (event.clientX === 0 && event.clientY === 0)) {
      return this.centre();
    }

    return { x: event.clientX, y: event.clientY };
  }

  async run(
    trigger: MoveTriggerDirective,
    overlay: ElementRef<HTMLElement>,
    { color, commit, origin, fadeOut = false }: RevealOptions,
  ): Promise<void> {
    if (!this.isBrowser) {
      commit();
      return;
    }

    const element = overlay.nativeElement;
    const from = origin ?? this.centre();
    const radius = this.coveringRadius(from);

    element.style.background = color;
    element.dataset["revealing"] = "true";

    const expand: MoveKeyframes = {
      clipPath: [
        `circle(0px at ${from.x}px ${from.y}px)`,
        `circle(${radius}px at ${from.x}px ${from.y}px)`,
      ],
    };

    try {
      await trigger.play(expand);
      commit();

      if (fadeOut) {
        await trigger.play({ opacity: [1, 0] });
      }
    } finally {
      // Always restore the hidden state, even if the animation was cancelled
      // by a second click — otherwise the overlay stays covering the page.
      element.dataset["revealing"] = "false";
      element.style.clipPath = `circle(0px at ${from.x}px ${from.y}px)`;
      element.style.opacity = "0";
    }
  }
}
