import React from 'react';
import { AlertEvent, SeverityLevel } from '../types';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  events: AlertEvent[];
}

const StatsChart: React.FC<Props> = ({ events }) => {
  // Calculate the highest severity present
  const severityScore = {
    [SeverityLevel.SAFE]: 0,
    [SeverityLevel.INFO]: 1,
    [SeverityLevel.WARNING]: 2,
    [SeverityLevel.CRITICAL]: 3,
  };

  const maxSeverity = events.reduce((max, event) => {
    const score = severityScore[event.severity] || 0;
    return score > max ? score : max;
  }, 0);

  const getStatusConfig = (score: number) => {
    switch (score) {
      case 3: return { label: 'CRÍTICO', color: 'bg-red-500', text: 'text-red-500', icon: <AlertTriangle className="w-6 h-6" /> };
      case 2: return { label: 'PRECAUCIÓN', color: 'bg-orange-500', text: 'text-orange-500', icon: <AlertTriangle className="w-6 h-6" /> };
      case 1: return { label: 'INFORMATIVO', color: 'bg-blue-500', text: 'text-blue-500', icon: <Info className="w-6 h-6" /> };
      default: return { label: 'NORMALIDAD', color: 'bg-green-500', text: 'text-green-500', icon: <CheckCircle className="w-6 h-6" /> };
    }
  };

  const status = getStatusConfig(maxSeverity);

  return (
    <div className="w-full bg-white dark:bg-slate-900/50 rounded-xl p-4 mb-4 border border-slate-200 dark:border-slate-800 transition-colors">
      <h4 className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-widest font-semibold mb-3 text-center">Nivel de Riesgo Actual</h4>
      
      <div className="flex flex-col items-center justify-center gap-2 mb-4">
          <div className={`p-3 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${status.text} shadow-lg shadow-${status.color}/20`}>
              {status.icon}
          </div>
          <span className={`text-2xl font-black tracking-tight ${status.text}`}>
              {status.label}
          </span>
      </div>

      <div className="flex gap-1 h-2 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700">
        {/* Level 0 - Green */}
        <div className={`flex-1 transition-all duration-500 ${maxSeverity >= 0 ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
        {/* Level 1 - Blue */}
        <div className={`flex-1 transition-all duration-500 ${maxSeverity >= 1 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
        {/* Level 2 - Orange */}
        <div className={`flex-1 transition-all duration-500 ${maxSeverity >= 2 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
        {/* Level 3 - Red */}
        <div className={`flex-1 transition-all duration-500 ${maxSeverity >= 3 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-slate-200 dark:bg-slate-700'}`}></div>
      </div>
      
      <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-500 mt-2 font-mono uppercase">
        <span>Seguro</span>
        <span>Crítico</span>
      </div>
    </div>
  );
};

export default StatsChart;