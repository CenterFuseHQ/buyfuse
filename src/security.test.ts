import { describe, expect, it } from "vitest";
import {
  createContentSecurityPolicy,
  FixedWindowRateLimiter,
  InvalidJsonBodyError,
  readJsonBody,
  RequestBodyTooLargeError,
} from "./security.js";

async function* chunks(...values: string[]): AsyncGenerator<string> {
  yield* values;
}

describe("request security helpers", () => {
  it("allows only a request nonce for inline scripts", () => {
    const policy = createContentSecurityPolicy("nonce/123+safe==");
    expect(policy).toContain("script-src 'self' 'nonce-nonce/123+safe=='");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(() => createContentSecurityPolicy("bad nonce; script-src *")).toThrow("Invalid script nonce");
  });

  it("limits repeated attempts and expires a client window", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(2, 100, 2, () => now);
    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-a")).toBe(false);
    now = 100;
    expect(limiter.allow("client-a")).toBe(true);
  });

  it("keeps the number of client buckets bounded", () => {
    let now = 0;
    const limiter = new FixedWindowRateLimiter(10, 100, 2, () => now);
    expect(limiter.allow("client-a")).toBe(true);
    expect(limiter.allow("client-b")).toBe(true);
    expect(limiter.allow("client-c")).toBe(false);
    now = 100;
    expect(limiter.allow("client-c")).toBe(true);
  });

  it("parses bounded JSON and treats an empty body as an empty object", async () => {
    await expect(readJsonBody(chunks('{"ok":true}'), 32)).resolves.toEqual({ ok: true });
    await expect(readJsonBody(chunks(), 32)).resolves.toEqual({});
  });

  it("rejects oversized and malformed bodies without retaining their contents", async () => {
    let chunksRead = 0;
    async function* oversizedChunks(): AsyncGenerator<string> {
      yield "private-";
      chunksRead += 1;
      yield "marker";
      chunksRead += 1;
    }
    await expect(readJsonBody(oversizedChunks(), 8)).rejects.toBeInstanceOf(RequestBodyTooLargeError);
    expect(chunksRead).toBe(1);
    await expect(readJsonBody(chunks("{private-marker"), 32)).rejects.toBeInstanceOf(InvalidJsonBodyError);
  });
});
