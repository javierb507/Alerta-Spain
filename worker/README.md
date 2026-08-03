# Proxy de IA (Cloudflare Worker)

Guarda la clave del servidor y la ofrece como cuota compartida limitada, para que la app
funcione sin que cada usuario configure nada. La clave nunca llega al navegador.

## Desplegar (una vez)

Desde la carpeta `worker/`:

```bash
cd worker

# 1. Entrar en tu cuenta de Cloudflare (abre el navegador)
npx wrangler login

# 2. Guardar la clave de Gemini como secret (pídela con facturación activa para grounding).
#    Se te pedirá pegarla; no queda en ningún fichero del repo.
npx wrangler secret put GEMINI_API_KEY

# 3. Desplegar
npx wrangler deploy
```

`deploy` imprime la URL del Worker, del tipo:
`https://alerta-spain-proxy.<tu-subdominio>.workers.dev`

Pásasela a Claude (o ponla en `services/config.ts` → `SHARED_PROXY_URL`) y haz push:
GitHub Actions reconstruye la app y el botón "Servidor compartido" se enciende.

## Límite por IP/día (recomendado)

Sin esto, cualquiera que descubra la URL puede gastar tu clave. Con esto, máximo
20 consultas por IP y día (editable en `src/index.js`, `DAILY_LIMIT_PER_IP`).

```bash
npx wrangler kv namespace create RATE_LIMIT
```

Copia el `id` que devuelve, descomenta el bloque `[[kv_namespaces]]` en `wrangler.toml`,
pega el id y vuelve a `npx wrangler deploy`.

## Coste

Plan gratuito: 100.000 peticiones/día en el Worker, sin tarjeta. El coste real lo marca
la clave de Gemini: 5.000 búsquedas con grounding gratis/mes, luego 14 $/1.000.
El límite por IP + el guard por Origin contienen el gasto.
