
// Prueba real de las claves configuradas: una llamada mínima por proveedor.
// El test de búsqueda consume ~1 crédito/búsqueda del proveedor; se lanza solo
// cuando el usuario pulsa "Probar conexión".
import { GoogleGenAI } from "@google/genai";
import { AIConfig, getPreset } from "./config";

export interface TestResult {
  name: string;
  ok: boolean;
  detail: string;
}

const shortError = (e: unknown): string => {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) return "Cuota agotada o sin facturación";
  if (msg.includes('401') || msg.includes('403') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) return "Clave inválida";
  if (msg.includes('404') || msg.includes('NOT_FOUND')) return "Modelo no disponible";
  if (msg.includes('Failed to fetch')) return "Sin conexión";
  return msg.slice(0, 80);
};

const testLLM = async (config: AIConfig): Promise<TestResult> => {
  const name = `IA (${getPreset(config.llmPreset).name})`;
  if (!config.llmApiKey) return { name, ok: false, detail: "Sin clave configurada" };
  try {
    const preset = getPreset(config.llmPreset);
    const res = await fetch(`${config.llmBaseUrl || preset.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.llmApiKey}` },
      body: JSON.stringify({
        model: config.llmModel || preset.defaultModel,
        messages: [{ role: 'user', content: 'Di OK' }],
        max_tokens: 5,
      }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return { name, ok: true, detail: `Modelo ${config.llmModel} responde` };
  } catch (e) {
    return { name, ok: false, detail: shortError(e) };
  }
};

const testGeminiSearch = async (config: AIConfig): Promise<TestResult> => {
  const name = "Búsqueda Gemini (grounding)";
  if (!config.geminiApiKey) return { name, ok: false, detail: "Sin clave configurada" };
  try {
    const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });
    await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: '¿Qué día es hoy en España?',
      config: { tools: [{ googleSearch: {} }] },
    });
    return { name, ok: true, detail: "Búsqueda con grounding operativa" };
  } catch (e) {
    return { name, ok: false, detail: shortError(e) };
  }
};

const testTavily = async (config: AIConfig): Promise<TestResult> => {
  const name = "Búsqueda Tavily";
  if (!config.tavilyApiKey) return { name, ok: false, detail: "Sin clave configurada" };
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.tavilyApiKey}` },
      body: JSON.stringify({ query: 'test', max_results: 1 }),
    });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return { name, ok: true, detail: "Búsqueda operativa" };
  } catch (e) {
    return { name, ok: false, detail: shortError(e) };
  }
};

export const testConnections = async (config: AIConfig): Promise<TestResult[]> => {
  return Promise.all([testLLM(config), testGeminiSearch(config), testTavily(config)]);
};
