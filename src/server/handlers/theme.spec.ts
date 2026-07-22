import { beforeEach, describe, expect, it, vi } from "vitest";
import type { H3Event } from "h3";

import { createThemeHandler } from "./theme";

/**
 * The handler only touches h3 through a handful of helpers, so stubbing them is
 * enough to exercise routing, validation, CORS and caching without booting Nitro.
 */
const state = {
  method: "GET",
  query: {} as Record<string, string | string[] | undefined>,
  body: {} as unknown,
  headers: {} as Record<string, string>,
  status: 200,
};

vi.mock("h3", () => ({
  getMethod: () => state.method,
  getQuery: () => state.query,
  readBody: async () => state.body,
  setResponseHeader: (_event: H3Event, name: string, value: string) => {
    state.headers[name] = value;
  },
  setResponseStatus: (_event: H3Event, code: number) => {
    state.status = code;
  },
  createError: ({
    statusCode,
    statusMessage,
  }: {
    statusCode: number;
    statusMessage: string;
  }) => Object.assign(new Error(statusMessage), { statusCode, statusMessage }),
}));

const event = {} as H3Event;
const v1 = createThemeHandler("v1");
const v2 = createThemeHandler("v2");

const call = (
  handler: typeof v1,
  {
    method = "GET",
    query = {},
    body = {},
  }: {
    method?: string;
    query?: Record<string, string | string[] | undefined>;
    body?: unknown;
  } = {},
) => {
  state.method = method;
  state.query = query;
  state.body = body;
  state.headers = {};
  state.status = 200;
  return handler(event);
};

const expectStatus = async (promise: Promise<unknown>, statusCode: number) => {
  await expect(promise).rejects.toMatchObject({ statusCode });
};

beforeEach(() => {
  state.headers = {};
});

describe("theme handler routing", () => {
  it("answers the CORS preflight instead of rejecting it", async () => {
    // A 405 here is what stops any browser-based consumer from calling the API.
    const result = await call(v1, { method: "OPTIONS" });

    expect(result).toBeNull();
    expect(state.status).toBe(204);
    expect(state.headers["Access-Control-Allow-Origin"]).toBe("*");
    expect(state.headers["Access-Control-Allow-Methods"]).toContain("OPTIONS");
  });

  it("sets CORS headers on normal responses too", async () => {
    await call(v1, { query: { seed: "a" } });
    expect(state.headers["Access-Control-Allow-Origin"]).toBe("*");
  });

  it("rejects methods other than GET, POST and OPTIONS", async () => {
    await expectStatus(call(v1, { method: "DELETE" }), 405);
  });

  it("reads parameters from the query string on GET", async () => {
    const result = (await call(v1, {
      query: { mode: "dark", harmony: "triadic", baseHue: "220", seed: "brand-a" },
    })) as { meta: { mode: string; harmony: string; baseHue: number } };

    expect(result.meta).toMatchObject({
      mode: "dark",
      harmony: "triadic",
      baseHue: 220,
    });
  });

  it("prefers the body over the query string on POST", async () => {
    const result = (await call(v1, {
      method: "POST",
      query: { mode: "light" },
      body: { mode: "dark", seed: "brand-a" },
    })) as { meta: { mode: string } };

    expect(result.meta.mode).toBe("dark");
  });
});

describe("theme handler caching", () => {
  it("allows edge caching for deterministic seeded output", async () => {
    await call(v1, { query: { seed: "brand-a" } });

    expect(state.headers["Cache-Control"]).toContain("public");
    expect(state.headers["Cache-Control"]).toContain("s-maxage=86400");
  });

  it("refuses to cache unseeded, random output", async () => {
    await call(v1, {});
    expect(state.headers["Cache-Control"]).toBe("no-store");
  });
});

describe("theme handler validation", () => {
  it("rejects an unparseable baseHue instead of ignoring it", async () => {
    // Previously this silently returned a random palette.
    await expectStatus(call(v1, { query: { baseHue: "abc" } }), 400);
  });

  it("rejects an out-of-range baseHue", async () => {
    await expectStatus(call(v1, { query: { baseHue: "999" } }), 400);
    await expectStatus(call(v1, { query: { baseHue: "-1" } }), 400);
  });

  it("still accepts the boundary hues", async () => {
    for (const baseHue of ["0", "360"]) {
      await expect(call(v1, { query: { baseHue } })).resolves.toBeDefined();
    }
  });

  it("rejects invalid mode, harmony and algorithm", async () => {
    await expectStatus(call(v1, { query: { mode: "sepia" } }), 400);
    await expectStatus(call(v1, { query: { harmony: "tetradic" } }), 400);
    await expectStatus(call(v1, { query: { algorithm: "v3" } }), 400);
  });

  it("rejects an oversized seed", async () => {
    await expectStatus(
      call(v1, { query: { seed: "x".repeat(257) } }),
      400,
    );
    await expect(
      call(v1, { query: { seed: "x".repeat(256) } }),
    ).resolves.toBeDefined();
  });

  it("rejects an invalid baseColor", async () => {
    await expectStatus(call(v2, { query: { baseColor: "chartreuse" } }), 400);
    await expectStatus(call(v2, { query: { baseColor: "#12345" } }), 400);
  });

  it("rejects baseColor on v1 rather than quietly dropping it", async () => {
    await expectStatus(call(v1, { query: { baseColor: "#ff6b35" } }), 400);
  });

  it("rejects an unknown export format", async () => {
    await expectStatus(call(v1, { query: { format: "less" } }), 400);
  });
});

describe("theme handler output", () => {
  it("defaults to the route's algorithm", async () => {
    const first = (await call(v1, { query: { seed: "a" } })) as {
      meta: { algorithm: string };
    };
    const second = (await call(v2, { query: { seed: "a" } })) as {
      meta: { algorithm: string };
    };

    expect(first.meta.algorithm).toBe("v1");
    expect(second.meta.algorithm).toBe("v2");
  });

  it("lets the algorithm parameter override the route default", async () => {
    const result = (await call(v1, {
      query: { seed: "a", algorithm: "v2" },
    })) as { meta: { algorithm: string } };

    expect(result.meta.algorithm).toBe("v2");
  });

  it("builds the primary scale from a supplied brand color on v2", async () => {
    const result = (await call(v2, { query: { baseColor: "#ff6b35" } })) as {
      theme: { primary: { DEFAULT: string } };
    };

    expect(result.theme.primary.DEFAULT).toBe("#ff6b35");
  });

  it("returns a rendered export when format is given", async () => {
    const result = await call(v2, {
      query: { seed: "a", format: "tailwind" },
    });

    expect(typeof result).toBe("string");
    expect(result as string).toContain("@theme {");
    expect(state.headers["Content-Type"]).toContain("text/css");
  });

  it("omits the contrast report unless it is asked for", async () => {
    const without = (await call(v2, { query: { seed: "a" } })) as object;
    const withReport = (await call(v2, {
      query: { seed: "a", contrast: "true" },
    })) as { contrast?: { checks: unknown[] } };

    expect(without).not.toHaveProperty("contrast");
    expect(withReport.contrast!.checks.length).toBeGreaterThan(0);
  });

  it("keeps v1 output identical to the frozen generator", async () => {
    const result = (await call(v1, {
      query: { seed: "brand-a", mode: "dark", harmony: "triadic", baseHue: "220" },
    })) as { theme: { primary: { DEFAULT: string } } };

    expect(result.theme.primary.DEFAULT).toBe("#3366cc");
  });
});
