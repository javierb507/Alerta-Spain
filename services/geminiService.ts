import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AlertEvent, SeverityLevel, SourceType } from "../types";

const apiKey = process.env.API_KEY || ''; // Injected by environment

const ai = new GoogleGenAI({ apiKey });

const eventSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    events: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Título corto del evento en Español" },
          description: { type: Type.STRING, description: "Resumen detallado de lo que está ocurriendo en Español" },
          severity: { type: Type.STRING, enum: [SeverityLevel.CRITICAL, SeverityLevel.WARNING, SeverityLevel.INFO, SeverityLevel.SAFE] },
          category: { type: Type.STRING, description: "Categoría en una palabra: Incendio, Clima, Protesta, Tráfico, Seguridad, Salud, Otro" },
          sourceName: { type: Type.STRING, description: "Nombre de la fuente principal (ej. AEMET, Usuario Twitter, El País)" },
          sourceType: { type: Type.STRING, enum: [SourceType.OFFICIAL, SourceType.NEWS, SourceType.SOCIAL] },
          timeInfo: { type: Type.STRING, description: "Cuándo ocurrió (ej. 'hace 10 min', '1 Ago 14:00')" }
        },
        required: ["title", "description", "severity", "category", "sourceName", "sourceType", "timeInfo"]
      }
    },
    riskAnalysis: { type: Type.STRING, description: "Un breve resumen de 1 oración sobre el nivel general de seguridad para el usuario en Español." }
  },
  required: ["events", "riskAnalysis"]
};

export const fetchAlerts = async (
  location: string, 
  date?: string, 
  radius?: number, 
  categoryFilter?: string
): Promise<{ events: AlertEvent[], analysis: string }> => {
  const isHistorical = !!date;
  const radiusContext = radius ? ` en un radio de ${radius} kilómetros alrededor` : '';
  const categoryContext = categoryFilter && categoryFilter !== 'TODAS' 
    ? ` Céntrate EXCLUSIVAMENTE en eventos relacionados con la categoría: "${categoryFilter}" (ej. ES-Alert, Emergencias, Incendios, etc).` 
    : '';
  
  const systemInstruction = `
    Eres un sistema avanzado de inteligencia de emergencias para España, "Alerta Local".
    Tu trabajo es analizar eventos actuales o pasados en una ubicación específica buscando en la web, noticias y redes sociales.
    
    Región Objetivo: España (Exclusivamente).
    Contexto Geográfico: ${location}${radiusContext}.
    Modo: ${isHistorical ? `Archivo Histórico (Fecha: ${date})` : 'Monitoreo en Tiempo Real'}.
    ${categoryContext}
    
    Prioriza:
    1. Fuentes OFICIALES: AEMET (Clima), DGT (Tráfico), Policía, Guardia Civil, 112, Ayuntamientos, Protección Civil, ES-Alert.
    2. Noticias: Periódicos locales y nacionales (El País, El Mundo, prensa local).
    3. Señales SOCIALES: Tendencias en redes que indiquen disturbios, incendios, accidentes o quejas ciudadanas.

    Clasifica la 'severidad' estrictamente:
    - CRITICAL: Amenaza la vida (Inundaciones, incendios mayores, disturbios violentos, terrorismo, alertas rojas AEMET).
    - WARNING: Disrupción significativa (Alertas de lluvia intensa, protestas, accidentes de tráfico graves).
    - INFO: Actualizaciones generales, retrasos menores, obras, eventos culturales.
    - SAFE: No se encontraron problemas importantes (indica explícitamente si el área está tranquila).

    IDIOMA: Todo el contenido generado (título, descripción, análisis) DEBE estar en ESPAÑOL.

    Si no se encuentran eventos, devuelve un evento SAFE indicando "No se reportan incidentes significativos".
  `;

  const userPrompt = isHistorical 
    ? `Busca eventos que ocurrieron en ${location} el día ${date}. Busca en archivos de noticias, publicaciones de redes sociales de esa fecha e informes oficiales.${categoryContext}`
    : `Encuentra emergencias EN VIVO, advertencias o noticias de última hora en ${location}${radiusContext} ahora mismo. Revisa AEMET para el clima, DGT para el tráfico y busca conversaciones recientes en redes sociales sobre incidentes.${categoryContext}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: userPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: eventSchema,
        systemInstruction: systemInstruction,
      },
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");

    const parsedData = JSON.parse(resultText);
    
    // Process grounding chunks to attach real URLs if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    const events: AlertEvent[] = parsedData.events.map((evt: any, index: number) => {
      // Attempt to find a relevant link from grounding chunks
      let relevantLink = '';
      if (groundingChunks.length > 0) {
        // Simple heuristic
        const chunk = groundingChunks[index % groundingChunks.length];
        if (chunk?.web?.uri) {
            relevantLink = chunk.web.uri;
        }
      }

      // Generate a deterministic ID based on content
      const idString = `${evt.title}-${evt.timeInfo}-${location}`;
      let hash = 0;
      for (let i = 0; i < idString.length; i++) {
        const char = idString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      const deterministicId = `evt-${Math.abs(hash)}`;

      return {
        id: deterministicId,
        title: evt.title,
        description: evt.description,
        location: location,
        timestamp: evt.timeInfo,
        severity: evt.severity as SeverityLevel,
        category: evt.category,
        isHistorical: isHistorical,
        sources: [{
          name: evt.sourceName,
          type: evt.sourceType as SourceType,
          url: relevantLink
        }]
      };
    });

    return {
      events,
      analysis: parsedData.riskAnalysis || "Análisis completo."
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      events: [{
        id: 'error-offline',
        title: 'Sistema Desconectado',
        description: 'No se pueden recuperar datos en este momento. Por favor verifique la conexión.',
        location: location,
        timestamp: 'Ahora',
        severity: SeverityLevel.INFO,
        category: 'Sistema',
        sources: []
      }],
      analysis: "El sistema no pudo realizar el análisis."
    };
  }
};