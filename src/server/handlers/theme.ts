import {
  createError,
  getMethod,
  getQuery,
  readBody,
  setResponseHeader,
  setResponseStatus,
  type H3Event,
} from "h3";

// Relative imports on purpose — the Nitro/Cloudflare build is not verified to
// resolve the `@shared/*` alias. See docs/CONVENTIONS.md #1.
import {
  exportTheme,
  isExportFormat,
  EXPORT_FORMATS,
} from "../../shared/export";
import { buildContrastReport } from "../../shared/contrast";
import {
  generateTheme,
  type ThemeGenerationOptions,
} from "../../shared/theme-generator";
import { normalizeHex } from "../../shared/utils";
import type {
  ExportFormat,
  HarmonyType,
  ThemeAlgorithm,
  ThemeApiRequest,
  ThemeMode,
} from "../../shared/types";

const HARMONIES: HarmonyType[] = [
  "analogous",
  "complementary",
  "split-complementary",
  "triadic",
];

/** Bounded so a hostile seed cannot force unbounded hashing work. */
const MAX_SEED_LENGTH = 256;

const isMode = (value: unknown): value is ThemeMode =>
  value === "light" || value === "dark";

const isHarmony = (value: unknown): value is HarmonyType =>
  typeof value === "string" && HARMONIES.includes(value as HarmonyType);

const isAlgorithm = (value: unknown): value is ThemeAlgorithm =>
  value === "v1" || value === "v2";

const badRequest = (statusMessage: string) =>
  createError({ statusCode: 400, statusMessage });

/**
 * Validates and normalizes the request.
 *
 * Every invalid value is rejected with a 400. An earlier version silently
 * dropped an unparseable `baseHue` while rejecting an invalid `mode`, so a
 * typo'd hue quietly returned a random palette instead of an error.
 */
const normalizePayload = (
  payload: ThemeApiRequest,
  defaultAlgorithm: ThemeAlgorithm,
): ThemeGenerationOptions => {
  if (payload.mode !== undefined && !isMode(payload.mode)) {
    throw badRequest('Invalid mode. Use "light" or "dark".');
  }

  if (payload.harmony !== undefined && !isHarmony(payload.harmony)) {
    throw badRequest(
      "Invalid harmony. Use analogous, complementary, split-complementary, or triadic.",
    );
  }

  if (payload.algorithm !== undefined && !isAlgorithm(payload.algorithm)) {
    throw badRequest('Invalid algorithm. Use "v1" or "v2".');
  }

  const algorithm = payload.algorithm ?? defaultAlgorithm;

  let baseHue: number | undefined;
  if (payload.baseHue !== undefined && payload.baseHue !== null) {
    const raw = payload.baseHue as unknown;

    if (raw !== "") {
      const parsed = Number(raw);

      if (!Number.isFinite(parsed)) {
        throw badRequest("Invalid baseHue. Use a number between 0 and 360.");
      }
      if (parsed < 0 || parsed > 360) {
        throw badRequest("Invalid baseHue. Use a number between 0 and 360.");
      }

      baseHue = parsed;
    }
  }

  let baseColor: string | undefined;
  if (payload.baseColor !== undefined && payload.baseColor !== "") {
    if (typeof payload.baseColor !== "string") {
      throw badRequest("Invalid baseColor. Use a hex color such as #3b82f6.");
    }

    const normalized = normalizeHex(payload.baseColor);
    if (!normalized) {
      throw badRequest("Invalid baseColor. Use a hex color such as #3b82f6.");
    }
    if (algorithm !== "v2") {
      // Silently ignoring it would hand back a palette built on a different
      // color than the caller asked for.
      throw badRequest(
        "baseColor requires algorithm v2. Call /api/v2/theme or pass algorithm=v2.",
      );
    }

    baseColor = normalized;
  }

  let seed: string | number | undefined;
  if (payload.seed !== undefined && payload.seed !== "") {
    if (typeof payload.seed === "number") {
      if (!Number.isFinite(payload.seed)) {
        throw badRequest("Invalid seed. Use a string or a finite number.");
      }
      seed = payload.seed;
    } else if (typeof payload.seed === "string") {
      if (payload.seed.length > MAX_SEED_LENGTH) {
        throw badRequest(
          `Invalid seed. Maximum length is ${MAX_SEED_LENGTH} characters.`,
        );
      }
      seed = payload.seed;
    } else {
      throw badRequest("Invalid seed. Use a string or a finite number.");
    }
  }

  return {
    mode: payload.mode,
    seed,
    baseHue,
    harmony: payload.harmony,
    baseColor,
    algorithm,
  };
};

