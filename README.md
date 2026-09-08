# BuyFuse

BuyFuse is the buyer product in the CenterFuse ecosystem. It provides a private workspace for saving items, source links, notes, and purchase status. Its source repository, runtime, CI, and deployment are independent from the sibling CenterFuse and SellFuse repositories.

Related repositories:

- [CenterFuseHQ/centerfuse](https://github.com/CenterFuseHQ/centerfuse) — umbrella platform and ecosystem
- [CenterFuseHQ/sellfuse](https://github.com/CenterFuseHQ/sellfuse) — seller and reseller platform

## Local development

Requirements: Node.js 20.9+ and npm 10+.

```bash
npm ci
copy .env.example .env
npm run dev
```

BuyFuse listens on `http://localhost:3002` by default. The application uses an in-memory development identity and workspace adapter, so local data resets when the process restarts. Set a strong `AUTH_SECRET` through the deployment provider's secret manager in production; do not expose it to browser code.

## Build and tests

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Deployment

The root `Dockerfile` builds and starts BuyFuse independently. Configure `CENTERFUSE_URL`, `SELLFUSE_URL`, and `BUYFUSE_URL` for ecosystem navigation. The additive cross-product database migration is owned and run once by the CenterFuse platform repository; it is intentionally not duplicated here.

The current authentication implementation is repository-local and preserves the existing BuyFuse issuer/audience behavior. A future durable identity integration can replace the service boundary without requiring filesystem imports from another product repository.
