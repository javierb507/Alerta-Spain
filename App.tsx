import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, Search, History, AlertOctagon, RotateCw, Loader2, Bell, BellOff, Calendar, Filter } from 'lucide-react';
import { AlertEvent, UserLocation, SeverityLevel } from './types';
import { fetchAlerts } from './services/geminiService';
import AlertCard from './components/AlertCard';
import StatsChart from './components/StatsChart';

enum ViewState {
  ONBOARDING,
  DASHBOARD,
  HISTORY
}

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.ONBOARDING);
  const [location, setLocation] = useState<UserLocation>({ name: '', isGPS: false });
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState<number>(10); // Default 10km
  
  // History Mode State - Active query
  const [historyDate, setHistoryDate] = useState<string>('');
  const [activeHistoryCategory, setActiveHistoryCategory] = useState<string>('');
  
  // History Form State
  const [historyLocation, setHistoryLocation] = useState<string>('');
  const [formDay, setFormDay] = useState<number>(new Date().getDate());
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth()); // 0-11
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formCategory, setFormCategory] = useState<string>('TODAS');

  // Notification & Real-time State
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const seenAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador no soporta notificaciones.');
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setIsMonitoring(true);
      // Send a test notification
      new Notification('Alertas Activas', {
        body: `Monitorización en tiempo real activada para ${location.name}.`,
        icon: '/favicon.ico'
      });
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

  // Check for critical alerts and notify
  const checkAndNotify = (newAlerts: AlertEvent[]) => {
    if (permission !== 'granted' || !isMonitoring) return;

    newAlerts.forEach(alert => {
      // Only notify for Critical or Warning events that we haven't seen yet
      if ((alert.severity === SeverityLevel.CRITICAL || alert.severity === SeverityLevel.WARNING) && 
          !seenAlertsRef.current.has(alert.id)) {
        
        // Add to seen set
        seenAlertsRef.current.add(alert.id);

        // Dispatch Notification
        new Notification(`⚠️ ${alert.severity}: ${alert.title}`, {
          body: alert.description,
          tag: alert.id, // Prevent duplicate notifications on some systems
          requireInteraction: alert.severity === SeverityLevel.CRITICAL
        });
      }
    });
  };

  // Background Polling Effect
  useEffect(() => {
    if (view !== ViewState.DASHBOARD || historyDate || !isMonitoring || !location.name) return;

    const intervalId = setInterval(async () => {
      console.log("Polling for updates...");
      try {
        // Silent fetch - do not set main loading state to avoid UI flicker
        // Pass radius for live updates as well
        const result = await fetchAlerts(location.name, undefined, radius);
        setAlerts(result.events);
        setAnalysis(result.analysis);
        checkAndNotify(result.events);
      } catch (e) {
        console.error("Background polling failed", e);
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(intervalId);
  }, [view, historyDate, isMonitoring, location.name, permission, radius]);


  const handleGPSLocation = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          
          setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, name: `GPS: ${lat}, ${lng}`, isGPS: true });
          await executeSearch(`Coordenadas ${lat}, ${lng} España`, undefined, radius);
        },
        (error) => {
          console.error("GPS Error", error);
          setLoading(false);
          alert("No se pudo obtener el GPS. Por favor introduzca la ubicación manualmente.");
        }
      );
    } else {
      setLoading(false);
      alert("Geolocalización no soportada.");
    }
  };

  const handleHistoryGPS = () => {
    setLoading(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(4);
          const lng = position.coords.longitude.toFixed(4);
          setHistoryLocation(`Coordenadas GPS: ${lat}, ${lng}`);
          setLoading(false);
        },
        (error) => {
          console.error("GPS Error", error);
          setLoading(false);
          alert("No se pudo obtener el GPS.");
        }
      );
    } else {
      setLoading(false);
      alert("Geolocalización no soportada.");
    }
  };

  const handleManualLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.name) return;
    await executeSearch(location.name);
  };

  const executeSearch = async (locName: string, date?: string, searchRadius?: number, category?: string) => {
    setLoading(true);
    // Reset seen alerts on new search to allow fresh notifications
    seenAlertsRef.current.clear();
    
    // Default radius for manual search if not provided via state, though standard fetch will use state radius if live
    const effectiveRadius = searchRadius || radius;

    const result = await fetchAlerts(locName, date, effectiveRadius, category);
    setAlerts(result.events);
    setAnalysis(result.analysis);
    
    if (isMonitoring) {
        checkAndNotify(result.events);
    }
    
    if (!location.name || location.name.startsWith('GPS')) {
       setLocation(prev => ({ ...prev, name: locName }));
    }

    setLoading(false);
    setView(ViewState.DASHBOARD);
  };

  const handleHistorySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyLocation) return;
    
    // Construct date string YYYY-MM-DD
    const mm = (formMonth + 1).toString().padStart(2, '0');
    const dd = formDay.toString().padStart(2, '0');
    const dateStr = `${formYear}-${mm}-${dd}`;
    
    setHistoryDate(dateStr);
    setActiveHistoryCategory(formCategory);
    
    setLoading(true);
    const result = await fetchAlerts(historyLocation, dateStr, undefined, formCategory);
    setAlerts(result.events);
    setAnalysis(result.analysis);
    setLocation({ name: historyLocation, isGPS: false });
    setIsMonitoring(false); // Disable monitoring for history
    setView(ViewState.DASHBOARD); 
    setLoading(false);
  };

  // Helper arrays for date selectors
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 30}, (_, i) => currentYear - i);
  // Calculate days in selected month
  const daysInMonth = new Date(formYear, formMonth + 1, 0).getDate();
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  // Categories for History
  const categories = [
    "TODAS", "Emergencias 112", "ES-Alert", "Incendios", "Clima / AEMET", "Tráfico / DGT", "Seguridad Ciudadana"
  ];

  // Onboarding View
  const renderOnboarding = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emergency-500/10 rounded-full blur-[100px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="z-10 w-full max-w-md space-y-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl shadow-emergency-900/20 border border-slate-800">
             <AlertOctagon className="w-10 h-10 text-emergency-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
            ALERTA ESPAÑA
          </h1>
          <p className="text-slate-400 text-lg">
            Monitor de emergencias en tiempo real.
          </p>
          <div className="bg-yellow-900/20 border border-yellow-700/50 px-3 py-1 rounded-full">
            <p className="text-xs text-yellow-500 font-semibold tracking-wide uppercase">
              Solo disponible en territorio español 🇪🇸
            </p>
          </div>
        </div>

        <div className="w-full bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl text-left">
          
          <div className="mb-6">
             <label className="flex justify-between text-xs text-slate-400 mb-2 font-mono uppercase tracking-wider">
                <span>Radio de cobertura</span>
                <span className="text-white font-bold">{radius} km</span>
             </label>
             <input 
                type="range" 
                min="5" 
                max="100" 
                step="5"
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-colors"
             />
             <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>5 km (Local)</span>
                <span>100 km (Regional)</span>
             </div>
          </div>

          <button 
            onClick={handleGPSLocation}
            disabled={loading}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 mb-4 group"
          >
            {loading ? <Loader2 className="animate-spin" /> : <Navigation className="w-5 h-5 group-hover:animate-pulse" />}
            Usar mi ubicación actual
          </button>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-xs uppercase tracking-widest">o busca tu ciudad</span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          <form onSubmit={handleManualLocation} className="mt-4 flex gap-2">
            <input 
              type="text" 
              placeholder="Ej: Toledo, Valencia, Madrid..." 
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={location.name}
              onChange={(e) => setLocation({ ...location, name: e.target.value })}
            />
            <button 
              type="submit"
              disabled={loading || !location.name}
              className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-xl transition-colors border border-slate-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>
          </form>
          
          <button 
            onClick={() => setView(ViewState.HISTORY)}
            className="w-full mt-4 py-2 text-xs text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
          >
            <History className="w-3 h-3" />
            Búsqueda histórica
          </button>
        </div>
      </div>
    </div>
  );

  // History Search View
  const renderHistory = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-950">
      <div className="w-full max-w-md bg-slate-900/80 p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-6 text-slate-300 cursor-pointer" onClick={() => setView(ViewState.ONBOARDING)}>
          <Calendar className="w-6 h-6 text-purple-500" />
          <span className="text-xl font-bold">Archivo Histórico</span>
        </div>
        
        <form onSubmit={handleHistorySearch} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Ubicación</label>
            <div className="flex gap-2">
                <input 
                  type="text"
                  required
                  value={historyLocation}
                  onChange={(e) => setHistoryLocation(e.target.value)}
                  placeholder="Ciudad o región"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                />
                <button 
                    type="button"
                    onClick={handleHistoryGPS}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-3 rounded-lg border border-slate-700 transition-colors flex items-center justify-center"
                    title="Usar mi ubicación"
                    disabled={loading}
                >
                    {loading && !historyLocation ? <Loader2 className="animate-spin w-5 h-5" /> : <Navigation className="w-5 h-5 text-blue-400" />}
                </button>
            </div>
          </div>
          
          <div>
             <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Categoría</label>
             <div className="relative">
                 <select 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white appearance-none focus:border-purple-500 focus:outline-none"
                 >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
                 <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
             </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 uppercase font-bold mb-1 block">Fecha del Evento</label>
            <div className="grid grid-cols-3 gap-2">
                {/* Day */}
                <div className="relative">
                   <select 
                      value={formDay} 
                      onChange={(e) => setFormDay(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-3 text-white appearance-none text-center focus:border-purple-500 focus:outline-none"
                   >
                     {days.map(d => <option key={d} value={d}>{d}</option>)}
                   </select>
                   <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">Día</span>
                </div>

                {/* Month */}
                <div className="relative">
                    <select 
                        value={formMonth} 
                        onChange={(e) => {
                            const newMonth = Number(e.target.value);
                            setFormMonth(newMonth);
                            // Adjust day if new month has fewer days
                            const maxDay = new Date(formYear, newMonth + 1, 0).getDate();
                            if (formDay > maxDay) setFormDay(maxDay);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-3 text-white appearance-none text-center focus:border-purple-500 focus:outline-none"
                    >
                        {months.map((m, idx) => <option key={idx} value={idx}>{m.substring(0,3)}</option>)}
                    </select>
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">Mes</span>
                </div>

                {/* Year */}
                 <div className="relative">
                    <select 
                        value={formYear} 
                        onChange={(e) => setFormYear(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-3 text-white appearance-none text-center focus:border-purple-500 focus:outline-none"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                     <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">Año</span>
                 </div>
            </div>
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
             {loading ? <Loader2 className="animate-spin" /> : <Search className="w-4 h-4" />}
             Buscar en el pasado
          </button>
        </form>
        <button onClick={() => setView(ViewState.ONBOARDING)} className="mt-4 text-sm text-slate-500 w-full text-center hover:text-white">Cancelar</button>
      </div>
    </div>
  );

  // Dashboard View
  const renderDashboard = () => (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-2" onClick={() => setView(ViewState.ONBOARDING)}>
            <MapPin className="text-emergency-500 w-5 h-5" />
            <h2 className="font-bold text-lg text-white truncate max-w-[150px] sm:max-w-none capitalize">{location.name}</h2>
          </div>
          <div className="flex gap-2">
            {!historyDate && (
               <button
                  onClick={toggleMonitoring}
                  className={`p-2 rounded-full transition-all ${isMonitoring ? 'bg-emergency-500/20 text-emergency-500 ring-2 ring-emergency-500/50' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                  title={isMonitoring ? "Monitorización activada (Notificaciones ON)" : "Activar monitorización"}
               >
                  {isMonitoring ? <Bell className="w-5 h-5 animate-pulse" /> : <BellOff className="w-5 h-5" />}
               </button>
            )}
            <button 
               onClick={() => executeSearch(location.name, historyDate || undefined, radius, activeHistoryCategory)}
               className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            >
              <RotateCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
             <button 
               onClick={() => {
                   setHistoryDate(''); 
                   setHistoryLocation('');
                   setView(ViewState.ONBOARDING);
                   setIsMonitoring(false);
               }}
               className="p-2 bg-slate-800 rounded-full text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-2xl mx-auto w-full overflow-y-auto no-scrollbar pb-24">
        
        {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="animate-pulse">Analizando redes sociales y fuentes oficiales...</p>
            </div>
        ) : (
            <>
                {/* Monitor Status Banner */}
                {isMonitoring && !historyDate && (
                   <div className="bg-emergency-900/30 border border-emergency-500/30 rounded-lg p-3 mb-4 flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-2 text-emergency-200">
                         <span className="relative flex h-3 w-3">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                         </span>
                         <span className="text-xs font-bold uppercase tracking-wider">Monitorizando ({radius}km)</span>
                      </div>
                      <span className="text-xs text-emergency-200/50 font-mono">Actualiza cada 60s</span>
                   </div>
                )}
                
                {/* Historical Banner */}
                {historyDate && (
                     <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3 mb-4 flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                             <Calendar className="w-5 h-5 text-purple-400" />
                            <div>
                                <div className="text-purple-200 text-sm font-bold">Archivo Histórico</div>
                                <div className="text-purple-300/70 text-xs">Eventos del {historyDate}</div>
                            </div>
                        </div>
                        {activeHistoryCategory !== 'TODAS' && (
                             <div className="mt-1 ml-8 text-xs bg-purple-950/50 inline-block px-2 py-1 rounded text-purple-200 border border-purple-800">
                                 Filtro: {activeHistoryCategory}
                             </div>
                        )}
                     </div>
                )}

                {/* Simplified Graph */}
                <StatsChart events={alerts} />

                {/* AI Summary */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-xl border border-slate-700 mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                    <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <AlertOctagon className="w-3 h-3" />
                        Informe de Situación
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-200">{analysis}</p>
                </div>

                <h3 className="text-lg font-bold text-white mb-3">Eventos Detectados ({alerts.length})</h3>
                <div className="space-y-4">
                    {alerts.map(event => (
                        <AlertCard key={event.id} event={event} />
                    ))}
                    {alerts.length === 0 && (
                        <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-xl">
                            No se encontraron eventos significativos.
                        </div>
                    )}
                </div>
            </>
        )}
      </main>
      
      {/* Sticky Legend/Footer */}
      <div className="fixed bottom-0 w-full bg-slate-900 border-t border-slate-800 p-3 text-xs text-slate-400 flex justify-center gap-4 z-40 max-w-2xl left-1/2 -translate-x-1/2 rounded-t-xl">
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Crítico</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Aviso</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Oficial</div>
          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Social</div>
      </div>
    </div>
  );

  return (
    <>
      {view === ViewState.ONBOARDING && renderOnboarding()}
      {view === ViewState.HISTORY && renderHistory()}
      {view === ViewState.DASHBOARD && renderDashboard()}
    </>
  );
}