import {
  defineEventHandler,
  getMethod,
  getQuery,
  readBody,
  createError,
  type H3Event,
} from "h3";
import {
  generateTheme,
  type ThemeGenerationOptions,
} from "../../../../shared/theme-generator";
import type {
  HarmonyType,
  ThemeApiRequest,
  ThemeMode,
} from "../../../../shared/types";

type ThemeRequest = ThemeApiRequest;

const HARMONIES: HarmonyType[] = [
  "analogous",
  "complementary",
  "split-complementary",
  "triadic",
];

const isMode = (value: unknown): value is ThemeMode => {
  return value === "light" || value === "dark";
};

const isHarmony = (value: unknown): value is HarmonyType => {
  return typeof value === "string" && HARMONIES.includes(value as HarmonyType);
};

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const normalizePayload = (payload: ThemeRequest): ThemeGenerationOptions => {
  const baseHue = toNumber(payload.baseHue);

  if (payload.mode !== undefined && !isMode(payload.mode)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid mode. Use "light" or "dark".',
    });
  }

  if (payload.harmony !== undefined && !isHarmony(payload.harmony)) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "Invalid harmony. Use analogous, complementary, split-complementary, or triadic.",
    });
  }

  if (
    baseHue !== undefined &&
    (baseHue < 0 || baseHue > 360 || !Number.isFinite(baseHue))
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid baseHue. Use a number between 0 and 360.",
    });
  }

  return {
    mode: payload.mode,
    seed: payload.seed,
    baseHue,
    harmony: payload.harmony,
  };
};

export default defineEventHandler(async (event: H3Event) => {
  const method = getMethod(event).toUpperCase();

  if (method !== "GET" && method !== "POST") {
    throw createError({
      statusCode: 405,
      statusMessage: "Method not allowed. Use GET or POST.",
    });
  }

  const query = getQuery(event);
  const body = method === "POST" ? await readBody<ThemeRequest>(event) : {};

  const payload: ThemeRequest = {
    mode: (body?.mode ?? query["mode"]) as ThemeMode | undefined,
    seed: body?.seed ?? (query["seed"] as string | undefined),
    baseHue: (body?.baseHue ?? query["baseHue"]) as number | undefined,
    harmony: (body?.harmony ?? query["harmony"]) as HarmonyType | undefined,
  };

  const options = normalizePayload(payload);
  const result = generateTheme(options);

  return {
    ok: true,
    ...result,
  };
});
