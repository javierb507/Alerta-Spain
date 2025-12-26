import React from 'react';
import { AlertEvent, SeverityLevel, SourceType } from '../types';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Newspaper, 
  Users, 
  ExternalLink, 
  Clock, 
  Search,
  Megaphone,
  CheckCircle2,
  Info,
  MapPin,
  Siren
} from 'lucide-react';

interface Props {
  event: AlertEvent;
}

const AlertCard: React.FC<Props> = ({ event }) => {
  const getSeverityStyles = (level: SeverityLevel) => {
    switch (level) {
      case SeverityLevel.CRITICAL:
        return {
            container: 'bg-white dark:bg-gradient-to-br dark:from-red-950/80 dark:to-slate-900 border-red-200 dark:border-red-500/50 shadow-sm dark:shadow-red-900/20 shadow-red-100',
            icon: <Siren className="w-6 h-6 text-red-600 dark:text-red-500 animate-pulse" />,
            title: 'text-red-700 dark:text-red-50',
            badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
        };
      case SeverityLevel.WARNING:
        return {
            container: 'bg-white dark:bg-gradient-to-br dark:from-orange-950/80 dark:to-slate-900 border-orange-200 dark:border-orange-500/50 shadow-sm dark:shadow-orange-900/20 shadow-orange-100',
            icon: <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-500" />,
            title: 'text-orange-700 dark:text-orange-50',
            badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/20'
        };
      case SeverityLevel.SAFE:
        return {
            container: 'bg-white dark:bg-gradient-to-br dark:from-emerald-950/80 dark:to-slate-900 border-emerald-200 dark:border-emerald-500/50 shadow-sm dark:shadow-emerald-900/20 shadow-emerald-100',
            icon: <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />,
            title: 'text-emerald-700 dark:text-emerald-50',
            badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20'
        };
      default: // INFO
        return {
            container: 'bg-white dark:bg-gradient-to-br dark:from-blue-950/80 dark:to-slate-900 border-blue-200 dark:border-blue-500/50 shadow-sm dark:shadow-blue-900/20 shadow-blue-100',
            icon: <Info className="w-6 h-6 text-blue-600 dark:text-blue-500" />,
            title: 'text-blue-700 dark:text-blue-50',
            badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
        };
    }
  };

  const styles = getSeverityStyles(event.severity);

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case SourceType.OFFICIAL: return <ShieldCheck className="w-3 h-3" />;
      case SourceType.SOCIAL: return <Users className="w-3 h-3" />;
      default: return <Newspaper className="w-3 h-3" />;
    }
  };

  const getVerificationUrl = (sourceName: string, eventTitle: string) => {
    return `https://www.google.com/search?q=${encodeURIComponent(`${sourceName} ${eventTitle} ${event.location}`)}`;
  };

  return (
    <div className={`relative group mb-4 p-5 rounded-xl border backdrop-blur-md transition-all hover:scale-[1.01] hover:shadow-xl ${styles.container}`}>
      
      {/* Header */}
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 mt-1 p-2 rounded-lg bg-slate-100 dark:bg-black/20 backdrop-blur-sm border border-slate-200 dark:border-white/5">
            {styles.icon}
        </div>
        
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
                <h3 className={`text-lg font-bold leading-tight ${styles.title}`}>
                    {event.title}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap bg-slate-100 dark:bg-black/30 px-2 py-1 rounded-md border border-slate-200 dark:border-white/5">
                    <Clock className="w-3 h-3" />
                    <span>{event.timestamp}</span>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${styles.badge}`}>
                    {event.category}
                </span>
                {event.location && (
                     <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded border border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-black/10">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                    </span>
                )}
            </div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 pl-0 sm:pl-[3.5rem]"> {/* Align with text start on larger screens */}
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-light">
            {event.description}
        </p>
      </div>
      
      {/* Footer / Sources */}
      <div className="mt-4 pt-3 pl-0 sm:pl-[3.5rem] border-t border-slate-200 dark:border-white/5 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mr-1">Fuentes:</span>
        {event.sources.map((source, idx) => {
            const url = source.url || getVerificationUrl(source.name, event.title);
            const isGenerated = !source.url;
            
            // Source specific styles
            let sourceStyle = "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700";
            if (source.type === SourceType.OFFICIAL) sourceStyle = "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:hover:bg-blue-900/50 dark:border-blue-800/50";
            if (source.type === SourceType.SOCIAL) sourceStyle = "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:hover:bg-purple-900/50 dark:border-purple-800/50";

            return (
              <a 
                key={idx}
                href={url}
                target="_blank"
                rel="noreferrer"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer group/link ${sourceStyle}`}
              >
                  {getSourceIcon(source.type)}
                  <span>{source.name}</span>
                  {isGenerated ? (
                      <Search className="w-2.5 h-2.5 opacity-50 group-hover/link:opacity-100" />
                  ) : (
                      <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover/link:opacity-100" />
                  )}
              </a>
            );
        })}
      </div>
    </div>
  );
};

export default AlertCard;