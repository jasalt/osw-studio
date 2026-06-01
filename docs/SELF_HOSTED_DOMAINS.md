# Self-Hosted Domain Routing

Guide for OSW Studio operators running their own instances with custom domain support.

## How It Works

1. Users enter a custom domain in Deployment Settings and publish
2. OSW Studio registers the domain in its routing table
3. A reverse proxy (e.g., Caddy) intercepts requests to that domain
4. The proxy rewrites the request to the deployment's static files
5. `/api/` requests pass through without rewriting (edge functions, analytics)

## API Endpoints

OSW Studio exposes these endpoints for proxy integration:

```
GET /api/resolve-domain?host=sweetcandies.com     → { deploymentId, path }
GET /api/resolve-domain?domain=sweetcandies.com   → 200 or 404 (for Caddy on_demand_tls ask)
GET /api/resolve-domain?list=true                  → { domains: [...] } (for config generation)
```

## Proxy Requirements

Your reverse proxy needs to:

1. **Resolve domains** — map incoming hostnames to deployment paths via the API above
2. **Rewrite paths** — `sweetcandies.com/page` → `localhost:3000/deployments/{id}/page`
3. **Exclude `/api/`** — requests to `/api/*` must pass through without rewriting (edge functions and analytics depend on this)
4. **Handle TLS** — provision SSL certificates for custom domains

Caddy is recommended. Refer to Caddy's documentation for [on-demand TLS](https://caddyserver.com/docs/automatic-https#on-demand-tls), [rewrite](https://caddyserver.com/docs/caddyfile/directives/rewrite), and [named matchers](https://caddyserver.com/docs/caddyfile/matchers#named-matchers).

## User Setup

Your users need to:

1. Enter their domain in Deployment Settings
2. Publish the deployment
3. Add a DNS A record pointing to your server's IP
4. Wait for DNS propagation and SSL provisioning

## Notes

- Deployments published with a custom domain use root-relative asset paths (`/styles/main.css` instead of `/deployments/{id}/styles/main.css`). The direct URL at `/deployments/{id}/` will have broken assets — access via the custom domain instead.
- The domain is registered in the `deployment_routing` table on publish. If a domain is removed from settings and republished, the routing entry is cleared.
