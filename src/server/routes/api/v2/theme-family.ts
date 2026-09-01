import { defineEventHandler } from "h3";

import { createThemeFamilyHandler } from "../../../handlers/theme";

/**
 * v2 ThemeFamily — coherent light/dark pair from one shared palette identity.
 * Designed for tooling that wants both modes without combining two responses.
 */
export default defineEventHandler(createThemeFamilyHandler("v2"));
