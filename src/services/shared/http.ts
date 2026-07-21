export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    body?: string,
  ) {
    super(`HTTP ${status} for ${url}${body ? ` — ${body.slice(0, 200)}` : ""}`);
    this.name = "HttpError";
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs = 15_000, ...rest } = init ?? {};
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    if (!res.ok) {
      const body = await res.text().catch(() => undefined);
      throw new HttpError(res.status, url, body);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
