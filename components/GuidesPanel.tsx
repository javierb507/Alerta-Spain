
import React, { useState } from 'react';
import { BookOpen, X, Flame, CloudRain, Sun, Snowflake, ZapOff, ChevronRight, ArrowLeft } from 'lucide-react';
import { GUIDES, Guide } from '../services/guides';

const ICONS: Record<string, React.ElementType> = { Flame, CloudRain, Sun, Snowflake, ZapOff };

interface Props {
  open: boolean;
  onClose: () => void;
  // Guía a abrir directamente (al pulsar "¿Qué hago?" en una alerta)
  initialGuideId?: string;
}

const Section: React.FC<{ title: string, items: string[], accent: string }> = ({ title, items, accent }) => (
  <div className="space-y-2">
    <p className={`text-[10px] font-black uppercase tracking-widest ${accent}`}>{title}</p>
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${accent.replace('text-', 'bg-')}`}></span>
          {item}
        </li>
      ))}
    </ul>
  </div>
);

const GuidesPanel: React.FC<Props> = ({ open, onClose, initialGuideId }) => {
  const [selected, setSelected] = useState<Guide | null>(null);

  // Al abrirse con una guía concreta, mostrarla directamente
  React.useEffect(() => {
    if (open) setSelected(GUIDES.find(g => g.id === initialGuideId) || null);
  }, [open, initialGuideId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3 min-w-0">
            {selected ? (
              <button onClick={() => setSelected(null)} className="p-1 -m-1 text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
            ) : (
              <div className="p-2 bg-emerald-600 rounded-xl"><BookOpen className="w-4 h-4 text-white" /></div>
            )}
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white truncate">
              {selected ? selected.title : '¿Qué hago?'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto no-scrollbar space-y-5">
          {!selected ? (
            <>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                Guías de autoprotección · disponibles sin conexión
              </p>
              {GUIDES.map(g => {
                const Icon = ICONS[g.icon] || BookOpen;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelected(g)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left"
                  >
                    <Icon className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="flex-1 text-xs font-black text-slate-900 dark:text-white">{g.title}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </>
          ) : (
            <>
              <Section title="Antes" items={selected.before} accent="text-blue-600 dark:text-blue-400" />
              <Section title="Durante" items={selected.during} accent="text-red-600 dark:text-red-400" />
              <Section title="Después" items={selected.after} accent="text-emerald-600 dark:text-emerald-400" />
            </>
          )}
          <p className="text-[9px] text-slate-400 font-bold leading-snug pt-2">
            Basado en las recomendaciones de Protección Civil. En emergencia real llama siempre al 112.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GuidesPanel;
