import { defineEventHandler } from "h3";

import { createThemeFamilyHandler } from "../../../handlers/theme";

/**
 * v3 ThemeFamily — coherent light/dark pair with adaptive semantic statuses.
 */
export default defineEventHandler(createThemeFamilyHandler("v3"));
