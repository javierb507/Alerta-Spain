
import React from 'react';
import { AlertEvent, SeverityLevel, SourceType } from '../types';
import { 
  ShieldCheck, 
  Users, 
  ExternalLink, 
  MapPin,
  Siren,
  Flame,
  CloudLightning,
  Car,
  ShieldAlert,
  Activity,
  Share2,
  CheckCircle2,
  Info,
  AlertCircle,
  TrainFront,
  Bus,
  TramFront
} from 'lucide-react';

interface Props {
  event: AlertEvent;
}

const AlertCard: React.FC<Props> = ({ event }) => {
  const getSeverityStyles = (level: SeverityLevel) => {
    switch (level) {
      case SeverityLevel.CRITICAL:
        return {
            container: 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-500/30',
            iconContainer: 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400',
            title: 'text-red-900 dark:text-red-50',
            badge: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300'
        };
      case SeverityLevel.WARNING:
        return {
            container: 'bg-white dark:bg-slate-900 border-orange-200 dark:border-orange-500/30',
            iconContainer: 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400',
            title: 'text-orange-900 dark:text-orange-50',
            badge: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300'
        };
      case SeverityLevel.SAFE:
        return {
            container: 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-500/30',
            iconContainer: 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
            title: 'text-emerald-900 dark:text-emerald-50',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
        };
      default:
        return {
            container: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
            iconContainer: 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
            title: 'text-slate-900 dark:text-slate-50',
            badge: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
        };
    }
  };

  const getEventIcon = (category: string, severity: SeverityLevel) => {
    if (severity === SeverityLevel.SAFE) return <ShieldCheck className="w-5 h-5" />;
    
    const c = category.toLowerCase();
    // Prioridad transporte
    if (c.includes('tren') || c.includes('renfe') || c.includes('adif') || c.includes('ferrocarril')) return <TrainFront className="w-5 h-5" />;
    if (c.includes('metro') || c.includes('tranvía')) return <TramFront className="w-5 h-5" />;
    if (c.includes('autobús') || c.includes('bus') || c.includes('emt')) return <Bus className="w-5 h-5" />;
    if (c.includes('transporte')) return <TrainFront className="w-5 h-5" />;
    
    // Otros
    if (c.includes('incendio')) return <Flame className="w-5 h-5" />;
    if (c.includes('clima') || c.includes('tormenta') || c.includes('aemet')) return <CloudLightning className="w-5 h-5" />;
    if (c.includes('tráfico') || c.includes('dgt')) return <Car className="w-5 h-5" />;
    if (c.includes('seguridad') || c.includes('policía')) return <ShieldAlert className="w-5 h-5" />;
    if (c.includes('salud')) return <Activity className="w-5 h-5" />;
    
    if (severity === SeverityLevel.INFO) return <Info className="w-5 h-5" />;
    if (severity === SeverityLevel.WARNING) return <AlertCircle className="w-5 h-5" />;
    
    return <Siren className="w-5 h-5" />;
  };

  const styles = getSeverityStyles(event.severity);

  const handleShare = async () => {
    const text = `⚠️ ALERTA EN ${event.location.toUpperCase()}: ${event.title}. ${event.description}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Alerta Emergencia', text, url: window.location.href }); } catch (e) {}
    } else {
      await navigator.clipboard.writeText(text);
      alert('Reporte copiado al portapapeles');
    }
  };

  return (
    <div className={`relative p-5 rounded-3xl border transition-all hover:border-blue-500/50 group shadow-sm ${styles.container}`}>
      <div className="flex gap-4 items-start">
        <div className={`flex-shrink-0 p-3 rounded-2xl border border-transparent ${styles.iconContainer}`}>
            {getEventIcon(event.category, event.severity)}
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <h3 className={`text-base font-black leading-tight tracking-tight pr-2 ${styles.title}`}>
                    {event.title}
                </h3>
                <button onClick={handleShare} className="p-2 text-slate-400 hover:text-blue-500 transition-colors">
                    <Share2 className="w-4 h-4" />
                </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${styles.badge}`}>
                    {event.category}
                </span>
                <span className="flex items-center gap-1 text-[9px] text-slate-400 font-bold uppercase">
                    <MapPin className="w-3 h-3" /> {event.location}
                </span>
                {event.sources[0]?.type === SourceType.OFFICIAL && (
                    <span className="flex items-center gap-1 text-[9px] text-emerald-500 font-black uppercase tracking-tighter">
                        <CheckCircle2 className="w-3 h-3" /> Fuente Oficial
                    </span>
                )}
            </div>
        </div>
      </div>

      <div className="mt-4 sm:ml-[3.75rem]">
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {event.description}
        </p>
      </div>
      
      <div className="mt-4 pt-4 sm:ml-[3.75rem] border-t border-slate-100 dark:border-slate-800/50 flex flex-wrap gap-3">
        {event.sources.map((source, idx) => {
          const hasValidUrl = source.url && source.url.startsWith('http');
          
          return (
            <div key={idx} className="flex flex-col gap-1 max-w-full">
              {hasValidUrl ? (
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-sm group/link"
                >
                  <div className="flex-shrink-0">
                    {source.type === SourceType.OFFICIAL ? (
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 overflow-hidden">
                    <span className="text-slate-900 dark:text-slate-100 truncate">{source.name}</span>
                    <span className="text-[8px] font-normal text-slate-400 truncate opacity-70 group-hover/link:opacity-100 transition-opacity">
                      {source.url?.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-40 group-hover/link:opacity-100 ml-1 flex-shrink-0" />
                </a>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 cursor-default">
                  {source.type === SourceType.OFFICIAL ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Users className="w-3.5 h-3.5" />
                  )}
                  <span className="truncate">{source.name}</span>
                </div>
              )}
              {source.type === SourceType.OFFICIAL && (
                <div className="flex items-center gap-1 px-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Verified Source</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertCard;
