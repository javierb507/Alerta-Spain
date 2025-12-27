
import React from 'react';
import { AlertEvent, SeverityLevel } from '../types';
import { ShieldCheck, Zap, AlertCircle, Info, Activity } from 'lucide-react';

interface Props {
  events: AlertEvent[];
}

const StatsChart: React.FC<Props> = ({ events }) => {
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

  const criticalCount = events.filter(e => e.severity === SeverityLevel.CRITICAL).length;
  const warningCount = events.filter(e => e.severity === SeverityLevel.WARNING).length;

  const getStatusConfig = (score: number) => {
    switch (score) {
      case 3: return { label: 'CRÍTICO', color: 'from-red-500 to-red-600', text: 'text-red-600 dark:text-red-400', rotation: 'rotate-[60deg]', bg: 'bg-red-500/10' };
      case 2: return { label: 'ALERTA', color: 'from-orange-400 to-orange-500', text: 'text-orange-600 dark:text-orange-400', rotation: 'rotate-[20deg]', bg: 'bg-orange-500/10' };
      case 1: return { label: 'INFO', color: 'from-blue-400 to-blue-500', text: 'text-blue-600 dark:text-blue-400', rotation: 'rotate-[-20deg]', bg: 'bg-blue-500/10' };
      default: return { label: 'SEGURO', color: 'from-emerald-400 to-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', rotation: 'rotate-[-60deg]', bg: 'bg-emerald-500/10' };
    }
  };

  const status = getStatusConfig(maxSeverity);

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 mb-6 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all overflow-hidden relative">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-16 -mt-16 blur-3xl"></div>
      
      <div className="flex flex-col sm:flex-row items-center gap-10 relative z-10">
        {/* Gauge Circular */}
        <div className="flex flex-col items-center">
            <div className="relative w-44 h-28 flex items-end justify-center overflow-hidden">
                {/* Background Arc */}
                <div className="absolute w-44 h-44 border-[16px] border-slate-100 dark:border-slate-800 rounded-full top-0"></div>
                
                {/* Segments Colors */}
                <div className="absolute w-44 h-44 border-[16px] border-transparent border-t-red-500/20 border-r-orange-500/20 rounded-full top-0 rotate-[45deg]"></div>
                
                {/* Active Needle */}
                <div className="absolute bottom-0 w-1.5 h-20 origin-bottom transition-transform duration-1000 cubic-bezier(0.34, 1.56, 0.64, 1)" style={{ transform: status.rotation }}>
                    <div className="w-full h-full bg-gradient-to-t from-slate-400 to-slate-900 dark:to-white rounded-full shadow-lg"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 dark:bg-white rounded-full shadow-lg"></div>
                </div>

                {/* Center Cap */}
                <div className="absolute bottom-[-12px] w-8 h-8 bg-white dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-700 rounded-full z-20"></div>
            </div>
            
            <div className={`mt-4 px-6 py-1 rounded-full text-sm font-black tracking-[0.2em] uppercase ${status.text} ${status.bg} border border-current/10`}>
                Nivel de Riesgo
            </div>
            <div className={`mt-1 text-3xl font-black ${status.text} drop-shadow-sm tracking-tighter`}>
                {status.label}
            </div>
        </div>

        {/* Data Cards Grid */}
        <div className="flex-1 w-full grid grid-cols-2 gap-3">
            <div className="group bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-red-500">
                    <Zap className="w-4 h-4 fill-current" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Críticos</span>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform origin-left">{criticalCount}</div>
            </div>

            <div className="group bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                <div className="flex items-center gap-2 mb-2 text-orange-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Avisos</span>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white group-hover:scale-110 transition-transform origin-left">{warningCount}</div>
            </div>

            <div className="col-span-2 flex items-center justify-between bg-slate-900 dark:bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-500/10 transition-all hover:scale-[1.02]">
                <div className="flex items-center gap-3 text-white">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Monitorización Total</div>
                        <div className="text-sm font-bold">Eventos analizados hoy</div>
                    </div>
                </div>
                <div className="text-3xl font-black text-white px-2">{events.length}</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StatsChart;
