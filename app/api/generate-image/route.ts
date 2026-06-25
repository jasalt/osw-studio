import { NextRequest, NextResponse } from 'next/server';
import { ProviderId } from '@/lib/llm/providers/types';
import { getProvider } from '@/lib/llm/providers/registry';

/**
 * Image generation via an OpenAI-compatible chat-completions endpoint with the
 * `modalities: ["image"]` extension (OpenRouter and compatible providers). The
 * generated image comes back at choices[0].message.images[0].image_url.url as a
 * base64 data URL, which we return verbatim for the caller to decode and store.
 */
export async function POST(request: NextRequest) {
  try {
    const { provider, apiKey, model, prompt, image_config, modalities } = await request.json();

    if (!model || !prompt) {
      return NextResponse.json({ error: 'model and prompt are required' }, { status: 400 });
    }

    const selectedProvider: ProviderId = provider || 'openrouter';
    const providerConfig = getProvider(selectedProvider);
    if (providerConfig.apiKeyRequired && !apiKey && !providerConfig.usesOAuth) {
      return NextResponse.json(
        { error: `${providerConfig.name} API key is required. Set it in settings.` },
        { status: 400 },
      );
    }

    const baseUrl = providerConfig.baseUrl || 'https://openrouter.ai/api/v1';
    const endpoint = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    // Request the model's actual output modalities. Image-only models (FLUX,
    // Seedream, Grok Imagine, GPT Image) reject 'text' with "No endpoints found
    // that support the requested output modalities"; multimodal models (Gemini)
    // require 'text' alongside 'image'. The caller passes the model's declared
    // modalities; fall back to image-only when unknown.
    const requestedModalities =
      Array.isArray(modalities) && modalities.length > 0 ? modalities : ['image'];

    const body: {
      model: string;
      messages: { role: string; content: string }[];
      modalities: string[];
      image_config?: Record<string, unknown>;
    } = {
      model,
      messages: [{ role: 'user', content: prompt }],
      modalities: requestedModalities,
    };
    if (image_config && typeof image_config === 'object' && Object.keys(image_config).length > 0) {
      body.image_config = image_config;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const err = await response.json();
        detail = err?.error?.message || err?.error || '';
      } catch { /* ignore */ }
      return NextResponse.json(
        { error: detail || `${providerConfig.name} image request failed (${response.status})` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const message = data?.choices?.[0]?.message;
    const url: string | undefined = message?.images?.[0]?.image_url?.url;

    if (!url) {
      // The model may have replied with text (e.g. a refusal) instead of an image.
      const text = typeof message?.content === 'string' ? message.content.trim() : '';
      return NextResponse.json(
        { error: text ? `Model returned text instead of an image: ${text.slice(0, 300)}` : 'Model returned no image' },
        { status: 422 },
      );
    }

    return NextResponse.json({ image: url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Image generation failed' },
      { status: 500 },
    );
  }
}
