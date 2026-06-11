/**
 * Reasoning replay policy — decides how previous-turn reasoning is sent back
 * to providers in multi-turn conversation history.
 *
 * Model families differ on this and getting it wrong breaks them in opposite
 * ways:
 *  - DeepSeek (V4 thinking), GLM/Zhipu, and MiniMax REQUIRE prior reasoning
 *    passed back as `reasoning_content` on assistant messages — DeepSeek V4
 *    returns 400 without it.
 *  - Qwen3's chat template specifies that previous-turn thinking must NOT be
 *    included in history. Sending `reasoning_content` back produces a
 *    non-standard template rendering that can break the upstream tool-call
 *    parser on every subsequent turn (observed with qwen3.6 via OpenRouter).
 *
 * For non-replay models, reasoning-ONLY turns (no content, no tool calls) are
 * promoted to plain assistant content: the model still sees what it thought —
 * without it, the turn would render as an empty assistant message. Inside
 * OSWS the message keeps its reasoning_details and renders as a reasoning
 * block; the promotion only happens at the provider boundary.
 */

export interface ReplayMessage {
  role: string;
  content?: unknown;
  tool_calls?: unknown[];
  reasoning_details?: Array<{ text?: string }>;
  reasoning_content?: string;
}

const REASONING_REPLAY_MODEL_RE = /deepseek|glm|zhipu|minimax/i;

/** Whether this model family requires prior reasoning replayed as reasoning_content. */
export function requiresReasoningReplay(model: string): boolean {
  return REASONING_REPLAY_MODEL_RE.test(model);
}

function isEmptyContent(content: unknown): boolean {
  if (content == null) return true;
  if (typeof content === 'string') return content.trim() === '';
  if (Array.isArray(content)) return content.length === 0;
  return false;
}

/**
 * Apply the replay policy in place to an outgoing message array.
 * Always removes `reasoning_details` (an internal OSWS field).
 */
export function applyReasoningReplayPolicy(messages: ReplayMessage[], model: string): void {
  const replay = requiresReasoningReplay(model);

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.reasoning_details?.length) continue;

    const reasoningText = msg.reasoning_details
      .filter(rd => rd.text)
      .map(rd => rd.text)
      .join('');

    if (replay) {
      if (reasoningText) {
        msg.reasoning_content = reasoningText;
      }
    } else if (reasoningText && !msg.tool_calls?.length && isEmptyContent(msg.content)) {
      // Reasoning-only turn: promote the thinking to visible content so the
      // model sees its own prior attempt instead of an empty assistant turn.
      msg.content = reasoningText;
    }

    delete msg.reasoning_details;
  }
}
