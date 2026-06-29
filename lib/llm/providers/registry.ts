import { ProviderId, BuiltInProviderId, ProviderConfig, ProviderModel, InputModality } from './types';
export type { OutputModality } from './types';
import { getCustomProviders } from './custom-providers';

const codexModels: ProviderModel[] = [
  {
    id: 'gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    description: 'Most capable agentic coding model',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
  {
    id: 'gpt-5.2-codex',
    name: 'GPT-5.2 Codex',
    description: 'Frontier agentic coding model',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    description: 'General purpose frontier model',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
  {
    id: 'gpt-5.1-codex',
    name: 'GPT-5.1 Codex',
    description: 'Optimized for coding tasks',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
  {
    id: 'gpt-5.1-codex-mini',
    name: 'GPT-5.1 Codex Mini',
    description: 'Fast and lightweight coding model',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    description: 'Broad world knowledge, general reasoning',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
  {
    id: 'gpt-5-codex',
    name: 'GPT-5 Codex',
    description: 'Legacy codex model',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
  {
    id: 'codex-mini-latest',
    name: 'Codex Mini',
    description: 'Fast lightweight codex model',
    contextLength: 272000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsVision: true,
  },
];

const geminiModels: ProviderModel[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Latest fast Gemini model with thinking',
    contextLength: 1048576,
    maxTokens: 65536,
    supportsFunctions: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced reasoning and analysis',
    contextLength: 1048576,
    maxTokens: 65536,
    supportsFunctions: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    description: 'Fast and versatile',
    contextLength: 1048576,
    maxTokens: 8192,
    supportsFunctions: true,
  }
];

const zhipuModels: ProviderModel[] = [
  {
    id: 'glm-5',
    name: 'GLM-5',
    description: 'Most capable GLM model for reasoning and coding',
    contextLength: 200000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsReasoning: true,
    pricing: { input: 1.00, output: 3.20 },
  },
  {
    id: 'glm-4.7',
    name: 'GLM-4.7',
    description: 'High-performance reasoning model',
    contextLength: 200000,
    maxTokens: 128000,
    supportsFunctions: true,
    supportsReasoning: true,
    pricing: { input: 0.60, output: 2.20 },
  },
  {
    id: 'glm-4.7-flash',
    name: 'GLM-4.7 Flash',
    description: 'Fast and free GLM model',
    contextLength: 200000,
    maxTokens: 128000,
    supportsFunctions: true,
    pricing: { input: 0, output: 0 },
  },
  {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    description: 'Balanced performance model',
    contextLength: 200000,
    maxTokens: 128000,
    supportsFunctions: true,
    pricing: { input: 0.60, output: 2.20 },
  },
  {
    id: 'glm-4.6v',
    name: 'GLM-4.6V',
    description: 'Vision model with tool calling support',
    contextLength: 128000,
    maxTokens: 32000,
    supportsFunctions: true,
    supportsVision: true,
    pricing: { input: 0.30, output: 0.90 },
  },
  {
    id: 'glm-4.6v-flash',
    name: 'GLM-4.6V Flash',
    description: 'Fast and free vision model',
    contextLength: 128000,
    maxTokens: 32000,
    supportsFunctions: true,
    supportsVision: true,
    pricing: { input: 0, output: 0 },
  },
];

const minimaxModels: ProviderModel[] = [
  {
    id: 'MiniMax-M2.5',
    name: 'MiniMax M2.5',
    description: 'Most capable model — coding, reasoning, and tool use',
    contextLength: 204800,
    maxTokens: 128000,
    supportsFunctions: true,
    pricing: { input: 0.30, output: 1.20 },
  },
  {
    id: 'MiniMax-M2.5-highspeed',
    name: 'MiniMax M2.5 Highspeed',
    description: 'Faster variant at ~100 tokens/sec',
    contextLength: 204800,
    maxTokens: 128000,
    supportsFunctions: true,
    pricing: { input: 0.60, output: 2.40 },
  },
  {
    id: 'MiniMax-M2.1',
    name: 'MiniMax M2.1',
    description: 'Multi-language programming with 230B params (10B active)',
    contextLength: 204800,
    maxTokens: 128000,
    supportsFunctions: true,
    pricing: { input: 0.30, output: 1.20 },
  },
  {
    id: 'MiniMax-M2.1-highspeed',
    name: 'MiniMax M2.1 Highspeed',
    description: 'Faster M2.1 variant at ~100 tokens/sec',
    contextLength: 204800,
    maxTokens: 128000,
    supportsFunctions: true,
    pricing: { input: 0.60, output: 2.40 },
  },
  {
    id: 'MiniMax-M2',
    name: 'MiniMax M2',
    description: 'Agentic model with function calling and reasoning',
    contextLength: 204800,
    maxTokens: 128000,
    supportsFunctions: true,
    pricing: { input: 0.30, output: 1.20 },
  },
];

export const providers: Record<BuiltInProviderId, ProviderConfig> = {
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'Access multiple AI models through a unified API',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-or-...',
    apiKeyHelpUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true
  },
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-5 and other OpenAI models',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-...',
    apiKeyHelpUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true
  },
  'openai-codex': {
    id: 'openai-codex',
    name: 'Codex (ChatGPT Sub)',
    description: 'Use your ChatGPT subscription — experimental, use at your own risk',
    apiKeyRequired: false,
    baseUrl: 'https://chatgpt.com/backend-api',
    models: codexModels,
    supportsFunctions: true,
    supportsStreaming: true,
    usesOAuth: true
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude Sonnet, Haiku, and Opus models',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'sk-ant-...',
    apiKeyHelpUrl: 'https://console.anthropic.com/settings/keys',
    baseUrl: 'https://api.anthropic.com/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    description: 'Ultra-fast inference with Llama and Mixtral models',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'gsk_...',
    apiKeyHelpUrl: 'https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google\'s multimodal AI models',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'AI...',
    apiKeyHelpUrl: 'https://aistudio.google.com/apikey',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: geminiModels,
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true
  },
  huggingface: {
    id: 'huggingface',
    name: 'HuggingFace',
    description: 'Free inference with your HuggingFace account',
    apiKeyRequired: false,
    apiKeyPlaceholder: 'hf_...',
    apiKeyHelpUrl: 'https://huggingface.co/settings/tokens',
    baseUrl: 'https://router.huggingface.co/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true,
    usesOAuth: true,
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    description: 'Run models locally with Ollama',
    apiKeyRequired: false,
    baseUrl: 'http://localhost:11434/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true,
    isLocal: true
  },
  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    description: 'Local model server with tool use support',
    apiKeyRequired: false,
    baseUrl: 'http://localhost:1234/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true,
    isLocal: true
  },
  llamacpp: {
    id: 'llamacpp',
    name: 'llama.cpp',
    description: 'Run GGUF models locally with llama-server',
    apiKeyRequired: false,
    baseUrl: 'http://localhost:8080/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true,
    isLocal: true
  },
  meshllm: {
    id: 'meshllm',
    name: 'mesh-llm',
    description: 'Distributed p2p inference — free open models via shared compute',
    apiKeyRequired: false,
    baseUrl: 'http://localhost:9337/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true,
    isLocal: true
  },
  sambanova: {
    id: 'sambanova',
    name: 'SambaNova',
    description: 'High-performance AI chips for inference',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'SambaNova API Key',
    apiKeyHelpUrl: 'https://cloud.sambanova.ai/apis',
    baseUrl: 'https://api.sambanova.ai/v1',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax',
    description: 'MiniMax M2 models for coding and reasoning',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'Your MiniMax API Key',
    apiKeyHelpUrl: 'https://platform.minimax.io/user-center/basic-information/interface-key',
    baseUrl: 'https://api.minimax.io/v1',
    models: minimaxModels,
    supportsModelDiscovery: false,
    supportsFunctions: true,
    supportsStreaming: true
  },
  zhipu: {
    id: 'zhipu',
    name: 'Zhipu AI',
    description: 'GLM models for reasoning, coding, and vision',
    apiKeyRequired: true,
    apiKeyPlaceholder: 'Your Zhipu AI API Key',
    apiKeyHelpUrl: 'https://z.ai/subscribe',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    models: zhipuModels,
    supportsModelDiscovery: false,
    supportsFunctions: true,
    supportsStreaming: true
  },
};

export function getProvider(id: ProviderId): ProviderConfig {
  const builtIn = providers[id as BuiltInProviderId];
  if (builtIn) return builtIn;

  const custom = getCustomProviders()[id];
  if (custom) return custom;

  // Fallback for unknown provider IDs: treat as a generic OpenAI-compatible endpoint.
  return {
    id,
    name: id,
    description: '',
    apiKeyRequired: true,
    baseUrl: '',
    supportsModelDiscovery: true,
    supportsFunctions: true,
    supportsStreaming: true,
  };
}

export type ProviderArchetype = 'aggregator' | 'cloud' | 'subscription' | 'local' | 'custom';

export function getProviderArchetype(id: ProviderId): ProviderArchetype {
  if (id === 'openrouter') return 'aggregator';
  const cfg = getProvider(id);
  if (getCustomProviders()[id]) return 'custom';
  if (cfg.isLocal) return 'local';
  if (id === 'openai-codex') return 'subscription';
  return 'cloud';
}

export function getAllProviders(): ProviderConfig[] {
  return [...Object.values(providers), ...Object.values(getCustomProviders())];
}

export function getDefaultModel(provider: ProviderId): string {
  // Custom providers have no built-in default; the user must select a model.
  if (getCustomProviders()[provider]) return '';

  switch (provider) {
    case 'openrouter':
      return 'minimax/minimax-m2.7';
    case 'openai':
      return 'gpt-4o-mini';
    case 'openai-codex':
      return 'gpt-5.3-codex';
    case 'anthropic':
      return 'claude-haiku-4-5-20251001';
    case 'groq':
      return 'llama-3.3-70b-versatile';
    case 'gemini':
      return 'gemini-2.5-flash';
    case 'huggingface':
      return 'Qwen/Qwen2.5-Coder-32B-Instruct';
    case 'ollama':
      return 'llama3.2:latest';
    case 'lmstudio':
      return 'qwen/qwen3-4b-thinking-2507';
    case 'llamacpp':
      return 'local-model';
    case 'sambanova':
      return 'Meta-Llama-3.3-70B-Instruct';
    case 'zhipu':
      return 'glm-5';
    case 'minimax':
      return 'MiniMax-M2.7';
    default:
      return 'minimax/minimax-m2.7';
  }
}

/**
 * Get input modalities for a model from explicit data only.
 * Checks inputModalities (from API discovery) or supportsVision (hardcoded registry models).
 * Returns ['text'] when no capability data is available — no heuristics.
 */
export function getModelInputModalities(providerId: ProviderId, modelId: string): InputModality[] {
  const provider = getProvider(providerId);

  if (provider.models) {
    const model = provider.models.find(m => m.id === modelId);
    if (model?.inputModalities) return model.inputModalities;
    if (model?.supportsVision) return ['text', 'image'];
    if (model?.supportsVision === false) return ['text'];
  }

  return ['text'];
}

export function modelSupportsVision(providerId: ProviderId, modelId: string): boolean {
  return getModelInputModalities(providerId, modelId).includes('image');
}

/**
 * Get the context length for a specific model from the provider registry.
 * Returns undefined if the model isn't in the registry (dynamically discovered).
 */
export function getModelContextLength(providerId: ProviderId, modelId: string): number | undefined {
  const provider = getProvider(providerId);
  if (!provider?.models) return undefined;
  const model = provider.models.find(m => m.id === modelId);
  return model?.contextLength;
}
