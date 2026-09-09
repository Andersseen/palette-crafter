import { defineEventHandler } from "h3";

import { createThemeHandler } from "../../../handlers/theme";

/**
 * v3 — v2's OKLCH brand/body behavior with adaptive semantic status colors.
 * Existing v1/v2 routes stay frozen; new integrations should use this route.
 */
export default defineEventHandler(createThemeHandler("v3"));
