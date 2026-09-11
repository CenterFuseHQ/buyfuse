# Project Context

- **Project:** BuyFuse
- **Owner:** Nader Abdelshahid
- **Canonical repository:** `nnabdelshahid/BuyFuse`
- **Visibility:** Private
- **Purpose:** Buyer/customer application for authenticated discovery, workspace, and purchasing workflows.
- **Verified workflow:** The current server provides buyer dashboard and state views, development authentication and workspace adapters, a web manifest, and a data-independent liveness endpoint. Local in-memory identity and workspace data reset on restart.
- **Product separation:** CenterFuse is the umbrella control surface; SellFuse is the separate seller application. BuyFuse must not absorb seller operations or depend on hidden seller-only logic.
- **Shared boundaries:** Cross-product URLs, authentication contracts, platform types, and shared UI packages are explicit interfaces. Secrets stay server-side and production identity/workspace persistence must use approved providers.
- **Security/privacy:** Keep the repository private. Do not expose credentials, identity records, workspace data, or internal service configuration.
- **Cost principle:** Prefer software Nader can own and self-host when practical, especially before adopting costly managed services.

The running code, tests, and explicit configuration are authoritative when older documentation disagrees.
