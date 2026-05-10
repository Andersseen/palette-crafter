import { Injectable } from "@angular/core";
import type { ThemeApiRequest, ThemeApiResponse } from "@shared/types";

type ViteEnv = Record<string, string | boolean | undefined>;

const getViteEnv = (): ViteEnv => {
  return ((import.meta as ImportMeta & { env?: ViteEnv }).env ?? {}) as ViteEnv;
};

const normalizeBaseUrl = (value: string | undefined): string => {
  return value?.replace(/\/+$/, "") ?? "";
};

@Injectable({ providedIn: "root" })
export default class ThemeApiClient {
  private static hasLoggedMissingBaseUrl = false;

  private readonly env = getViteEnv();
  private readonly baseUrl = normalizeBaseUrl(
    (this.env["THEME_API_BASE_URL"] as string | undefined) ??
      (this.env["VITE_THEME_API_BASE_URL"] as string | undefined),
  );

  readonly missingBaseUrl =
    this.baseUrl.length === 0 && this.env["DEV"] === true;

  constructor() {
    if (
      this.missingBaseUrl &&
      typeof window !== "undefined" &&
      !ThemeApiClient.hasLoggedMissingBaseUrl
    ) {
      ThemeApiClient.hasLoggedMissingBaseUrl = true;
      console.warn(
        "THEME_API_BASE_URL is not configured. Falling back to same-origin /api/v1/theme for local development.",
      );
    }
  }

  getTheme(params: ThemeApiRequest = {}): Promise<ThemeApiResponse> {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        search.set(key, String(value));
      }
    });

    const query = search.toString();
    return this.request(`${this.endpoint()}${query ? `?${query}` : ""}`, {
      method: "GET",
    });
  }

  createTheme(payload: ThemeApiRequest = {}): Promise<ThemeApiResponse> {
    return this.request(this.endpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  }

  private endpoint(): string {
    return `${this.baseUrl}/api/v1/theme`;
  }

  private async request(
    url: string,
    init: RequestInit,
  ): Promise<ThemeApiResponse> {
    const response = await fetch(url, init);

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
