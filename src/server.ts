import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import { InMemoryIdentityService, buyFuseEntitlement } from "@centerfuse/auth";
import { BuyerWorkspaceService } from "@centerfuse/buyfuse-domain";
import { PRODUCTS, resolveProductUrls } from "@centerfuse/config";
import { renderBuyFuseDashboard, renderBuyFuseState } from "./page.js";
import {
  createContentSecurityPolicy,
  FixedWindowRateLimiter,
  InvalidJsonBodyError,
  readJsonBody,
  RequestBodyTooLargeError,
} from "./security.js";

const MAX_REQUEST_BODY_BYTES = 32 * 1024;
const urls = resolveProductUrls(process.env);
const port = Number(process.env.PORT ?? PRODUCTS.BUYFUSE.defaultPort);
const host = process.env.HOST ?? "127.0.0.1";
const secret =
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === "production" ? "" : "buyfuse-local-development-secret-32chars");

if (secret.length < 32) throw new Error("AUTH_SECRET must contain at least 32 characters");

const identity = new InMemoryIdentityService({
  secret,
  issuer: "centerfuse",
  audience: "buyfuse",
  defaultEntitlements: [buyFuseEntitlement],
});
const workspace = new BuyerWorkspaceService();
const attempts = new FixedWindowRateLimiter(10, 60_000);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", urls.BUYFUSE);
    const closeUnreadBody = hasRequestBody(request) ? () => request.destroy() : undefined;

    if (request.method === "GET" && url.pathname === "/health") {
      return send(response, 200, { status: "ok", service: "buyfuse" }, undefined, undefined, closeUnreadBody);
    }
    if (request.method === "GET" && url.pathname === "/manifest.webmanifest") {
      return send(
        response,
        200,
        {
          name: "BuyFuse",
          short_name: "BuyFuse",
          display: "standalone",
          theme_color: PRODUCTS.BUYFUSE.themeColor,
          background_color: "#f6f4ee",
          start_url: "/",
        },
        "application/manifest+json",
        undefined,
        closeUnreadBody,
      );
    }
    if (request.method === "GET" && url.pathname === "/") {
      const nonce = randomBytes(18).toString("base64");
      return send(
        response,
        200,
        renderBuyFuseDashboard(urls, nonce),
        "text/html; charset=utf-8",
        nonce,
        closeUnreadBody,
      );
    }
    if (request.method === "GET" && url.pathname === "/loading") {
      return send(
        response,
        200,
        renderBuyFuseState("loading", urls),
        "text/html; charset=utf-8",
        undefined,
        closeUnreadBody,
      );
    }

    if (
      request.method === "POST" &&
      ["/api/auth/register", "/api/auth/login"].includes(url.pathname)
    ) {
      if (!attempts.allow(request.socket.remoteAddress ?? "unknown")) {
        return send(response, 429, { error: "RATE_LIMITED" }, undefined, undefined, closeUnreadBody);
      }
      const body = await readRequestBody(request);
      const result = url.pathname.endsWith("register")
        ? await identity.register(body)
        : await identity.login(body);
      return send(response, 200, result);
    }

    const context = identity.context(request.headers.authorization);
    if (url.pathname.startsWith("/api/") && !context) {
      return send(response, 401, { error: "UNAUTHORIZED" }, undefined, undefined, closeUnreadBody);
    }
    if (request.method === "GET" && url.pathname === "/api/workspace") {
      return send(response, 200, workspace.get(context!), undefined, undefined, closeUnreadBody);
    }
    if (request.method === "POST" && url.pathname === "/api/items") {
      const input = await readRequestBody(request);
      return send(response, 201, await workspace.save(context!, input));
    }
    const match = /^\/api\/items\/([0-9a-f-]+)\/status$/.exec(url.pathname);
    if (request.method === "PATCH" && match) {
      const input = (await readRequestBody(request)) as { status?: unknown };
      return send(response, 200, workspace.updateStatus(context!, match[1]!, input.status));
    }
    if (url.pathname.startsWith("/api/")) {
      return send(response, 404, { error: "NOT_FOUND" }, undefined, undefined, closeUnreadBody);
    }
    return send(
      response,
      404,
      renderBuyFuseState("not-found", urls),
      "text/html; charset=utf-8",
      undefined,
      closeUnreadBody,
    );
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return send(response, 413, { error: "REQUEST_TOO_LARGE" }, undefined, undefined, () => request.destroy());
    }
    if (error instanceof InvalidJsonBodyError) {
      return send(response, 400, { error: "INVALID_JSON" });
    }
    const known =
      error instanceof Error &&
      ["ACCOUNT_ALREADY_EXISTS", "INVALID_CREDENTIALS", "FORBIDDEN", "SAVED_ITEM_NOT_FOUND"].includes(
        error.message,
      );
    return send(
      response,
      known ? 400 : 422,
      { error: known && error instanceof Error ? error.message : "INVALID_REQUEST" },
    );
  }
});

server.requestTimeout = 120_000;
server.headersTimeout = 60_000;
server.listen(port, host, () =>
  console.info(JSON.stringify({ event: "app.started", product: "BUYFUSE", host, port })),
);

async function readRequestBody(request: IncomingMessage): Promise<unknown> {
  if (declaredBodyExceeds(request, MAX_REQUEST_BODY_BYTES)) {
    throw new RequestBodyTooLargeError();
  }
  return readJsonBody(request, MAX_REQUEST_BODY_BYTES);
}

function hasRequestBody(request: IncomingMessage): boolean {
  return (
    (request.headers["content-length"] ?? "0") !== "0" ||
    request.headers["transfer-encoding"] !== undefined
  );
}

function declaredBodyExceeds(request: IncomingMessage, maximumBytes: number): boolean {
  const contentLength = request.headers["content-length"];
  return contentLength !== undefined && Number(contentLength) > maximumBytes;
}

function send(
  response: ServerResponse,
  status: number,
  data: unknown,
  type = "application/json; charset=utf-8",
  scriptNonce?: string,
  afterSend?: () => void,
) {
  const value = typeof data === "string" ? data : JSON.stringify(data);
  response
    .writeHead(status, {
      "content-type": type,
      "content-security-policy": createContentSecurityPolicy(scriptNonce),
      "cache-control": type.startsWith("text/html") ? "no-store" : "private, no-store",
      "referrer-policy": "same-origin",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    })
    .end(value, afterSend);
}
