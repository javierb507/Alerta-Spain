
import { QuickStatus } from "../types";

// Coordenadas por defecto (Madrid) cuando el usuario no concede GPS.
const DEFAULT_COORDS = { lat: 40.4168, lng: -3.7038 };
const DEFAULT_NAME = "España";

// Mapeo de códigos WMO de Open-Meteo a descripciones en español.
const WEATHER_CODES: Record<number, string> = {
  0: 'Despejado', 1: 'Casi despejado', 2: 'Parcialmente nuboso', 3: 'Nuboso',
  45: 'Niebla', 48: 'Niebla con escarcha',
  51: 'Llovizna débil', 53: 'Llovizna', 55: 'Llovizna intensa',
  56: 'Llovizna helada', 57: 'Llovizna helada intensa',
  61: 'Lluvia débil', 63: 'Lluvia', 65: 'Lluvia intensa',
  66: 'Lluvia helada', 67: 'Lluvia helada intensa',
  71: 'Nieve débil', 73: 'Nieve', 75: 'Nieve intensa', 77: 'Cinarra',
  80: 'Chubascos débiles', 81: 'Chubascos', 82: 'Chubascos fuertes',
  85: 'Chubascos de nieve', 86: 'Chubascos de nieve fuertes',
  95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo fuerte'
};

/**
 * Estado rápido de clima vía Open-Meteo (gratuito, sin API key, con CORS).
 * Sustituye a la llamada Gemini: datos deterministas y sin coste.
 * El tráfico requiere un proxy para DGT (CORS bloqueado); de momento se marca N/D.
 */
export const fetchQuickStatus = async (coords?: { lat: number, lng: number }): Promise<QuickStatus> => {
  const { lat, lng } = coords || DEFAULT_COORDS;

  try {
    const [weatherRes, locationName] = await Promise.all([
      fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,weather_code`)
        .then(r => r.json()),
      coords ? reverseGeocode(lat, lng) : Promise.resolve(DEFAULT_NAME)
    ]);

    const current = weatherRes.current;
    return {
      weather: {
        temp: `${Math.round(current.temperature_2m)}°C`,
        condition: WEATHER_CODES[current.weather_code] || 'Variable',
        wind: `${Math.round(current.wind_speed_10m)} km/h`
      },
      traffic: { status: "N/D", incidents: 0 },
      location: locationName
    };
  } catch (error) {
    console.error("Quick Status Error:", error);
    return {
      weather: { temp: "--", condition: "Error", wind: "--" },
      traffic: { status: "Offline", incidents: 0 },
      location: DEFAULT_NAME
    };
  }
};

/**
 * Geocodifica un nombre de localidad a coordenadas (Open-Meteo, gratis, con CORS).
 * Devuelve null si no hay resultado.
 */
export const geocodeLocation = async (name: string): Promise<{ lat: number, lng: number } | null> => {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=es&countryCode=ES`);
    const data = await res.json();
    const hit = data.results?.[0];
    return hit ? { lat: hit.latitude, lng: hit.longitude } : null;
  } catch {
    return null;
  }
};

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`);
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || DEFAULT_NAME;
  } catch {
    return "Mi zona";
  }
};
