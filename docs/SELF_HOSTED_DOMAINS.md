# Self-Hosted Domain Routing

Guide for OSW Studio operators running their own instances.

## Deployment Serving

Published deployments are served by Node.js route handlers by default. For better performance, set `STATIC_PROXY=true` in `.env` and use a reverse proxy (e.g., Caddy) to serve deployment files directly. With this setup, deployment requests bypass Node.js entirely.

When `STATIC_PROXY=true`, publishing or deleting a deployment with a custom domain automatically regenerates the proxy config and reloads it.

## Custom Domains

Users can set a custom domain in Deployment Settings and publish. The instance exposes a domain resolution API for proxy integration:

```
GET /api/resolve-domain?host=sweetcandies.com     → { deploymentId, path }
GET /api/resolve-domain?domain=sweetcandies.com   → 200 or 404 (for on-demand TLS verification)
GET /api/resolve-domain?list=true                  → { domains: [...] } (all registered domains)
```

### User Setup

1. Enter their domain in Deployment Settings
2. Publish the deployment
3. Add a DNS A record pointing to your server's IP
4. Wait for DNS propagation and SSL provisioning

### Notes

- Deployments published with a custom domain use root-relative asset paths. The direct URL at `/deployments/{id}/` will have broken assets — access via the custom domain instead.
- The domain is registered in the routing table on publish. If a domain is removed and republished, the routing entry is cleared.
