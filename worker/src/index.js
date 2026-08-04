// Proxy de IA para Monitor de Emergencias España.
// Guarda la clave del servidor y la expone como cuota compartida limitada, para que
// usuarios sin conocimientos técnicos puedan usar la app sin configurar nada.
// La clave NUNCA llega al navegador: vive solo aquí como secret del Worker.
//
// Endpoints:
//   POST /api/search  { query }  -> { rawInfo, sources[], provider }   (Gemini + Google Search)
//   POST /api/llm     { prompt } -> { content }                        (Gemini, estructuración)
//
// Secret requerido:  GEMINI_API_KEY  (clave con facturación activa para grounding)
// Binding opcional:  RATE_LIMIT (KV)  -> límite por IP/día; si no existe, solo guard por Origin

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
const SEARCH_MODEL = 'gemini-3.6-flash';
const STRUCT_MODEL = 'gemini-3.6-flash';

// Orígenes permitidos: solo la app oficial puede usar la cuota compartida.
const ALLOWED_ORIGINS = [
  'https://alarma.javivi.pro',
  'https://javierb507.github.io',
  'http://localhost:3000',
];

const DAILY_LIMIT_PER_IP = 20;

const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
});

const json = (data, status, origin) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });

// Límite por IP y día. Cada consulta de la app = 1 search + 1 llm; se cuenta en /api/search.
// Devuelve la cuota para que la app muestre al usuario cuántas consultas gratis le quedan.
async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT) return { ok: true }; // sin KV configurado: no se limita ni se informa cuota
  const day = new Date().toISOString().slice(0, 10);
  const key = `${ip}:${day}`;
  const count = parseInt((await env.RATE_LIMIT.get(key)) || '0', 10);
  const limit = DAILY_LIMIT_PER_IP;
  if (count >= limit) {
    return { ok: false, quota: { used: count, limit, remaining: 0 } };
  }
  const used = count + 1;
  await env.RATE_LIMIT.put(key, String(used), { expirationTtl: 172800 }); // TTL 48h: caducan solas
  return { ok: true, quota: { used, limit, remaining: limit - used } };
}

async function handleSearch(query, env) {
  const res = await fetch(`${GEMINI}/models/${SEARCH_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: query }] }], tools: [{ googleSearch: {} }] }),
  });
  if (!res.ok) throw new Error(`search ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const cand = data.candidates?.[0];
  const rawInfo = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('\n') || '';
  const sources = (cand?.groundingMetadata?.groundingChunks || [])
    .map((c, id) => ({ id, title: c.web?.title || 'Enlace de interés', uri: c.web?.uri || '' }))
    .filter((s) => s.uri && !s.uri.includes('google.com/search') && !s.uri.includes('aistudio.google.com'));
  return { rawInfo, sources, provider: 'gemini' };
}

async function handleLLM(prompt, env) {
  const res = await fetch(`${GEMINI}/openai/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.GEMINI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: STRUCT_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      reasoning_effort: 'low', // estructurar es mecánico: sin thinking se ahorra ~57% de tokens
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`llm ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return { content: data.choices?.[0]?.message?.content || '' };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }
    // Guard barato: solo la app oficial. No es infalible (curl lo salta), pero corta el abuso casual.
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin no permitido' }, 403, origin);
    }
    if (!env.GEMINI_API_KEY) {
      return json({ error: 'Servidor sin clave configurada' }, 500, origin);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    try {
      const body = await request.json();
      if (url.pathname === '/api/search') {
        const rl = await checkRateLimit(env, ip);
        if (!rl.ok) {
          return json({ error: 'LIMIT_REACHED', quota: rl.quota }, 429, origin);
        }
        const result = await handleSearch(body.query || '', env);
        return json({ ...result, quota: rl.quota }, 200, origin); // quota undefined si no hay KV
      }
      if (url.pathname === '/api/llm') {
        return json(await handleLLM(body.prompt || '', env), 200, origin);
      }
      return json({ error: 'Ruta no encontrada' }, 404, origin);
    } catch (e) {
      return json({ error: String(e).slice(0, 200) }, 502, origin);
    }
  },
};
