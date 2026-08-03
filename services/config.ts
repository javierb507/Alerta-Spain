
// Configuración de proveedores de IA y búsqueda.
// Prioridad: localStorage (ajustes del usuario en la app) > variables de entorno de build.
// Guardar las claves en el dispositivo del usuario evita incrustarlas en el bundle desplegado.

export interface LLMProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  supportsJsonMode: boolean;
  /** Qué da su plan gratuito, en consultas reales de esta app */
  freeNote?: string;
}

export const LLM_PRESETS: LLMProviderPreset[] = [
  // Medido: una consulta gasta ~2.250 tokens de entrada y ~1.700 de salida por fase.
  // Se prefieren modelos cuyo free tier aguante uso diario real (ver notas de cada uno).
  { id: 'groq', name: 'Groq · gratis, sin tarjeta', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.1-8b-instant', supportsJsonMode: true, freeNote: '500K tokens/día · ~60 consultas' },
  { id: 'groq-70b', name: 'Groq 70B · gratis, más preciso', baseUrl: 'https://api.groq.com/openai/v1', defaultModel: 'llama-3.3-70b-versatile', supportsJsonMode: true, freeNote: '100K tokens/día · ~12 consultas' },
  { id: 'gemini', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', defaultModel: 'gemini-3.6-flash', supportsJsonMode: true, freeNote: 'free tier amplio · el más preciso' },
  { id: 'openrouter', name: 'OpenRouter · modelos gratis', baseUrl: 'https://openrouter.ai/api/v1', defaultModel: 'meta-llama/llama-3.3-70b-instruct:free', supportsJsonMode: false, freeNote: '50 peticiones/día · ~25 consultas' },
  { id: 'cerebras', name: 'Cerebras', baseUrl: 'https://api.cerebras.ai/v1', defaultModel: 'gpt-oss-120b', supportsJsonMode: true, freeNote: 'prueba de 30 días, pide tarjeta' },
  { id: 'minimax', name: 'MiniMax', baseUrl: 'https://api.minimax.io/v1', defaultModel: 'MiniMax-M2', supportsJsonMode: false },
  { id: 'custom', name: 'Personalizado (OpenAI-compatible)', baseUrl: '', defaultModel: '', supportsJsonMode: false },
];

export const getPreset = (id: string): LLMProviderPreset =>
  LLM_PRESETS.find(p => p.id === id) || LLM_PRESETS[LLM_PRESETS.length - 1];

/**
 * Origen de las claves de IA:
 * - `own`: cada usuario introduce las suyas (por defecto; nada sale del dispositivo)
 * - `shared`: proxy del servidor con clave compartida y cuota limitada (requiere el
 *   Worker del issue #16; una clave nunca puede viajar al navegador de forma segura)
 */
export type ApiMode = 'own' | 'shared';

export interface AIConfig {
  apiMode: ApiMode;
  llmPreset: string;      // id del preset
  llmBaseUrl: string;
  llmModel: string;
  llmApiKey: string;
  geminiApiKey: string;   // para búsqueda con Google Search grounding
  tavilyApiKey: string;   // para búsqueda alternativa
}

/** URL del proxy compartido; vacío mientras no exista el Worker. */
export const SHARED_PROXY_URL = '';
export const sharedModeAvailable = (): boolean => SHARED_PROXY_URL !== '';

const STORAGE_KEY = 'ai_config';

const envGeminiKey = (typeof process !== 'undefined' && process.env?.API_KEY) || '';

// Con clave de entorno (desarrollo) el proveedor por defecto es Gemini, que es a
// quien pertenece esa clave. Sin ella, se arranca en el primer preset gratuito.
const defaultPreset = getPreset(envGeminiKey ? 'gemini' : LLM_PRESETS[0].id);

const DEFAULTS: AIConfig = {
  apiMode: 'own',
  llmPreset: defaultPreset.id,
  llmBaseUrl: defaultPreset.baseUrl,
  llmModel: defaultPreset.defaultModel,
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