const readFormat = (value: unknown): ExportFormat | undefined => {
  if (value === undefined || value === "" || value === "json-api") {
    return undefined;
  }
  if (!isExportFormat(value)) {
    throw badRequest(
      `Invalid format. Use one of: ${EXPORT_FORMATS.map((entry) => entry.id).join(", ")}.`,
    );
  }
  return value;
};

const applyCorsHeaders = (event: H3Event): void => {
  // Public read-only API: any origin may call it, and it carries no credentials.
  setResponseHeader(event, "Access-Control-Allow-Origin", "*");
  setResponseHeader(event, "Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  setResponseHeader(event, "Access-Control-Allow-Headers", "Content-Type");
  setResponseHeader(event, "Access-Control-Max-Age", "86400");
};

/**
 * Seeded output is a pure function of the query string, so it is safe to cache
 * hard at the edge. Unseeded output is random by definition and must not be.
 */
const applyCacheHeaders = (event: H3Event, deterministic: boolean): void => {
  setResponseHeader(
    event,
    "Cache-Control",
    deterministic
      ? "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800"
      : "no-store",
  );
};

const firstQueryValue = (
  value: string | string[] | undefined,
): string | undefined => (Array.isArray(value) ? value[0] : value);

export const createThemeHandler = (defaultAlgorithm: ThemeAlgorithm) =>
  async (event: H3Event) => {
    const method = getMethod(event).toUpperCase();

    applyCorsHeaders(event);

    // Without this, the browser preflight for a cross-origin POST gets a 405
    // and the request never happens.
    if (method === "OPTIONS") {
      setResponseStatus(event, 204);
      return null;
    }

    if (method !== "GET" && method !== "POST") {
      throw createError({
        statusCode: 405,
        statusMessage: "Method not allowed. Use GET or POST.",
      });
    }

    const query = getQuery(event);
    const body = method === "POST" ? await readBody<ThemeApiRequest>(event) : {};

    const payload: ThemeApiRequest = {
      mode: (body?.mode ?? firstQueryValue(query["mode"])) as
        | ThemeMode
        | undefined,
      seed: body?.seed ?? firstQueryValue(query["seed"]),
      baseHue: (body?.baseHue ?? firstQueryValue(query["baseHue"])) as
        | number
        | undefined,
      harmony: (body?.harmony ?? firstQueryValue(query["harmony"])) as
        | HarmonyType
        | undefined,
      baseColor: (body?.baseColor ?? firstQueryValue(query["baseColor"])) as
        | string
        | undefined,
      algorithm: (body?.algorithm ?? firstQueryValue(query["algorithm"])) as
        | ThemeAlgorithm
        | undefined,
    };

    const format = readFormat(firstQueryValue(query["format"]));
    const options = normalizePayload(payload, defaultAlgorithm);
    const result = generateTheme(options);

    applyCacheHeaders(event, options.seed !== undefined);

    if (format) {
      const info = EXPORT_FORMATS.find((entry) => entry.id === format)!;
      setResponseHeader(event, "Content-Type", info.contentType);
      return exportTheme(format, { theme: result.theme, meta: result.meta });
    }

    // Opt-in so the default payload stays exactly what existing clients expect.
    const withContrast = firstQueryValue(query["contrast"]) === "true";

    return {
      ok: true as const,
      ...result,
      ...(withContrast ? { contrast: buildContrastReport(result.theme) } : {}),
    };
  };
