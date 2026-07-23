
// Orquestación del pipeline de alertas, agnóstica de proveedor:
// 1. Búsqueda web (searchService: Gemini grounding → Tavily)
// 2. Estructuración con el LLM configurado (llmService: cualquier endpoint OpenAI-compatible)
import { AlertEvent, SeverityLevel, SourceType, CustomSource } from "../types";
import { loadConfig } from "./config";
import { searchIncidents } from "./searchService";
import { chatJSON } from "./llmService";

export const fetchAlerts = async (
  location: string,
  date?: string,
  radius?: number,
  categoryFilter?: string,
  customSources: CustomSource[] = []
): Promise<{ events: AlertEvent[], analysis: string }> => {
  const config = loadConfig();
  const isHistorical = !!date;
  const radiusContext = radius ? ` en un radio de ${radius} kilómetros` : '';
  const categoryContext = categoryFilter && categoryFilter !== 'TODAS'
    ? ` filtrando por la categoría "${categoryFilter}"`
    : '';

  const customSourcesContext = customSources.length > 0
    ? ` Además de las fuentes habituales, presta especial atención a estas fuentes locales configuradas por el usuario: ${customSources.map(s => `${s.name} (${s.url})`).join(', ')}.`
    : '';

  const searchQuery = isHistorical
    ? `Busca reportes de emergencias, incidencias ferroviarias (Renfe, ADIF), metro, tráfico, incendios y alertas climáticas en ${location}${radiusContext} el día ${date}${categoryContext}. Cita fuentes oficiales españolas.${customSourcesContext}`
    : `Detecta alertas ACTIVAS de AEMET, DGT, Renfe, ADIF, Metro, incendios y emergencias 112 en ${location}${radiusContext} AHORA. Prioriza fuentes oficiales como Renfe, Metro, ADIF y servicios de emergencia nacionales.${customSourcesContext}`;

  try {
    const search = await searchIncidents(searchQuery, config);

    const structuringPrompt = `
Actúa como un analista de emergencias y transporte para España.
INFORMACIÓN DE BÚSQUEDA: ${search.rawInfo}
LISTA DE FUENTES DISPONIBLES:
${search.sources.map((s) => `[ID:${s.id}] ${s.title}: ${s.uri}`).join('\n')}

REGLAS:
1. Extrae eventos de seguridad, clima, tráfico y transporte público (Renfe, Metro, ADIF, Autobuses) para la zona de ${location}.
2. Clasifica correctamente como 'Transporte', 'Clima', 'Tráfico', 'Incendio', etc.
3. Asocia sourceIndex de la lista de fuentes.
4. severity debe ser uno de: CRITICAL, WARNING, INFO, SAFE.

Responde SOLO con un objeto JSON con esta estructura exacta, sin texto adicional:
{
  "events": [
    { "title": "...", "description": "...", "severity": "CRITICAL|WARNING|INFO|SAFE", "category": "...", "sourceName": "...", "sourceIndex": 0, "timeInfo": "..." }
  ],
  "riskAnalysis": "análisis de riesgo en 2-4 frases"
}`;

    const parsedData = await chatJSON(structuringPrompt, config);

    const events: AlertEvent[] = (parsedData.events || []).map((evt: any) => {
      // ID estable entre refrescos: timeInfo lo redacta el modelo y varía ("hace 5 min" → "hace 6 min"),
      // lo que causaba notificaciones duplicadas de la misma alerta.
      const idString = `${evt.title}-${evt.category}-${location}`;
      let hash = 0;
      for (let i = 0; i < idString.length; i++) {
        hash = ((hash << 5) - hash) + idString.charCodeAt(i);
        hash |= 0;
      }

      const sourceFromList = search.sources.find(s => s.id === evt.sourceIndex);
      const finalUrl = sourceFromList ? sourceFromList.uri : "";
      // Las URIs de grounding de Gemini son redirects (vertexaisearch...); el dominio real
      // viene en el título del chunk. Las de Tavily son URLs directas.
      const sourceTitle = sourceFromList ? sourceFromList.title.toLowerCase() : "";

      const customKeywords = customSources.map(s => s.url.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]).filter(Boolean);
      const officialKeywords = ['gob.es', 'aemet.es', 'dgt.es', 'renfe.com', 'adif.es', 'metro', 'emt', ...customKeywords];
      const isOfficial = officialKeywords.some(kw => finalUrl.toLowerCase().includes(kw) || sourceTitle.includes(kw)) || (evt.sourceName || '').toLowerCase().includes('112') || (evt.sourceName || '').toLowerCase().includes('oficial');

      return {
        id: `evt-${Math.abs(hash)}`,
        title: evt.title,
        description: evt.description,
        location: location,
        timestamp: evt.timeInfo,
        severity: evt.severity as SeverityLevel,
        category: evt.category,
        isHistorical: isHistorical,
        sources: [{
          name: evt.sourceName || (sourceFromList ? sourceFromList.title : "Fuente de información"),
          type: isOfficial ? SourceType.OFFICIAL : SourceType.NEWS,
          url: finalUrl
        }]
      };
    });

    return { events, analysis: parsedData.riskAnalysis || "Informe generado correctamente." };
  } catch (error) {
    console.error("fetchAlerts Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('NO_SEARCH_KEY')) {
      return { events: [], analysis: "Sin proveedor de búsqueda configurado. Añade una clave de Gemini o de Tavily en Ajustes." };
    }
    if (msg.includes('NO_LLM_KEY')) {
      return { events: [], analysis: "Sin proveedor de IA configurado. Añade una clave de API en Ajustes." };
    }
    if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
      return { events: [], analysis: "Cuota de API agotada (créditos o límite de peticiones). Revisa tu proveedor o configura uno alternativo en Ajustes." };
    }
    if (msg.includes('API key') || msg.includes('PERMISSION_DENIED') || msg.includes('401') || msg.includes('403')) {
      return { events: [], analysis: "Clave de API inválida o sin permisos. Revísala en Ajustes." };
    }
    return { events: [], analysis: "Error de sincronización con las fuentes de datos." };
  }
};
