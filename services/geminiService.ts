
import { GoogleGenAI, Type } from "@google/genai";
import { AlertEvent, SeverityLevel, SourceType, QuickStatus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Obtiene un resumen rápido de clima y tráfico. 
 * Si se pasan coordenadas, la búsqueda es mucho más precisa.
 */
export const fetchQuickStatus = async (location: string = "España", coords?: {lat: number, lng: number}): Promise<QuickStatus> => {
  const locationContext = coords 
    ? `en las coordenadas ${coords.lat}, ${coords.lng} (cerca de ${location})`
    : `en ${location}`;

  const prompt = `Proporciona un resumen táctico y ultra-breve del clima y tráfico ${locationContext}. 
  Busca datos reales de AEMET y DGT. 
  Responde estrictamente en formato JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            weather: {
              type: Type.OBJECT,
              properties: {
                temp: { type: Type.STRING },
                condition: { type: Type.STRING },
                wind: { type: Type.STRING }
              },
              required: ["temp", "condition", "wind"]
            },
            traffic: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING },
                incidents: { type: Type.INTEGER }
              },
              required: ["status", "incidents"]
            },
            locationName: { type: Type.STRING }
          },
          required: ["weather", "traffic", "locationName"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    return {
      weather: data.weather,
      traffic: data.traffic,
      location: data.locationName || location
    };
  } catch (error) {
    console.error("Quick Status Error:", error);
    return {
      weather: { temp: "--", condition: "Error", wind: "--" },
      traffic: { status: "Offline", incidents: 0 },
      location: location
    };
  }
};

/**
 * Servicio de monitorización de emergencias con filtrado de fuentes.
 * Ahora incluye búsqueda explícita de transporte público (Renfe, ADIF, Metro).
 */
export const fetchAlerts = async (
  location: string, 
  date?: string, 
  radius?: number, 
  categoryFilter?: string
): Promise<{ events: AlertEvent[], analysis: string }> => {
  const isHistorical = !!date;
  const radiusContext = radius ? ` en un radio de ${radius} kilómetros` : '';
  const categoryContext = categoryFilter && categoryFilter !== 'TODAS' 
    ? ` filtrando por la categoría "${categoryFilter}"` 
    : '';

  const searchPrompt = isHistorical 
    ? `Busca reportes de emergencias, incidencias ferroviarias (Renfe, ADIF), metro, tráfico, incendios y alertas climáticas en ${location}${radiusContext} el día ${date}${categoryContext}. Cita fuentes oficiales españolas.`
    : `Detecta alertas ACTIVAS de AEMET, DGT, Renfe, ADIF, Metro, incendios y emergencias 112 en ${location}${radiusContext} AHORA. Prioriza fuentes oficiales como Renfe, Metro, ADIF y servicios de emergencia nacionales.`;

  try {
    const searchResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawInfo = searchResponse.text || "";
    const groundingSources = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk, index) => ({
        id: index,
        title: chunk.web?.title || "Enlace de interés",
        uri: chunk.web?.uri || ""
      }))
      .filter(s => s.uri && !s.uri.includes('google.com/search') && !s.uri.includes('aistudio.google.com')) || [];

    const structuringPrompt = `
      Actúa como un analista de emergencias y transporte para España.
      INFORMACIÓN DE BÚSQUEDA: ${rawInfo}
      LISTA DE FUENTES DISPONIBLES: ${groundingSources.map((s) => `[ID:${s.id}] ${s.title}: ${s.uri}`).join('\n')}
      
      REGLAS:
      1. Extrae eventos de seguridad, clima, tráfico y transporte público (Renfe, Metro, ADIF, Autobuses).
      2. Clasifica correctamente como 'Transporte', 'Clima', 'Tráfico', 'Incendio', etc.
      3. Asocia sourceIndex de la lista de fuentes.
    `;

    const structResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: structuringPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            events: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  severity: { type: Type.STRING, enum: ['CRITICAL', 'WARNING', 'INFO', 'SAFE'] },
                  category: { type: Type.STRING },
                  sourceName: { type: Type.STRING },
                  sourceIndex: { type: Type.INTEGER },
                  timeInfo: { type: Type.STRING }
                },
                required: ["title", "description", "severity", "category", "sourceName", "sourceIndex", "timeInfo"]
              }
            },
            riskAnalysis: { type: Type.STRING }
          },
          required: ["events", "riskAnalysis"]
        }
      }
    });

    const parsedData = JSON.parse(structResponse.text || '{"events":[], "riskAnalysis":""}');
    
    const events: AlertEvent[] = (parsedData.events || []).map((evt: any) => {
      const idString = `${evt.title}-${evt.timeInfo}-${location}`;
      let hash = 0;
      for (let i = 0; i < idString.length; i++) {
        hash = ((hash << 5) - hash) + idString.charCodeAt(i);
        hash |= 0;
      }

      const sourceFromList = groundingSources.find(s => s.id === evt.sourceIndex);
      const finalUrl = sourceFromList ? sourceFromList.uri : "";
      
      const officialKeywords = ['gob.es', 'aemet.es', 'dgt.es', 'renfe.com', 'adif.es', 'metro', 'emt'];
      const isOfficial = officialKeywords.some(kw => finalUrl.includes(kw)) || evt.sourceName.toLowerCase().includes('112') || evt.sourceName.toLowerCase().includes('oficial');

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
    return { events: [], analysis: "Error de sincronización con las fuentes de datos." };
  }
};
