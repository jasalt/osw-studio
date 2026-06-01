# Custom Domains

## Setup (2 steps)

1. In OSW Studio, go to Deployment Settings and enter your domain (e.g., `sweetcandies.com`)
2. In your DNS provider, add an A record pointing to your OSW Studio server's IP address

That's it. The server handles SSL certificates automatically via Let's Encrypt.

## How It Works

When you publish a deployment with a custom domain:

1. OSW Studio registers the domain in its routing table
2. The reverse proxy (Caddy) intercepts requests to your domain
3. Caddy provisions an SSL certificate automatically (on-demand TLS)
4. Requests are routed to your deployment's static files
5. `/api/` paths (edge functions, analytics) pass through without rewriting

## What OSW Studio Handles

- Domain registration in the routing table
- Root-relative asset paths when a custom domain is set
- SEO meta tags, sitemaps, and canonical URLs using your domain
- Analytics origin validation for your domain

## What OSW Studio Does Not Handle

- DNS configuration (you add the A record)
- SSL certificates (Caddy handles this automatically)
- Domain purchase or registration

## For Self-Hosted Instances

Your OSW Studio instance needs a reverse proxy with TLS support. See `docs/SELF_HOSTED_DOMAINS.md` for API endpoints and proxy requirements.

## For Hosted Instances (oswstudio.com)

Custom domains are handled automatically by the platform. Just add your DNS A record.

## Troubleshooting

**Site not loading after adding DNS**
- DNS propagation can take up to 48 hours (usually minutes)
- Verify your A record: `dig sweetcandies.com` should show the server IP
- The first request may take a few seconds while the SSL certificate is provisioned

**SSL certificate not working**
- Ensure your DNS A record points directly to the server IP (not through a proxy)
- Caddy needs port 80 and 443 open for Let's Encrypt HTTP-01 challenges

**Assets loading from wrong path**
- Republish your deployment after setting the custom domain
- The asset path rewriting only takes effect on publish
