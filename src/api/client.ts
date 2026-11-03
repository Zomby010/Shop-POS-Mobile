/**
 * Calls the Shop POS website's API. The server address and the sign-in token are kept in the phone's
 * secure storage; nothing else about the user's password is stored.
 */

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly body: Record<string, unknown> = {}) {
    super(message);
  }
}

interface Config {
  baseUrl: string;
  token: string | null;
  onSignedOut?: () => void;
}

const config: Config = { baseUrl: '', token: null };

export function configureApi(next: Partial<Config>) {
  Object.assign(config, next);
}

/** 'shop.vercel.app' -> 'https://shop.vercel.app'; keeps http:// for a laptop on the shop Wi-Fi. */
export function normaliseServer(input: string): string {
  let url = input.trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url;
}

type Query = Record<string, string | number | null | undefined>;

function buildUrl(path: string, query?: Query) {
  const url = `${config.baseUrl}/api/v1/${path.replace(/^\//, '')}`;
  const params = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

export async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  { query, body, form, timeoutMs = 20000 }: { query?: Query; body?: unknown; form?: FormData; timeoutMs?: number } = {},
): Promise<T> {
  if (!config.baseUrl) throw new ApiError('Set the shop server address first.', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && !form ? { 'Content-Type': 'application/json' } : {}),
        ...(config.token ? { Authorization: `Token ${config.token}` } : {}),
      },
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch {
    throw new ApiError("Can't reach the shop server. Check the internet connection and try again.", 0);
  } finally {
    clearTimeout(timer);
  }
  let data: Record<string, unknown> = {};
  try {
    data = await response.json();
  } catch {
    // Not JSON: an error page from a proxy or a wrong address.
  }
  if (!response.ok) {
    if (response.status === 401) config.onSignedOut?.();
    const message = typeof data.error === 'string' ? data.error : `The server answered ${response.status}.`;
    throw new ApiError(message, response.status, data);
  }
  return data as T;
}

/** The address and headers to fetch a file (such as an Excel report) the way `get` would. */
export function fileRequest(path: string, query?: Query): { url: string; headers: Record<string, string> } {
  if (!config.baseUrl) throw new ApiError('Set the shop server address first.', 0);
  return { url: buildUrl(path, query), headers: config.token ? { Authorization: `Token ${config.token}` } : {} };
}

export const get = <T>(path: string, query?: Query) => request<T>('GET', path, { query });
export const post = <T>(path: string, body: unknown = {}) => request<T>('POST', path, { body });
/** A multipart upload, such as the products workbook. */
export const upload = <T>(path: string, form: FormData) => request<T>('POST', path, { form, timeoutMs: 60000 });

/** A unique id for actions the server should apply only once, even if the app retries. */
export function requestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
