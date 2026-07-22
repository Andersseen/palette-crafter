import { defineEventHandler } from "h3";

import { createThemeHandler } from "../../../handlers/theme";

/**
 * v2 — OKLCH perceptual scales, input lightness preserved, `baseColor` support
 * and AAA body text. See docs/specs/ for the rationale behind each change.
 */
export default defineEventHandler(createThemeHandler("v2"));
