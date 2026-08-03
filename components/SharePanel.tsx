
import React, { useState } from 'react';
import { Share2, X, Check, Copy, MessageCircle, Send, Mail, Smartphone, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ReportData, buildFullReport, buildShortReport, SHARE_TARGETS } from '../services/reportService';

const ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  telegram: Send,
  email: Mail,
  sms: Smartphone,
  x: Share2,
};

interface Props {
  open: boolean;
  onClose: () => void;
  data: ReportData;
}

const SharePanel: React.FC<Props> = ({ open, onClose, data }) => {
  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState(false);

  if (!open) return null;

  const fullText = buildFullReport(data);
  const shortText = buildShortReport(data);
  const sourcesWithUrl = data.alerts.slice(0, 5).filter(a => a.sources[0]?.url).length;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia el informe manualmente:', fullText);
    }
  };

  const shareNative = async () => {
    try {
      await navigator.share({ text: fullText });
      onClose();
    } catch { /* usuario canceló */ }
  };

  return (
    <div className="fixed inset-0 z-[108] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl"><Share2 className="w-4 h-4 text-white" /></div>
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Compartir informe</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
          <div className="flex items-start gap-3 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 leading-snug">
              El informe incluye el enlace original de {sourcesWithUrl > 0 ? `${sourcesWithUrl} fuente${sourcesWithUrl > 1 ? 's' : ''}` : 'cada fuente'} para que quien lo reciba pueda verificarlo.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {typeof navigator !== 'undefined' && !!navigator.share && (
              <button onClick={shareNative} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <Share2 className="w-5 h-5 text-blue-600" />
                <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">Compartir</span>
              </button>
            )}
            {SHARE_TARGETS.map(t => {
              const Icon = ICONS[t.id] || Share2;
              return (
                <a
                  key={t.id}
                  href={t.url(t.short ? shortText : fullText)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                >
                  <Icon className="w-5 h-5 text-blue-600" />
                  <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">{t.label}</span>
                </a>
              );
            })}
            <button onClick={copyReport} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-blue-600" />}
              <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-300">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <button
            onClick={() => setPreview(p => !p)}
            className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400"
          >
            {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {preview ? 'Ocultar' : 'Ver'} informe
          </button>
          {preview && (
            <pre className="text-[10px] font-mono whitespace-pre-wrap break-words p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 max-h-60 overflow-y-auto no-scrollbar">
              {fullText}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharePanel;
