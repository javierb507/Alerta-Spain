
// Generación del informe de situación compartible.
// Clave del diseño: cada alerta va acompañada de su fuente y su URL original,
// para que quien lo recibe pueda verificar la información por sí mismo en vez
// de fiarse de un reenvío. Sin verificabilidad, un informe de emergencia
// reenviado es indistinguible de un bulo.

import { AlertEvent, SourceType } from "../types";

const APP_URL = 'https://javierb507.github.io/Alerta-Spain/';

export interface ReportData {
  location: string;
  riskLabel: string;
  analysis: string;
  alerts: AlertEvent[];
  distances: Map<string, number | undefined>;
  timestamp: number;
}

const formatDist = (km?: number): string =>
  km === undefined ? '' : km < 1 ? ` · a ${Math.round(km * 1000)} m` : ` · a ${km.toFixed(1)} km`;

/** Dominio legible de una URL, para identificar la fuente de un vistazo. */
export const sourceDomain = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

// Las URIs de grounding de Gemini son redirects opacos: su dominio no identifica
// al medio. El nombre de la fuente sí lo hace, así que tiene prioridad.
const isOpaqueRedirect = (url: string): boolean =>
  url.includes('vertexaisearch.cloud.google.com') || url.includes('grounding-api-redirect');

/** Etiqueta de la fuente: el medio real, nunca el dominio del redirect. */
export const sourceLabel = (name: string, url?: string): string => {
  if (name && name.trim()) return name.trim();
  if (url && !isOpaqueRedirect(url)) return sourceDomain(url);
  return 'Fuente de información';
};

/** Informe completo con fuentes verificables (WhatsApp, Telegram, email, copiar). */
export const buildFullReport = (data: ReportData, maxAlerts = 5): string => {
  const when = new Date(data.timestamp).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const lines: string[] = [
    `🚨 MONITOR DE EMERGENCIAS — ${data.location.toUpperCase()}`,
    `Nivel de riesgo: ${data.riskLabel} · ${when}`,
    '',
    '📋 SITUACIÓN',
    data.analysis,
  ];

  const shown = data.alerts.slice(0, maxAlerts);
  if (shown.length > 0) {
    lines.push('', `⚠️ ALERTAS (${shown.length}${data.alerts.length > shown.length ? ` de ${data.alerts.length}` : ''})`);
    shown.forEach((a, i) => {
      const source = a.sources[0];
      const official = source?.type === SourceType.OFFICIAL ? ' ✅' : '';
      lines.push('', `${i + 1}. [${a.severity}] ${a.title}${formatDist(data.distances.get(a.id))}`);
      lines.push(`   ${a.description}`);
      if (source) {
        lines.push(`   🔗 Fuente${official}: ${sourceLabel(source.name, source.url)}`);
        if (source.url) lines.push(`   ${source.url}`);
      }
    });
    lines.push('', 'Verifica cada alerta en el enlace de su fuente original.');
  }

  lines.push('', `Informe generado con Monitor de Emergencias España`, APP_URL, '', 'En emergencia real llama al 112.');
  return lines.join('\n');
};

/** Versión breve para redes con límite de caracteres (X/Bluesky). */
export const buildShortReport = (data: ReportData): string => {
  const critical = data.alerts.filter(a => a.severity === 'CRITICAL').length;
  const warnings = data.alerts.filter(a => a.severity === 'WARNING').length;
  const counts = [critical ? `${critical} críticas` : '', warnings ? `${warnings} avisos` : '']
    .filter(Boolean).join(', ');
  return `🚨 ${data.location}: nivel ${data.riskLabel}${counts ? ` (${counts})` : ''}. Fuentes verificables en ${APP_URL}`;
};

export interface ShareTarget {
  id: string;
  label: string;
  /** Construye la URL de deep link que abre el compositor de la app destino. */
  url: (text: string) => string;
  /** Usa la versión corta del informe */
  short?: boolean;
}

// Deep links que abren el compositor de cada app con el texto ya escrito.
// El usuario decide destinatario y pulsa enviar: la app nunca envía nada por su cuenta.
export const SHARE_TARGETS: ShareTarget[] = [
  { id: 'whatsapp', label: 'WhatsApp', url: t => `https://wa.me/?text=${encodeURIComponent(t)}` },
  { id: 'telegram', label: 'Telegram', url: t => `https://t.me/share/url?url=${encodeURIComponent(APP_URL)}&text=${encodeURIComponent(t)}` },
  { id: 'email', label: 'Email', url: t => `mailto:?subject=${encodeURIComponent('Informe de situación — Monitor de Emergencias')}&body=${encodeURIComponent(t)}` },
  { id: 'sms', label: 'SMS', url: t => `sms:?&body=${encodeURIComponent(t)}` },
  { id: 'x', label: 'X', url: t => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}`, short: true },
];
