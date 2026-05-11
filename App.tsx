
import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, Search, History, AlertOctagon, RotateCw, Loader2, 
  Bell, BellOff, Sun, Moon, Info, ShieldAlert, Radio, ShieldCheck, Siren, 
  ArrowLeft, Clock, Activity, CloudSun, Car, Wind, Settings,
  Plus, Trash2, Globe, X, Share2
} from 'lucide-react';
import { AlertEvent, UserLocation, SeverityLevel, QuickStatus, CustomSource, SourceType } from './types';
import { fetchAlerts, fetchQuickStatus } from './services/geminiService';
import { AudioService } from './services/audioService';
import AlertCard from './components/AlertCard';
import StatsChart from './components/StatsChart';

enum ViewState { ONBOARDING, DASHBOARD, HISTORY }

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.ONBOARDING);
  const [location, setLocation] = useState<UserLocation>({ name: '', isGPS: false });
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState<number>(5); 
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [quickStatus, setQuickStatus] = useState<QuickStatus | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(false);
  
  // Persistencia de monitorización y alertas vistas
  const [isMonitoring, setIsMonitoring] = useState(() => {
    return localStorage.getItem('is_monitoring') === 'true';
  });
  const seenAlertIds = useRef<Set<string>>(new Set());

  // Fuentes Personalizadas
  const [customSources, setCustomSources] = useState<CustomSource[]>(() => {
    const saved = localStorage.getItem('custom_sources');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSettings, setShowSettings] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceType>(SourceType.OFFICIAL);

  // Formulario de Historia
  const [formDay, setFormDay] = useState(new Date().getDate());
  const [formMonth, setFormMonth] = useState(new Date().getMonth());
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [historyLocation, setHistoryLocation] = useState<string>('');
  const [historyDate, setHistoryDate] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const authorName = "Javier Ballesteros";
  const DEPLOYMENT_DATE = "08/03/2025 15:45 CET"; // Fecha de despliegue manual

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'light'; 
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('custom_sources', JSON.stringify(customSources));
  }, [customSources]);

  useEffect(() => {
    localStorage.setItem('is_monitoring', isMonitoring.toString());
  }, [isMonitoring]);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    const initQuickStatus = async () => {
      setIsQuickLoading(true);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const data = await fetchQuickStatus("Mi ubicación", { 
              lat: pos.coords.latitude, 
              lng: pos.coords.longitude 
            });
            setQuickStatus(data);
            setIsQuickLoading(false);
          },
          async () => {
            const data = await fetchQuickStatus("España");
            setQuickStatus(data);
            setIsQuickLoading(false);
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        const data = await fetchQuickStatus("España");
        setQuickStatus(data);
        setIsQuickLoading(false);
      }
    };
    initQuickStatus();
  }, []);

  // Timer para refresco automático cuando la monitorización está activa
  useEffect(() => {
    let interval: number;
    if (isMonitoring && location.name && view === ViewState.DASHBOARD) {
      interval = window.setInterval(() => {
        refreshAlerts();
      }, 60000); // Refresco cada 60 segundos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, location.name, view]);

  const sendNotification = (alert: AlertEvent) => {
    if (Notification.permission === 'granted' && isMonitoring) {
      new Notification(`🚨 MONITOR ESPAÑA: ${alert.title}`, {
        body: alert.description,
        icon: 'https://alerta-local-espa-a-249485768002.us-west1.run.app/favicon.ico'
      });
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const toggleMonitoring = async () => {
    if (!isMonitoring) {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result === 'granted') {
          setIsMonitoring(true);
          AudioService.playSuccess();
        } else {
          alert("Es necesario permitir las notificaciones para activar el modo monitor.");
        }
      }
    } else {
      setIsMonitoring(false);
      AudioService.playScan();
    }
  };

  const addCustomSource = () => {
    if (!newSourceName || !newSourceUrl) return;
    const newSource: CustomSource = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSourceName,
      url: newSourceUrl,
      type: newSourceType
    };
    setCustomSources([...customSources, newSource]);
    setNewSourceName('');
    setNewSourceUrl('');
    AudioService.playSuccess();
  };

  const removeCustomSource = (id: string) => {
    setCustomSources(customSources.filter(s => s.id !== id));
    AudioService.playScan();
  };

  const executeSearch = async (locName: string, date?: string, searchRadius?: number) => {
    setLoading(true);
    try {
      const result = await fetchAlerts(locName, date, searchRadius || radius, 'TODAS', customSources);
      
      // Lógica de notificaciones para eventos nuevos
      if (!date) {
        result.events.forEach(evt => {
          if (!seenAlertIds.current.has(evt.id)) {
            if (evt.severity === SeverityLevel.CRITICAL || evt.severity === SeverityLevel.WARNING) {
              sendNotification(evt);
            }
            seenAlertIds.current.add(evt.id);
          }
        });
      }

      setAlerts(result.events);
      setAnalysis(result.analysis);
      setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      if (!date) {
        setLocation({ name: locName, isGPS: false });
        setHistoryDate('');
      } else {
        setHistoryDate(date);
      }
      
      AudioService.playSuccess();
      setView(ViewState.DASHBOARD);
    } catch (e) { 
      AudioService.playError();
      console.error(e);
    } finally { 
      setLoading(false); 
    }
  };

  const refreshAlerts = () => executeSearch(location.name);

  const handleManualLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.name.trim()) executeSearch(location.name);
  };

  const handleGPSLocation = (target: 'current' | 'history') => {
    setLoading(true);
    AudioService.playScan();
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const locName = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
          if (target === 'current') {
            await executeSearch(`Cerca de ${locName}`, undefined, radius);
          } else {
            setHistoryLocation(`Cerca de ${locName}`);
            setLoading(false);
            AudioService.playSuccess();
          }
        },
        () => { 
          setLoading(false); 
          AudioService.playError();
          alert("Error de GPS."); 
        }
      );
    }
  };

  const handleHistorySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = `${formYear}-${String(formMonth + 1).padStart(2, '0')}-${String(formDay).padStart(2, '0')}`;
    executeSearch(historyLocation, dateStr);
  };

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const renderFooter = (opacityClass: string = "opacity-40") => (
    <div className={`text-center space-y-1 py-4 ${opacityClass}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
        Autor: {authorName} • {currentYear}
      </p>
      <p className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600">
        Último despliegue: {DEPLOYMENT_DATE}
      </p>
    </div>
  );

  const renderSettingsModal = () => (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${showSettings ? 'visible' : 'invisible'}`}>
      <div className={`absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300 ${showSettings ? 'opacity-100' : 'opacity-0'}`} onClick={() => setShowSettings(false)}></div>
      <div className={`relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-300 transform ${showSettings ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'} overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-blue-600" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Ajustes y Fuentes</h2>
            </div>
            <button onClick={() => setShowSettings(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        {isMonitoring ? <Bell className="w-5 h-5 text-red-500 animate-pulse" /> : <BellOff className="w-5 h-5 text-slate-400" />}
                        <div>
                          <div className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Modo Monitor</div>
                          <div className="text-[9px] text-slate-400 font-bold">Alertas en tiempo real</div>
                        </div>
                    </div>
                    <button onClick={toggleMonitoring} className={`w-12 h-6 rounded-full relative transition-colors ${isMonitoring ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isMonitoring ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Fuentes Locales de Información</p>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <input type="text" placeholder="Nombre (ej: Prot. Civil Valencia)" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <input type="text" placeholder="Web o RRSS" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <button onClick={addCustomSource} className="w-full bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest">Añadir Fuente</button>
                </div>
            </div>
            <div className="space-y-3">
                {customSources.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                        <div className="min-w-0">
                            <div className="text-[11px] font-black dark:text-white truncate">{s.name}</div>
                            <div className="text-[9px] text-slate-400 truncate">{s.url}</div>
                        </div>
                        <button onClick={() => removeCustomSource(s.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors overflow-hidden">
      {view === ViewState.ONBOARDING && (
        <div className="h-full p-6 flex flex-col items-center bg-grid relative overflow-y-auto">
          <div className="absolute top-6 right-6 flex gap-2 z-50">
            <button onClick={() => setShowSettings(true)} className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg text-slate-600 dark:text-slate-300"><Settings className="w-5 h-5" /></button>
            <button onClick={toggleTheme} className="p-2.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg">{theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}</button>
          </div>

          <div className="w-full max-w-md space-y-6 pt-10 pb-20 animate-in">
            <div className="flex items-center justify-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                 </div>
                 <div className="text-left">
                    <h1 className="text-lg font-black tracking-tight uppercase leading-none">Monitor <span className="text-blue-600">España</span></h1>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[7px]">Inteligencia IA Local</p>
                 </div>
            </div>

            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-slate-400">Estado Local</span>
                    </div>
                    <span className="text-[8px] font-black text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-md">{quickStatus?.location || "Localizando..."}</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <CloudSun className="w-5 h-5 text-orange-500 mb-2" />
                        <span className="block text-xl font-black">{isQuickLoading ? "..." : quickStatus?.weather.temp}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{quickStatus?.weather.condition}</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <Car className="w-5 h-5 text-blue-500 mb-2" />
                        <span className="block text-xl font-black">{isQuickLoading ? "..." : quickStatus?.traffic.status}</span>
                        <span className="text-[9px] font-bold text-slate-500 uppercase">{quickStatus?.traffic.incidents} Incidencias</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
              <div className="space-y-3">
                 <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                    <span>Radio de Escaneo</span>
                    <span className="text-blue-600 font-bold">{radius} KM</span>
                 </div>
                 <input type="range" min="5" max="50" step="5" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-blue-600" />
              </div>
              <div className="grid gap-3">
                <button onClick={() => handleGPSLocation('current')} disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3">
                    {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Navigation className="w-4 h-4" />}
                    Escanear Mi Zona
                </button>
                <form onSubmit={handleManualLocation} className="flex gap-2">
                    <input type="text" placeholder="Localidad..." value={location.name} onChange={(e) => setLocation({ ...location, name: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold" />
                    <button type="submit" className="bg-blue-600 text-white p-4 rounded-2xl"><Search className="w-4 h-4" /></button>
                </form>
              </div>
              <button onClick={() => setView(ViewState.HISTORY)} className="w-full text-[9px] font-black text-slate-400 flex items-center justify-center gap-2 uppercase tracking-widest"><History className="w-3.5 h-3.5" /> Archivo Histórico</button>
            </div>
            
            <div className={`p-4 rounded-2xl border flex items-center gap-3 transition-colors ${isMonitoring ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700'}`}>
                <div className={`p-2 rounded-lg ${isMonitoring ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <div className="text-[10px] font-black uppercase dark:text-white">Modo Monitor {isMonitoring ? 'Activo' : 'Inactivo'}</div>
                    <div className="text-[8px] text-slate-500 uppercase font-bold tracking-tight">Notificaciones locales en tiempo real</div>
                </div>
                <button onClick={toggleMonitoring} className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-colors ${isMonitoring ? 'bg-red-500 text-white' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'}`}>
                    {isMonitoring ? 'Parar' : 'Activar'}
                </button>
            </div>

            {renderFooter()}
          </div>
          {renderSettingsModal()}
        </div>
      )}

      {view === ViewState.HISTORY && (
        <div className="h-full p-6 bg-grid overflow-y-auto relative flex flex-col items-center">
             <button onClick={() => setView(ViewState.ONBOARDING)} className="absolute top-6 left-6 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Volver</button>
             <div className="w-full max-w-md py-20 space-y-10 animate-in">
                <div className="text-center space-y-2">
                    <Clock className="w-12 h-12 mx-auto text-purple-600 mb-2" />
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Archivo</h2>
                </div>
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <form onSubmit={handleHistorySearch} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ubicación</label>
                           <input type="text" required placeholder="Ciudad..." value={historyLocation} onChange={(e) => setHistoryLocation(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl py-3 text-xs font-bold text-center appearance-none">{Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}</select>
                            <select value={formMonth} onChange={(e) => setFormMonth(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl py-3 text-xs font-bold text-center appearance-none">{months.map((m, i) => <option key={i} value={i}>{m}</option>)}</select>
                            <select value={formYear} onChange={(e) => setFormYear(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl py-3 text-xs font-bold text-center appearance-none">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-purple-500/20">{loading ? "Reconstruyendo..." : "Reconstruir Escenario"}</button>
                    </form>
                </div>
                {renderFooter()}
             </div>
        </div>
      )}

      {view === ViewState.DASHBOARD && (
        <div className="h-full flex flex-col animate-in bg-slate-50 dark:bg-slate-950">
           <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4">
             <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(ViewState.ONBOARDING)}>
                    <div className="p-2 bg-red-600 rounded-xl"><AlertOctagon className="w-5 h-5 text-white" /></div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black tracking-tighter truncate max-w-[150px] uppercase italic">{location.name}</h2>
                      {lastUpdate && <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Sync: {lastUpdate}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={toggleMonitoring} className={`p-2.5 rounded-xl transition-all ${isMonitoring ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        {isMonitoring ? <Bell className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
                    </button>
                    <button onClick={() => setShowSettings(true)} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl"><Settings className="w-5 h-5 text-slate-400" /></button>
                    <button onClick={refreshAlerts} className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl"><RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => setView(ViewState.ONBOARDING)} className="p-2.5 bg-blue-600 text-white rounded-xl"><Search className="w-5 h-5" /></button>
                </div>
             </div>
           </header>
           <main className="flex-1 overflow-y-auto px-6 py-8">
             <div className="max-w-3xl mx-auto space-y-8 pb-32">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Escaneando Protocolos...</p>
                    </div>
                ) : (
                    <>
                        <StatsChart events={alerts} />
                        {historyDate && (
                            <div className="bg-purple-600 p-6 rounded-[2rem] text-white flex items-center justify-between">
                                <div className="flex items-center gap-4"><Clock className="w-6 h-6" /><div><div className="text-[9px] font-black uppercase tracking-widest opacity-60">Registro Histórico</div><div className="text-lg font-black">{historyDate}</div></div></div>
                                <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase">Snapshot</span>
                            </div>
                        )}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                           <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2"><Radio className="w-4 h-4 animate-ping text-white" /> Inteligencia Situacional</h3>
                           <p className="text-white text-lg font-bold leading-tight">{analysis}</p>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-2">
                              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Siren className="w-4 h-4" /> Alertas Operativas</h3>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full uppercase">{alerts.length} Eventos</span>
                           </div>
                           {alerts.map(evt => <AlertCard key={evt.id} event={evt} />)}
                           {alerts.length === 0 && <div className="py-20 text-center opacity-30"><ShieldCheck className="w-12 h-12 mx-auto mb-4" /><p className="text-xs font-black uppercase tracking-widest">Sin Riesgos Detectados</p></div>}
                        </div>
                        {renderFooter("opacity-30")}
                    </>
                )}
             </div>
           </main>
           {renderSettingsModal()}
        </div>
      )}
    </div>
  );
}
