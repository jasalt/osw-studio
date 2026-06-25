/**
 * Audio transcription via a chat model that accepts audio input.
 *
 * Used by the voice-input flow when the project's voiceInput slot points at a
 * model that is NOT the agent model: the clip is transcribed to text first, and
 * the text (not the audio) is added to the message. Reuses the non-streaming
 * `/api/generate` path, the same one `skill-evaluator` uses.
 */

import type { ModelRef } from '@/lib/llm/models/assignment';
import { configManager } from '@/lib/config/storage';
import { apiFetch } from '@/lib/api/backend-status';
import { logger } from '@/lib/utils';

const TRANSCRIBE_INSTRUCTION =
  'Transcribe the following audio recording verbatim. Output only the transcribed text, with no preamble, commentary, or quotation marks. If there is no discernible speech, output nothing.';

/**
 * Transcribe a recorded clip using the given model. Throws on failure so the
 * caller can surface a toast and let the user retry or send the clip as-is.
 */
export async function transcribeAudio(clip: { data: string; format: string }, ref: ModelRef): Promise<string> {
  const apiKey = configManager.getProviderApiKey(ref.provider);

  const response = await apiFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: ref.provider,
      apiKey,
      model: ref.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: TRANSCRIBE_INSTRUCTION },
            { type: 'input_audio', input_audio: { data: clip.data, format: clip.format } },
          ],
        },
      ],
      stream: false,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const err = await response.json();
      detail = err?.error || '';
    } catch { /* ignore */ }
    logger.warn('[transcribe] request failed', response.status, detail);
    throw new Error(detail || `Transcription failed (${response.status})`);
  }

  const data = await response.json();
  const text: string =
    data?.choices?.[0]?.message?.content ||
    data?.content?.[0]?.text ||
    '';

  return typeof text === 'string' ? text.trim() : '';
}
