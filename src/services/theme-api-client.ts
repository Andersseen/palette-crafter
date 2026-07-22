import { Injectable } from "@angular/core";
import type { ThemeApiRequest, ThemeApiResponse } from "@shared/types";

type ViteEnv = Record<string, string | boolean | undefined>;

const getViteEnv = (): ViteEnv => {
  return ((import.meta as ImportMeta & { env?: ViteEnv }).env ?? {}) as ViteEnv;
};

const normalizeBaseUrl = (value: string | undefined): string => {
  return value?.replace(/\/+$/, "") ?? "";
};

/**
 * HTTP client for the theme API.
 *
 * The playground does not need this in a normal deployment — it generates
 * themes in-process from the same `generateTheme` the API calls, which is what
 * actually guarantees parity (docs/CONTEXT.md). This client only takes over
 * when `THEME_API_BASE_URL` points the playground at a remote instance.
 */
@Injectable({ providedIn: "root" })
export default class ThemeApiClient {
  private readonly env = getViteEnv();
  private readonly baseUrl = normalizeBaseUrl(
    (this.env["THEME_API_BASE_URL"] as string | undefined) ??
      (this.env["VITE_THEME_API_BASE_URL"] as string | undefined),
  );

  /** When false the caller should generate locally instead. */
  readonly isRemoteConfigured = this.baseUrl.length > 0;

  /**
   * Uses GET so responses are cacheable by the browser and the CDN — the
   * endpoint sets a long `s-maxage` for seeded, deterministic requests.
   */
  getTheme(params: ThemeApiRequest = {}): Promise<ThemeApiResponse> {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") {
        search.set(key, String(value));
      }
    });

    const query = search.toString();
    return this.request(`${this.endpoint()}${query ? `?${query}` : ""}`);
  }

  private endpoint(): string {
    return `${this.baseUrl}/api/v2/theme`;
  }

  private async request(url: string): Promise<ThemeApiResponse> {
    const response = await fetch(url, { method: "GET" });

    if (!response.ok) {
      throw new Error(await this.errorMessage(response));
    }

    const data = (await response.json()) as Partial<ThemeApiResponse>;

    if (data.ok !== true || !data.theme || !data.meta) {
      throw new Error("Theme API returned an unexpected response.");
    }

    return data as ThemeApiResponse;
  }

  private async errorMessage(response: Response): Promise<string> {
    try {
      const body = (await response.json()) as {
        message?: string;
        statusMessage?: string;
      };
      return (
        body.message ??
        body.statusMessage ??
        `Theme API request failed with status ${response.status}.`
      );
    } catch {
      return `Theme API request failed with status ${response.status}.`;
    }
  }
}
