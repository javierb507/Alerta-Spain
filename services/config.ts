
// Configuración de proveedores de IA y búsqueda.
// Prioridad: localStorage (ajustes del usuario en la app) > variables de entorno de build.
// Guardar las claves en el dispositivo del usuario evita incrustarlas en el bundle desplegado.

export interface LLMProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  supportsJsonMode: boolean;
}

export const LLM_PRESETS: LLMProviderPreset[] = [
  { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-3.6-flash', supportsJsonMode: true },
  { id: 'groq', name: 'Groq (gratis)', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', supportsJsonMode: true },
  { id: 'openrouter', name: 'OpenRouter (modelos gratis)', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free', supportsJsonMode: false },
  { id: 'cerebras', name: 'Cerebras (gratis)', baseUrl: 'https://api.cerebras.ai/v1', defaultModel: 'llama-3.3-70b', supportsJsonMode: true },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.io/v1', defaultModel: 'MiniMax-M2', supportsJsonMode: false },
  { id: 'custom', name: 'Personalizado (OpenAI-compatible)', baseUrl: '', defaultModel: '', supportsJsonMode: false },
];

export interface AIConfig {
  llmPreset: string;      // id del preset
  llmBaseUrl: string;
  llmModel: string;
  llmApiKey: string;
  geminiApiKey: string;   // para búsqueda con Google Search grounding
  tavilyApiKey: string;   // para búsqueda alternativa
}

const STORAGE_KEY = 'ai_config';

const envGeminiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || '';

const DEFAULTS: AIConfig = {
  llmPreset: 'gemini',
  llmBaseUrl: LLM_PRESETS[0].baseUrl,
  llmModel: LLM_PRESETS[0].defaultModel,
  llmApiKey: envGeminiKey,
  geminiApiKey: envGeminiKey,
  tavilyApiKey: '',
};

export const loadConfig = (): AIConfig => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
  } catch { /* localStorage corrupto o inaccesible: usar defaults */ }
  return { ...DEFAULTS };
};

export const saveConfig = (config: AIConfig) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

export const getPreset = (id: string): LLMProviderPreset =>
  LLM_PRESETS.find(p => p.id === id) || LLM_PRESETS[LLM_PRESETS.length - 1];
