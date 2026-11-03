import { createServer as createTcpServer, request as httpRequest } from "node:http";
import { spawn } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const children: ReturnType<typeof spawn>[] = [];

afterEach(async () => {
  await Promise.all(
    children.splice(0).map(
      (child) =>
        new Promise<void>((resolve) => {
          if (child.exitCode !== null) return resolve();
          child.once("exit", () => resolve());
          child.kill();
          setTimeout(resolve, 2_000).unref();
        }),
    ),
  );
});

describe("BuyFuse HTTP request limits", () => {
  it("returns 413 and closes an oversized chunked request without waiting for end", async () => {
    const port = await getFreePort();
    let childOutput = "";
    const child = spawn(process.execPath, ["--import", "tsx", "src/server.ts"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(port),
        AUTH_SECRET: "buyfuse-request-limit-test-secret-32-characters",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout?.on("data", (chunk: Buffer) => (childOutput += chunk.toString("utf8")));
    child.stderr?.on("data", (chunk: Buffer) => (childOutput += chunk.toString("utf8")));
    children.push(child);

    const baseUrl = `http://127.0.0.1:${port}`;
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      if (child.exitCode !== null) throw new Error(`BuyFuse server exited with ${child.exitCode}`);
      try {
        const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(750) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    expect(ready, `BuyFuse server did not start: ${childOutput}`).toBe(true);

    const response = await sendIncompleteChunkedRequest(port);
    expect(response.status).toBe(413);
    expect(JSON.parse(response.body)).toEqual({ error: "REQUEST_TOO_LARGE" });
  }, 45_000);
});

async function getFreePort(): Promise<number> {
  const server = createTcpServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate a test port");
  const { port } = address;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return port;
}

function sendIncompleteChunkedRequest(port: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest({
      hostname: "127.0.0.1",
      port,
      path: "/api/auth/register",
      method: "POST",
      headers: { "transfer-encoding": "chunked" },
    });
    let responseStarted = false;
    request.once("error", (error) => {
      if (!responseStarted) reject(error);
    });
    request.once("response", (response) => {
      responseStarted = true;
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk: string) => (body += chunk));
      response.on("end", () => resolve({ status: response.statusCode ?? 0, body }));
    });
    request.setTimeout(3_000, () => reject(new Error("server waited for the request body to finish")));
    request.write("x".repeat(32 * 1024 + 1));
  });
}
