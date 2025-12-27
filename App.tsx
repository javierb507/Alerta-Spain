
import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, Navigation, Search, History, AlertOctagon, RotateCw, Loader2, 
  Bell, BellOff, Sun, Moon, Info, ShieldAlert, Radio, ShieldCheck, Siren, 
  ArrowLeft, Clock, Activity, CloudSun, Car, Wind, Thermometer
} from 'lucide-react';
import { AlertEvent, UserLocation, SeverityLevel, QuickStatus } from './types';
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
  const [radius, setRadius] = useState<number>(5); // Default search radius strictly 5km
  const [countdown, setCountdown] = useState(60);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [quickStatus, setQuickStatus] = useState<QuickStatus | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(false);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Automatic GPS fetching for the initial mini-dashboard on load
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

  useEffect(() => {
    if ('Notification' in window) setPermission(Notification.permission);
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  
  const [historyDate, setHistoryDate] = useState<string>('');
  const [historyLocation, setHistoryLocation] = useState<string>('');
  const [formDay, setFormDay] = useState<number>(new Date().getDate());
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth());
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formCategory, setFormCategory] = useState<string>('TODAS');

  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (view !== ViewState.DASHBOARD || historyDate || !isMonitoring || !location.name) {
      setCountdown(60);
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { refreshAlerts(); return 60; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [view, historyDate, isMonitoring, location.name]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setIsMonitoring(true);
    }
  };

  const toggleMonitoring = () => {
    if (isMonitoring) {
      setIsMonitoring(false);
    } else {
      if (permission === 'granted') {
        setIsMonitoring(true);
      } else {
        requestNotificationPermission();
      }
    }
  };

  const refreshAlerts = async () => {
    try {
      AudioService.playScan();
      const result = await fetchAlerts(location.name, undefined, radius);
      setAlerts(result.events);
      setAnalysis(result.analysis);
      setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (result.events.length > 0) AudioService.playSuccess();
    } catch (e) { 
      console.error("Refresh error:", e); 
      AudioService.playError();
    }
  };

  const handleGPSLocation = (target: 'current' | 'history') => {
    setLoading(true);
    AudioService.playScan();
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const locName = `${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
          if (target === 'current') {
            setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: `Cerca de ${locName}`, isGPS: true });
            // Using strictly 5km as default for GPS searches as requested
            const finalRadius = radius || 5; 
            await executeSearch(`Cerca de ${locName}`, undefined, finalRadius);
          } else {
            setHistoryLocation(`Cerca de ${locName}`);
            setLoading(false);
            AudioService.playSuccess();
          }
        },
        () => { 
          setLoading(false); 
          AudioService.playError();
          alert("Error de GPS. Por favor, introduce una ciudad manualmente."); 
        },
        { enableHighAccuracy: true }
      );
    } else {
        setLoading(false);
        AudioService.playError();
        alert("Geolocalización no soportada en este navegador.");
    }
  };

  const executeSearch = async (locName: string, date?: string, searchRadius?: number, category?: string) => {
    setLoading(true);
    setCountdown(60);
    try {
      const result = await fetchAlerts(locName, date, searchRadius || radius || 5, category);
      setAlerts(result.events);
      setAnalysis(result.analysis);
      setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      if (!date) setLocation(p => ({ ...p, name: locName }));
      AudioService.playSuccess();
      setView(ViewState.DASHBOARD);
    } catch (e) { 
      AudioService.playError();
      alert("Error de conexión con el sistema de monitorización. Inténtalo de nuevo."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleManualLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (location.name.trim()) executeSearch(location.name);
  };

  const handleHistorySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyLocation) return;
    const mm = (formMonth + 1).toString().padStart(2, '0');
    const dd = formDay.toString().padStart(2, '0');
    const dateStr = `${formYear}-${mm}-${dd}`;
    setHistoryDate(dateStr);
    await executeSearch(historyLocation, dateStr, undefined, formCategory);
  };

  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 30}, (_, i) => currentYear - i);

  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-start h-screen p-6 bg-slate-50 dark:bg-slate-950 relative overflow-y-auto bg-grid">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-50 dark:via-slate-950/50 dark:to-slate-950 pointer-events-none"></div>

      <button onClick={toggleTheme} aria-label="Cambiar tema" className="absolute top-6 right-6 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 transition-transform active:scale-90">
        {theme === 'dark' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-slate-700" />}
      </button>

      <div className="z-10 w-full max-w-md space-y-8 py-12 animate-in">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full scale-150 animate-pulse"></div>
             <div className="relative w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-red-600 z-10" />
                <div className="absolute inset-0 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl animate-spin-slow opacity-20"></div>
             </div>
          </div>
          <div className="text-center">
             <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-none">Monitor <span className="text-blue-600">España</span></h1>
             <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px] mt-1">Situación en Tiempo Real</p>
          </div>
        </div>

        {/* Compact Dashboard Widget */}
        <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-lg flex items-center gap-4 group transition-all hover:bg-white/80 dark:hover:bg-slate-900/80">
            <div className="flex-shrink-0 flex flex-col items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-4">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                   <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                </div>
                <span className="text-[7px] font-black uppercase text-slate-400">Live</span>
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                    <CloudSun className="w-4 h-4 text-orange-500" />
                    <div className="flex flex-col min-w-0">
                        {isQuickLoading ? <div className="h-4 w-8 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></div> : (
                            <span className="text-xs font-black text-slate-900 dark:text-white leading-none">{quickStatus?.weather.temp}</span>
                        )}
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter truncate">{quickStatus?.weather.condition || "Sincronizando..."}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Car className="w-4 h-4 text-blue-500" />
                    <div className="flex flex-col min-w-0">
                        {isQuickLoading ? <div className="h-4 w-8 bg-slate-200 dark:bg-slate-800 animate-pulse rounded"></div> : (
                            <span className="text-xs font-black text-slate-900 dark:text-white leading-none">{quickStatus?.traffic.status}</span>
                        )}
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter truncate">{quickStatus?.traffic.incidents} Incidencias</span>
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0 bg-blue-500/5 px-2 py-1 rounded-lg border border-blue-500/10 max-w-[80px]">
                <span className="text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase block truncate">{quickStatus?.location || "Buscando..."}</span>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
          <div className="space-y-3">
             <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                <span>Rango de búsqueda</span>
                <span className="text-blue-600 font-bold">{radius} KM</span>
             </div>
             <input type="range" min="5" max="50" step="5" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full appearance-none accent-blue-600 cursor-pointer" />
          </div>

          <div className="grid gap-4">
            <button onClick={() => handleGPSLocation('current')} disabled={loading} className="w-full py-4 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-blue-500/10 uppercase tracking-widest text-xs disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Navigation className="w-4 h-4" />}
                Escanear Posición Actual
            </button>
            <form onSubmit={handleManualLocation} className="flex gap-2">
                <input type="text" placeholder="Localidad o Municipio..." value={location.name} onChange={(e) => setLocation({ ...location, name: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3.5 text-xs font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                <button type="submit" aria-label="Buscar" className="bg-blue-600 text-white p-3.5 rounded-2xl shadow-lg active:scale-90 transition-all">
                    <Search className="w-4 h-4" />
                </button>
            </form>
          </div>
          <button onClick={() => { AudioService.playScan(); setView(ViewState.HISTORY); }} className="w-full text-[9px] font-black text-slate-400 hover:text-blue-600 flex items-center justify-center gap-2 uppercase tracking-[0.2em] transition-colors">
            <History className="w-3.5 h-3.5" /> Consultar Archivo Histórico
          </button>
        </div>

        <div className="flex items-start gap-4 p-4 bg-white/40 dark:bg-slate-900/20 rounded-3xl border border-slate-200/50 dark:border-slate-800/50">
            <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                Información agregada de AEMET, DGT y servicios de emergencia nacionales.
            </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans selection:bg-blue-500 selection:text-white">
      {view === ViewState.ONBOARDING && renderOnboarding()}
      {view === ViewState.HISTORY && (
        <div className="h-screen p-6 bg-grid overflow-y-auto relative">
            <button onClick={() => setView(ViewState.ONBOARDING)} className="absolute top-6 left-6 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 flex items-center gap-2 text-xs font-bold uppercase text-slate-500 transition-all hover:text-blue-600">
                <ArrowLeft className="w-4 h-4" /> Volver
            </button>
            <div className="max-w-md mx-auto py-24 space-y-12 animate-in">
                <div className="text-center space-y-2">
                    <Clock className="w-12 h-12 mx-auto text-purple-600 mb-4" />
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic text-slate-900 dark:text-white leading-none">Cápsula <br/> del Tiempo</h2>
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em]">Recuperación de Datos Históricos</p>
                </div>
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl">
                    <form onSubmit={handleHistorySearch} className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Ubicación para Archivo</label>
                           <div className="flex gap-2">
                              <input type="text" required placeholder="Ej: Madrid, Valencia..." value={historyLocation} onChange={(e) => setHistoryLocation(e.target.value)} className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-sm font-bold outline-none" />
                              <button type="button" onClick={() => handleGPSLocation('history')} disabled={loading} className="bg-purple-500/10 text-purple-500 p-4 rounded-2xl border border-purple-500/20 hover:bg-purple-500/20 transition-all active:scale-90 shadow-sm">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                              </button>
                           </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-center block">Fecha de Registro</label>
                            <div className="grid grid-cols-3 gap-2">
                                <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-xs font-bold text-center appearance-none">{Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}</select>
                                <select value={formMonth} onChange={(e) => setFormMonth(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-xs font-bold text-center appearance-none">{months.map((m, i) => <option key={i} value={i}>{m.slice(0,3)}</option>)}</select>
                                <select value={formYear} onChange={(e) => setFormYear(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 text-xs font-bold text-center appearance-none">{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
                            </div>
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-5 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all">
                            {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "Reconstruir Escenario"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
      )}
      {view === ViewState.DASHBOARD && (
        <div className="h-full flex flex-col animate-in">
           <header className="flex-shrink-0 sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-6 py-4 shadow-sm">
             <div className="max-w-3xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => { AudioService.playScan(); setView(ViewState.ONBOARDING); }}>
                    <div className="p-2 bg-red-600 rounded-xl shadow-lg shadow-red-500/20 transition-transform group-hover:scale-110"><AlertOctagon className="w-5 h-5 text-white" /></div>
                    <div className="min-w-0">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter truncate max-w-[140px] uppercase italic group-hover:text-blue-600 transition-colors leading-tight">{location.name}</h2>
                      {lastUpdate && <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Sincronizado: {lastUpdate}</p>}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleMonitoring} aria-label="Toggle Monitoring" className={`p-2.5 rounded-xl transition-all shadow-lg ${isMonitoring ? 'bg-red-500 text-white shadow-red-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        {isMonitoring ? <Bell className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
                    </button>
                    <button onClick={refreshAlerts} aria-label="Refresh" className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 hover:text-blue-500 transition-all"><RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                    <button onClick={() => { AudioService.playScan(); setView(ViewState.ONBOARDING); setHistoryDate(''); setHistoryLocation(''); }} aria-label="Search" className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all"><Search className="w-5 h-5" /></button>
                </div>
             </div>
           </header>
           <main className="flex-1 overflow-y-auto px-6 py-8">
             <div className="max-w-3xl mx-auto space-y-8 pb-32">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-6 opacity-60">
                        <div className="relative w-24 h-24">
                            <Loader2 className="w-full h-full animate-spin text-blue-600" />
                            <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-blue-600 uppercase">SCAN</div>
                        </div>
                        <div className="text-center space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Iniciando Protocolo de Análisis</p>
                          <p className="text-xs text-slate-400">Verificando bases de datos de AEMET y DGT...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <StatsChart events={alerts} />
                        
                        {historyDate && (
                            <div className="bg-purple-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-purple-500/20 flex items-center justify-between border border-purple-400/30">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-white/20 rounded-2xl"><Clock className="w-6 h-6" /></div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Registro Histórico Recuperado</div>
                                        <div className="text-lg font-black">{historyDate}</div>
                                    </div>
                                </div>
                                <div className="text-[10px] font-black bg-white/10 px-3 py-1 rounded-full uppercase border border-white/20">Snapshot</div>
                            </div>
                        )}

                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group border border-blue-400/30">
                           <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 animate-pulse-slow"></div>
                           <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                             <Radio className="w-4 h-4 animate-ping text-white" /> Inteligencia Situacional
                           </h3>
                           <p className="text-white text-lg font-bold leading-tight tracking-tight drop-shadow-md">{analysis}</p>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-2">
                              <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Siren className="w-4 h-4" /> Alertas Operativas
                              </h3>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full uppercase">{alerts.length} Eventos</span>
                           </div>
                           {alerts.map(evt => <AlertCard key={evt.id} event={evt} />)}
                           {alerts.length === 0 && (
                               <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] opacity-30">
                                   <ShieldCheck className="w-12 h-12 mb-4" />
                                   <p className="text-xs font-black uppercase tracking-widest">Estado Nominal - Sin Alertas Detectadas</p>
                               </div>
                           )}
                        </div>
                    </>
                )}
             </div>
           </main>
           <footer className="fixed bottom-0 left-0 right-0 p-6 pointer-events-none">
              <div className="max-w-3xl mx-auto flex justify-center">
                  <div className="bg-white/90 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-[2rem] shadow-2xl pointer-events-auto flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_red]"></div> CRÍTICO</div>
                      <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> AVISO</div>
                      <div className="flex items-center gap-2 text-blue-500"><Activity className="w-3.5 h-3.5" /> FEED EN VIVO</div>
                  </div>
              </div>
           </footer>
        </div>
      )}
    </div>
  );
}
