import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    oauthAvailable: !!process.env.OAUTH_CLIENT_ID,
    // OAuth client IDs are public by design — they're visible in the auth URL
    clientId: process.env.OAUTH_CLIENT_ID || null,
    scopes: process.env.OAUTH_SCOPES || 'openid profile inference-api contribute-repos',
    // Remote/HF deployments use Pi's manual redirect-URL fallback.
    codexAvailable: true,
  });
}
