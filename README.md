# BuyFuse

## Live Web App

🌐 **Live:** https://buyfuse.vercel.app

BuyFuse is the canonical application source for the buyer product in the CenterFuse ecosystem. It provides a private workspace for saving items, source links, notes, and purchase status. Its source repository, runtime, CI, and deployment are independent from the sibling CenterFuse and SellFuse repositories.

Related repositories:

- [nnabdelshahid/CenterFuse](https://github.com/nnabdelshahid/CenterFuse) — umbrella platform and ecosystem
- [nnabdelshahid/SellFuse](https://github.com/nnabdelshahid/SellFuse) — seller application

## Local development

Requirements: Node.js 20.9+ and npm 10+.

```bash
npm ci
copy .env.example .env
npm run dev
```

BuyFuse listens on `http://localhost:3002` by default. The current account identity and workspace adapters are in memory in every environment. Account records and saved items can reset when the service restarts, so account mode is not ready for customer data until durable identity and workspace storage are configured. Users can download and restore JSON backups. The browser-only workspace stores entries in local browser storage; it does not sync across devices, is not encrypted, and is removed when site data is cleared. Set a strong `AUTH_SECRET` through the deployment provider's secret manager in production; do not expose it to browser code.

The unauthenticated `GET /health` endpoint reports service liveness without returning workspace or identity data.

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

## Live Deployment

**Production:** https://buyfuse.vercel.app

