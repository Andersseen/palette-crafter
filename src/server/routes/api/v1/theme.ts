import { defineEventHandler } from "h3";

import { createThemeHandler } from "../../../handlers/theme";

/**
 * v1 — frozen algorithm. Existing seeds must keep returning the same colors
 * forever (docs/CONVENTIONS.md #2). New behavior goes to /api/v2/theme.
 */
export default defineEventHandler(createThemeHandler("v1"));
