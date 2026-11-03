export class RequestBodyTooLargeError extends Error {
  constructor() {
    super("REQUEST_TOO_LARGE");
    this.name = "RequestBodyTooLargeError";
  }
}

export class InvalidJsonBodyError extends Error {
  constructor() {
    super("INVALID_JSON");
    this.name = "InvalidJsonBodyError";
  }
}

export function createContentSecurityPolicy(scriptNonce?: string): string {
  if (scriptNonce && !/^[A-Za-z0-9+/]+={0,2}$/.test(scriptNonce))
    throw new TypeError("Invalid script nonce");
  const nonce = scriptNonce ? ` 'nonce-${scriptNonce}'` : "";
  return `default-src 'self'; script-src 'self'${nonce}; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
}

export async function readJsonBody(
  source: AsyncIterable<Uint8Array | string>,
  maximumBytes = 32 * 1024,
): Promise<unknown> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes <= 0)
    throw new RangeError("maximumBytes must be a positive safe integer");

  const chunks: Buffer[] = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of source) {
    if (tooLarge) continue;
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > maximumBytes) {
      tooLarge = true;
      chunks.length = 0;
      continue;
    }
    chunks.push(bytes);
  }

  if (tooLarge) throw new RequestBodyTooLargeError();
  if (!size) return {};
  try {
    return JSON.parse(Buffer.concat(chunks, size).toString("utf8")) as unknown;
  } catch {
    throw new InvalidJsonBodyError();
  }
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly maximumAttempts: number,
    private readonly windowMs: number,
    private readonly maximumKeys = 10_000,
    private readonly now: () => number = Date.now,
  ) {
    if (
      !Number.isSafeInteger(maximumAttempts) || maximumAttempts <= 0 ||
      !Number.isSafeInteger(windowMs) || windowMs <= 0 ||
      !Number.isSafeInteger(maximumKeys) || maximumKeys <= 0
    ) throw new RangeError("Rate limit settings must be positive safe integers");
  }

  allow(key: string): boolean {
    if (!key) return false;
    const now = this.now();
    const current = this.buckets.get(key);
    if (current && current.resetAt > now) {
      if (current.count >= this.maximumAttempts) return false;
      current.count += 1;
      return true;
    }
    if (current) this.buckets.delete(key);

    if (this.buckets.size >= this.maximumKeys) {
      for (const [candidate, bucket] of this.buckets) {
        if (bucket.resetAt <= now) this.buckets.delete(candidate);
      }
      if (this.buckets.size >= this.maximumKeys) return false;
    }

    this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
    return true;
  }
}
