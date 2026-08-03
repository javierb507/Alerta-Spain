
// Capa de búsqueda web: obtiene información bruta de incidentes con fuentes.
// Proveedor 1: Gemini con Google Search grounding (requiere clave Gemini con facturación).
// Proveedor 2: Tavily (free tier, URLs reales directas).
import { GoogleGenAI } from "@google/genai";
import { AIConfig, SHARED_PROXY_URL } from "./config";

export interface SearchSource {
  id: number;
  title: string;
  uri: string;
}

export interface SharedQuota {
  used: number;
  limit: number;
  remaining: number;
}

export interface SearchResult {
  rawInfo: string;
  sources: SearchSource[];
  provider: 'gemini' | 'tavily' | 'shared';
  quota?: SharedQuota; // solo en modo compartido con límite por IP activo
}

// Modo servidor compartido: la búsqueda la hace el proxy con su clave (config.ts, issue #16).
const searchViaProxy = async (query: string): Promise<SearchResult> => {
  const res = await fetch(`${SHARED_PROXY_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    // Límite diario del servidor compartido alcanzado: mensaje claro que invita a usar clave propia.
    if (res.status === 429 || data.error === 'LIMIT_REACHED') {
      throw new Error('SHARED_LIMIT_REACHED');
    }
    throw new Error(data.error || `proxy search ${res.status}`);
  }
  return { rawInfo: data.rawInfo || '', sources: data.sources || [], provider: 'shared', quota: data.quota };
};

const isQuotaOrMissingModel = (e: unknown) =>
  e instanceof Error && (
    e.message.includes('RESOURCE_EXHAUSTED') || e.message.includes('429') ||
    e.message.includes('NOT_FOUND') || e.message.includes('404')
  );

const GROUNDING_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest'];

const searchWithGemini = async (query: string, apiKey: string): Promise<SearchResult> => {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: unknown;
  for (const model of GROUNDING_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: query,
        config: { tools: [{ googleSearch: {} }] },
      });
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk, index) => ({
          id: index,
          title: chunk.web?.title || "Enlace de interés",
          uri: chunk.web?.uri || ""
        }))
        .filter(s => s.uri && !s.uri.includes('google.com/search') && !s.uri.includes('aistudio.google.com')) || [];
      return { rawInfo: response.text || "", sources, provider: 'gemini' };
    } catch (e) {
      lastError = e;
      if (!isQuotaOrMissingModel(e)) throw e;
      console.warn(`Grounding con ${model} no disponible, probando siguiente...`);
    }
  }
  throw lastError;
};

const searchWithTavily = async (query: string, apiKey: string): Promise<SearchResult> => {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      search_depth: 'advanced',
      max_results: 10,
      days: 2,
      topic: 'news',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tavily ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const results: any[] = data.results || [];
  const sources = results.map((r, index) => ({
    id: index,
    title: r.title || r.url || "Fuente",
    uri: r.url || ""
  }));
  const rawInfo = results
    .map((r, i) => `[Fuente ${i}] ${r.title}\n${r.content}`)
    .join('\n\n');
  return { rawInfo, sources, provider: 'tavily' };
};

/**
 * Busca incidentes con el primer proveedor disponible: Gemini grounding → Tavily.
 */
export const searchIncidents = async (query: string, config: AIConfig): Promise<SearchResult> => {
  const errors: string[] = [];

  if (config.apiMode === 'shared' && SHARED_PROXY_URL) {
    return searchViaProxy(query);
  }

  if (config.geminiApiKey) {
    try {
      return await searchWithGemini(query, config.geminiApiKey);
    } catch (e) {
      errors.push(`Gemini: ${e instanceof Error ? e.message.slice(0, 150) : e}`);
    }
  }

  if (config.tavilyApiKey) {
    try {
      return await searchWithTavily(query, config.tavilyApiKey);
    } catch (e) {
      errors.push(`Tavily: ${e instanceof Error ? e.message.slice(0, 150) : e}`);
    }
  }

  if (errors.length === 0) {
    throw new Error("NO_SEARCH_KEY");
  }
  throw new Error(`SEARCH_FAILED: ${errors.join(' | ')}`);
};
