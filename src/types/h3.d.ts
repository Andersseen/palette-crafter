declare module "h3" {
  export interface H3Event {
    context: Record<string, unknown>;
  }

  export interface H3ErrorOptions {
    statusCode: number;
    statusMessage: string;
  }

  export function defineEventHandler<T = unknown>(
    handler: (event: H3Event) => T | Promise<T>,
  ): (event: H3Event) => Promise<T>;

  export function getMethod(event: H3Event): string;

  export function getQuery(
    event: H3Event,
  ): Record<string, string | undefined | string[]>;

  export function readBody<T = unknown>(event: H3Event): Promise<T>;

  export function createError(input: H3ErrorOptions): Error;

  export function setResponseHeader(
    event: H3Event,
    name: string,
    value: string,
  ): void;

  export function setResponseStatus(
    event: H3Event,
    code: number,
    text?: string,
  ): void;
}
