
import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation, Search, History, AlertOctagon, RotateCw, Loader2,
  Bell, BellOff, Sun, Moon, ShieldAlert, Radio, ShieldCheck, Siren,
  ArrowLeft, Clock, Activity, CloudSun, Car, Settings,
  Trash2, Globe, X, KeyRound, ClipboardCopy, ClipboardPaste,
  WifiOff, CheckCircle2, XCircle, Share2, Volume2, VolumeX, Star, Gift
} from 'lucide-react';
import { AlertEvent, UserLocation, SeverityLevel, QuickStatus, CustomSource, SourceType, SavedLocation } from './types';
import { fetchAlerts } from './services/alertsService';
import { AIConfig, LLM_PRESETS, loadConfig, saveConfig, getPreset, sharedModeAvailable } from './services/config';
import { testConnections, TestResult } from './services/connectionTest';
import { fetchQuickStatus, geocodeLocation } from './services/weatherService';
import { AudioService } from './services/audioService';
import AlertCard from './components/AlertCard';
import StatsChart from './components/StatsChart';
import MapView from './components/MapView';
import SOSPanel from './components/SOSPanel';
import GuidesPanel from './components/GuidesPanel';
import { distanceKm } from './services/geo';
import { speak, stopSpeaking, speechSupported } from './services/speechService';
import SharePanel from './components/SharePanel';
import { ReportData } from './services/reportService';

enum ViewState { ONBOARDING, DASHBOARD, HISTORY }

export default function App() {
  const [view, setView] = useState<ViewState>(ViewState.ONBOARDING);
  // Preferencias persistidas por usuario (localStorage)
  const [location, setLocation] = useState<UserLocation>(() => ({ name: localStorage.getItem('last_location') || '', isGPS: false }));
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [analysis, setAnalysis] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>(() => localStorage.getItem('category_filter') || 'TODAS');
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState<number>(() => Number(localStorage.getItem('radius')) || 5);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [quickStatus, setQuickStatus] = useState<QuickStatus | null>(null);
  const [isQuickLoading, setIsQuickLoading] = useState(false);
  // Timestamp de datos cacheados cuando se muestra la última búsqueda sin conexión
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  // Centro del mapa: coords de la ubicación buscada
  const [mapCenter, setMapCenter] = useState<{ lat: number, lng: number } | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recent_searches');
    return saved ? JSON.parse(saved) : [];
  });

  // Zonas vigiladas: ubicaciones guardadas con nombre propio (casa, trabajo, familia)
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => {
    const saved = localStorage.getItem('saved_locations');
    return saved ? JSON.parse(saved) : [];
  });
  const persistSaved = (next: SavedLocation[]) => {
    setSavedLocations(next);
    localStorage.setItem('saved_locations', JSON.stringify(next));
  };
  const currentSaved = savedLocations.find(s => s.query === location.name);
  const toggleSaveLocation = () => {
    if (!location.name) return;
    if (currentSaved) {
      persistSaved(savedLocations.filter(s => s.id !== currentSaved.id));
      AudioService.playScan();
      return;
    }
    const label = prompt('Nombre para esta zona (ej: Casa, Trabajo):', location.name);
    if (!label) return;
    persistSaved([...savedLocations, { id: Math.random().toString(36).slice(2, 11), label, query: location.name }]);
    AudioService.playSuccess();
  };
  
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
  // Guías de autoprotección offline
  const [guidesOpen, setGuidesOpen] = useState(false);
  const [activeGuideId, setActiveGuideId] = useState<string | undefined>();
  const openGuide = (id?: string) => { setActiveGuideId(id); setGuidesOpen(true); };
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceType>(SourceType.OFFICIAL);

  // Configuración de proveedores de IA/búsqueda (persistida en localStorage)
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => loadConfig());
  const updateAIConfig = (patch: Partial<AIConfig>) => {
    setAiConfig(prev => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  };
  const handlePresetChange = (id: string) => {
    const preset = getPreset(id);
    updateAIConfig({ llmPreset: id, llmBaseUrl: preset.baseUrl, llmModel: preset.defaultModel });
  };
  // Sin ninguna clave configurada la app no puede buscar alertas: se guía al usuario a Ajustes
  // En modo servidor compartido el usuario no configura claves: el proxy las tiene.
  const needsSetup = aiConfig.apiMode !== 'shared' &&
    !aiConfig.llmApiKey && !aiConfig.geminiApiKey && !aiConfig.tavilyApiKey;
  const usingSharedTier = aiConfig.apiMode === 'shared';
  // Cuota restante del servidor gratuito compartido (la reporta el proxy)
  const [sharedQuota, setSharedQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  // Prueba de conexión de las claves configuradas
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [testing, setTesting] = useState(false);
  const runConnectionTest = async () => {
    setTesting(true);
    setTestResults(null);
    const results = await testConnections(aiConfig);
    setTestResults(results);
    setTesting(false);
    if (results.some(r => r.ok)) AudioService.playSuccess();
    else AudioService.playError();
  };

  // Exportar/importar configuración entre dispositivos (evita teclear claves en el móvil)
  const exportConfig = async () => {
    const payload = JSON.stringify({ ai_config: aiConfig, custom_sources: customSources, saved_locations: savedLocations });
    try {
      await navigator.clipboard.writeText(payload);
      AudioService.playSuccess();
      alert("Configuración copiada al portapapeles. Pégala en Ajustes → Importar en tu otro dispositivo.");
    } catch {
      prompt("Copia este texto manualmente:", payload);
    }
  };

  const importConfig = () => {
    const raw = prompt("Pega aquí la configuración exportada:");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      if (data.ai_config) updateAIConfig(data.ai_config);
      if (Array.isArray(data.custom_sources)) setCustomSources(data.custom_sources);
      if (Array.isArray(data.saved_locations)) persistSaved(data.saved_locations);
      AudioService.playSuccess();
      alert("Configuración importada correctamente.");
    } catch {
      AudioService.playError();
      alert("Formato inválido. Usa el texto generado por Exportar.");
    }
  };

  // Formulario de Historia
  const [formDay, setFormDay] = useState(new Date().getDate());
  const [formMonth, setFormMonth] = useState(new Date().getMonth());
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [historyLocation, setHistoryLocation] = useState<string>('');
  const [historyDate, setHistoryDate] = useState<string>('');

  const currentYear = new Date().getFullYear();
  const authorName = "Javier Ballesteros";
  // Inyectados por Vite en build (vite.config.ts → define)
  const APP_VERSION = __APP_VERSION__;
  const DEPLOYMENT_DATE = new Date(__BUILD_DATE__).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

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
    localStorage.setItem('radius', String(radius));
  }, [radius]);

  useEffect(() => {
    localStorage.setItem('category_filter', categoryFilter);
  }, [categoryFilter]);

  // Apertura instantánea: restaurar la última búsqueda al arrancar (online u offline)
  // y, si los datos tienen más de 10 minutos y hay conexión, re-escanear en segundo plano.
  useEffect(() => {
    const saved = localStorage.getItem('last_search');
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      if (data.historyDate) return; // no restaurar snapshots históricos
      setAlerts(data.alerts || []);
      setAnalysis(data.analysis || '');
      setLocation({ name: data.location || '', isGPS: false });
      setCachedAt(data.timestamp);
      if (data.mapCenter) setMapCenter(data.mapCenter);
      setView(ViewState.DASHBOARD);
      const STALE_MS = 10 * 60 * 1000;
      if (navigator.onLine && data.location && Date.now() - data.timestamp > STALE_MS) {
        executeSearch(data.location);
      }
    } catch { /* caché corrupta: ignorar */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const initQuickStatus = async () => {
      setIsQuickLoading(true);
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const data = await fetchQuickStatus({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude
            });
            setQuickStatus(data);
            setIsQuickLoading(false);
          },
          async () => {
            const data = await fetchQuickStatus();
            setQuickStatus(data);
            setIsQuickLoading(false);
          },
          { timeout: 5000, enableHighAccuracy: true }
        );
      } else {
        const data = await fetchQuickStatus();
        setQuickStatus(data);
        setIsQuickLoading(false);
      }
    };
    initQuickStatus();
  }, []);

  // Timer para refresco automático cuando la monitorización está activa.
  // Se usa un ref para que el interval siempre llame a la versión actual de refreshAlerts
  // (evita closures obsoletos sobre radius/customSources).
  const refreshRef = useRef<() => void>(() => {});
  useEffect(() => {
    refreshRef.current = refreshAlerts;
  });

  useEffect(() => {
    let interval: number;
    if (isMonitoring && location.name && view === ViewState.DASHBOARD) {
      interval = window.setInterval(() => {
        // Cada refresco consume búsqueda web + 2 llamadas LLM: no refrescar
        // con la pestaña en segundo plano para no quemar cuota/créditos.
        if (document.hidden) return;
        refreshRef.current();
      }, 300000); // Refresco cada 5 minutos
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, location.name, view]);

  const sendNotification = (alert: AlertEvent) => {
    if (Notification.permission === 'granted' && isMonitoring) {
      new Notification(`🚨 MONITOR ESPAÑA: ${alert.title}`, {
        body: alert.description,
        icon: `${import.meta.env.BASE_URL}logo.svg`
      });
    }
  };

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const toggleMonitoring = async () => {
    if (!isMonitoring) {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
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
      id: Math.random().toString(36).slice(2, 11),
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
      // Al cambiar de ubicación, las alertas vistas de la anterior ya no aplican
      if (locName !== location.name) {
        seenAlertIds.current.clear();
      }

      const result = await fetchAlerts(locName, date, searchRadius || radius, categoryFilter, customSources);

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
      if (result.quota) setSharedQuota(result.quota);
      if (result.limitReached) setSharedQuota({ used: 0, limit: 0, remaining: 0 });
      setLastUpdate(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      
      setLocation({ name: locName, isGPS: false });
      localStorage.setItem('last_location', locName);
      setHistoryDate(date || '');
      setCachedAt(null);

      // Centro del mapa: coords embebidas en búsquedas GPS ("Cerca de lat, lng") o geocoding.
      // Se guarda también en la caché para que la restauración al arrancar tenga mapa y distancias.
      const applyMapCenter = (center: { lat: number, lng: number } | null) => {
        setMapCenter(center);
        if (!center) return;
        const saved = localStorage.getItem('last_search');
        if (saved) {
          try {
            const data = JSON.parse(saved);
            data.mapCenter = center;
            localStorage.setItem('last_search', JSON.stringify(data));
          } catch { /* caché corrupta: ignorar */ }
        }
      };
      const coordMatch = locName.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
      if (coordMatch) {
        applyMapCenter({ lat: Number(coordMatch[1]), lng: Number(coordMatch[2]) });
      } else {
        geocodeLocation(locName).then(applyMapCenter);
      }

      // Caché para modo offline y lista de búsquedas recientes
      localStorage.setItem('last_search', JSON.stringify({
        alerts: result.events, analysis: result.analysis,
        location: locName, historyDate: date || '', timestamp: Date.now()
      }));
      if (!date) {
        setRecentSearches(prev => {
          const next = [locName, ...prev.filter(s => s !== locName)].slice(0, 5);
          localStorage.setItem('recent_searches', JSON.stringify(next));
          return next;
        });
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
    if (!('geolocation' in navigator)) {
      AudioService.playError();
      alert("Tu navegador no soporta geolocalización.");
      return;
    }
    setLoading(true);
    AudioService.playScan();
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
  };

  const handleHistorySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const dateStr = `${formYear}-${String(formMonth + 1).padStart(2, '0')}-${String(formDay).padStart(2, '0')}`;
    executeSearch(historyLocation, dateStr);
  };

  // Filtro de categorías: filtra la lista en cliente y se pasa al prompt de búsqueda.
  const CATEGORIES = ['TODAS', 'Incendio', 'Clima', 'Tráfico', 'Transporte', 'Seguridad'];
  const filteredAlerts = categoryFilter === 'TODAS'
    ? alerts
    : alerts.filter(a => (a.category || '').toLowerCase().includes(categoryFilter.toLowerCase()));

  // Distancia real al centro buscado; se ordena por cercanía (sin coords al final)
  const alertDistance = (a: AlertEvent): number | undefined =>
    mapCenter && a.lat !== undefined && a.lng !== undefined
      ? distanceKm(mapCenter, { lat: a.lat, lng: a.lng })
      : undefined;
  const visibleAlerts = [...filteredAlerts].sort((a, b) =>
    (alertDistance(a) ?? Infinity) - (alertDistance(b) ?? Infinity));

  // Nivel de riesgo global (mismo criterio que el gauge de StatsChart)
  const riskLabel = (() => {
    const order = [SeverityLevel.CRITICAL, SeverityLevel.WARNING, SeverityLevel.INFO];
    const labels = { [SeverityLevel.CRITICAL]: 'CRÍTICO', [SeverityLevel.WARNING]: 'ALERTA', [SeverityLevel.INFO]: 'INFO' } as Record<SeverityLevel, string>;
    for (const s of order) if (alerts.some(a => a.severity === s)) return labels[s];
    return 'SEGURO';
  })();

  // Lectura en voz alta del parte de situación (manos libres / accesibilidad)
  const [speaking, setSpeaking] = useState(false);
  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    const top = visibleAlerts.slice(0, 3).map(a => {
      const d = alertDistance(a);
      return `${a.title}${d !== undefined ? `, a ${d < 1 ? `${Math.round(d * 1000)} metros` : `${d.toFixed(1)} kilómetros`}` : ''}.`;
    }).join(' ');
    const text = `Situación en ${location.name}. Nivel de riesgo: ${riskLabel}. ${analysis} ${top ? `Alertas más cercanas: ${top}` : ''}`;
    setSpeaking(true);
    speak(text, () => setSpeaking(false));
  };

  // Detener la locución al salir del dashboard
  useEffect(() => {
    if (view !== ViewState.DASHBOARD) {
      stopSpeaking();
      setSpeaking(false);
    }
  }, [view]);

  // Informe de situación compartible, con la fuente original de cada alerta
  const [shareOpen, setShareOpen] = useState(false);
  const reportData: ReportData = {
    location: location.name,
    riskLabel,
    analysis,
    alerts: visibleAlerts,
    distances: new Map(visibleAlerts.map(a => [a.id, alertDistance(a)])),
    timestamp: cachedAt ?? Date.now(),
  };

  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  // Días válidos según mes/año seleccionados (evita fechas como 31 de febrero)
  const daysInMonth = new Date(formYear, formMonth + 1, 0).getDate();
  useEffect(() => {
    if (formDay > daysInMonth) setFormDay(daysInMonth);
  }, [formDay, daysInMonth]);

  const renderFooter = (opacityClass: string = "opacity-40") => (
    <div className={`text-center space-y-1 py-4 ${opacityClass}`}>
      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">
        Autor: {authorName} • {currentYear}
      </p>
      <p className="text-[7px] font-bold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600">
        v{APP_VERSION} • Último despliegue: {DEPLOYMENT_DATE}
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

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Modo de conexión</p>
                <div className="space-y-2">
                    <button
                        onClick={() => sharedModeAvailable() && updateAIConfig({ apiMode: 'shared' })}
                        disabled={!sharedModeAvailable()}
                        className={`w-full text-left p-4 rounded-2xl border transition-colors ${aiConfig.apiMode === 'shared' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'} ${!sharedModeAvailable() ? 'opacity-50' : ''}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-slate-900 dark:text-white">Servidor compartido</span>
                            {!sharedModeAvailable() && <span className="text-[8px] font-black uppercase text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md">Próximamente</span>}
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 leading-snug">Sin configurar nada, con cuota diaria limitada. Requiere el proxy del servidor.</p>
                    </button>
                    <button
                        onClick={() => updateAIConfig({ apiMode: 'own' })}
                        className={`w-full text-left p-4 rounded-2xl border transition-colors ${aiConfig.apiMode === 'own' ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}
                    >
                        <span className="text-[11px] font-black uppercase text-slate-900 dark:text-white">Mis claves</span>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 leading-snug">Tus claves, sin límite compartido. Se guardan solo en este dispositivo.</p>
                    </button>
                </div>

                {needsSetup && (
                    <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 space-y-1">
                        <p className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400">Combinación gratuita recomendada</p>
                        <p className="text-[9px] font-bold text-emerald-700/80 dark:text-emerald-400/80 leading-snug">
                            IA: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline">Groq</a> (sin tarjeta, ~60 consultas al día) ·
                            Búsqueda: <a href="https://app.tavily.com" target="_blank" rel="noreferrer" className="underline">Tavily</a> (1.000 al mes).
                            Cada consulta gasta unos 4.000 tokens.
                        </p>
                    </div>
                )}

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Proveedor de IA</p>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <select value={aiConfig.llmPreset} onChange={(e) => handlePresetChange(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none appearance-none">
                        {LLM_PRESETS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {getPreset(aiConfig.llmPreset).freeNote && (
                        <p className="text-[9px] text-slate-400 font-bold px-1">Plan gratuito: {getPreset(aiConfig.llmPreset).freeNote}</p>
                    )}
                    {aiConfig.llmPreset === 'custom' && (
                        <input type="text" placeholder="Base URL (ej: https://api.../v1)" value={aiConfig.llmBaseUrl} onChange={(e) => updateAIConfig({ llmBaseUrl: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    )}
                    <input type="text" placeholder="Modelo" value={aiConfig.llmModel} onChange={(e) => updateAIConfig({ llmModel: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <input type="password" placeholder="Clave de API del proveedor" value={aiConfig.llmApiKey} onChange={(e) => updateAIConfig({ llmApiKey: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <p className="text-[9px] text-slate-400 font-bold leading-snug">Las claves se guardan solo en este dispositivo (localStorage), nunca en el servidor.</p>
                    <p className="text-[9px] text-slate-400 font-bold leading-snug">
                        Claves gratis:{' '}
                        <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-blue-500 underline">Groq</a>{' · '}
                        <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-500 underline">Gemini</a>{' · '}
                        <a href="https://app.tavily.com" target="_blank" rel="noreferrer" className="text-blue-500 underline">Tavily</a>
                    </p>
                </div>

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Búsqueda Web</p>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <input type="password" placeholder="Clave Gemini (Google Search grounding)" value={aiConfig.geminiApiKey} onChange={(e) => updateAIConfig({ geminiApiKey: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <input type="password" placeholder="Clave Tavily (alternativa gratuita)" value={aiConfig.tavilyApiKey} onChange={(e) => updateAIConfig({ tavilyApiKey: e.target.value })} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <p className="text-[9px] text-slate-400 font-bold leading-snug">Se usa Gemini si tiene clave; si falla o no hay, Tavily (gratis en tavily.com).</p>
                </div>

                <button onClick={runConnectionTest} disabled={testing} className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                    {testing ? 'Probando...' : 'Probar Conexión'}
                </button>
                {testResults && (
                    <div className="space-y-2">
                        {testResults.map(r => (
                            <div key={r.name} className={`flex items-start gap-2 p-3 rounded-xl border text-[10px] font-bold ${r.ok ? 'border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                                {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />}
                                <div><span className="uppercase">{r.name}</span>: {r.detail}</div>
                            </div>
                        ))}
                    </div>
                )}

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Fuentes Locales de Información</p>
                <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <input type="text" placeholder="Nombre (ej: Prot. Civil Valencia)" value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <input type="text" placeholder="Web o RRSS" value={newSourceUrl} onChange={(e) => setNewSourceUrl(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
                    <button onClick={addCustomSource} className="w-full bg-blue-600 text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest">Añadir Fuente</button>
                </div>

                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Copiar Configuración a Otro Dispositivo</p>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={exportConfig} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                        <ClipboardCopy className="w-3.5 h-3.5" /> Exportar
                    </button>
                    <button onClick={importConfig} className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                        <ClipboardPaste className="w-3.5 h-3.5" /> Importar
                    </button>
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
      <SOSPanel onOpenGuides={() => openGuide()} />
      <GuidesPanel open={guidesOpen} onClose={() => setGuidesOpen(false)} initialGuideId={activeGuideId} />
      <SharePanel open={shareOpen} onClose={() => setShareOpen(false)} data={reportData} />
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

            {needsSetup && (
              <button onClick={() => setShowSettings(true)} className="w-full p-4 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 flex items-center gap-3 text-left">
                <div className="p-2 bg-amber-500 text-white rounded-lg flex-shrink-0"><KeyRound className="w-4 h-4" /></div>
                <div className="flex-1">
                  <div className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">Configura tu proveedor de IA</div>
                  <div className="text-[9px] text-amber-600/80 dark:text-amber-500/80 font-bold">Necesitas una clave de API (hay opciones gratis) para buscar alertas. Toca aquí.</div>
                </div>
              </button>
            )}

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
                {savedLocations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Mis zonas</p>
                    <div className="flex gap-2 flex-wrap">
                      {savedLocations.map(s => (
                        <div key={s.id} className="flex items-center rounded-full bg-blue-500/10 border border-blue-500/20 overflow-hidden">
                          <button onClick={() => executeSearch(s.query)} disabled={loading} className="pl-3 pr-2 py-1.5 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            <Star className="w-3 h-3 fill-current" /> {s.label}
                          </button>
                          <button onClick={() => persistSaved(savedLocations.filter(x => x.id !== s.id))} aria-label={`Quitar ${s.label}`} className="pr-2.5 pl-1 py-1.5 text-blue-400/60">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {recentSearches.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {recentSearches.filter(n => !savedLocations.some(s => s.query === n)).map(name => (
                      <button key={name} onClick={() => executeSearch(name)} disabled={loading} className="px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {name}
                      </button>
                    ))}
                  </div>
                )}
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
                            <select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))} className="bg-slate-50 dark:bg-slate-950 border dark:border-slate-800 rounded-xl py-3 text-xs font-bold text-center appearance-none">{Array.from({length: daysInMonth}, (_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}</select>
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
                    <button onClick={toggleSaveLocation} aria-label={currentSaved ? 'Quitar de mis zonas' : 'Guardar en mis zonas'} className={`p-2.5 rounded-xl transition-all ${currentSaved ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                        <Star className={`w-5 h-5 ${currentSaved ? 'fill-current' : ''}`} />
                    </button>
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
                {loading && alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 opacity-60">
                        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Escaneando Protocolos...</p>
                    </div>
                ) : (
                    <>
                        {usingSharedTier && (
                            <button onClick={() => setShowSettings(true)} className="w-full p-3 rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 flex items-center gap-3 text-left">
                                <Gift className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400 leading-tight">
                                        Servidor gratuito compartido
                                        {sharedQuota && sharedQuota.limit > 0 && ` · te quedan ${sharedQuota.remaining} de ${sharedQuota.limit} hoy`}
                                    </p>
                                    <p className="text-[9px] font-bold text-blue-600/70 dark:text-blue-400/70 leading-tight">Toca para usar tu propia clave sin límites</p>
                                </div>
                            </button>
                        )}
                        {cachedAt && (
                            <div className="p-4 rounded-2xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 flex items-center gap-3">
                                {navigator.onLine ? <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" /> : <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                                <p className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400">
                                    {navigator.onLine
                                      ? `Datos de las ${new Date(cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${loading ? ' — actualizando...' : ''}`
                                      : `Sin conexión — mostrando datos de las ${new Date(cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                </p>
                            </div>
                        )}
                        <StatsChart events={alerts} />
                        {mapCenter && <MapView alerts={visibleAlerts} center={mapCenter} radiusKm={radius} />}
                        {historyDate && (
                            <div className="bg-purple-600 p-6 rounded-[2rem] text-white flex items-center justify-between">
                                <div className="flex items-center gap-4"><Clock className="w-6 h-6" /><div><div className="text-[9px] font-black uppercase tracking-widest opacity-60">Registro Histórico</div><div className="text-lg font-black">{historyDate}</div></div></div>
                                <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase">Snapshot</span>
                            </div>
                        )}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                           <div className="flex items-start justify-between mb-4">
                             <h3 className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Radio className="w-4 h-4 animate-ping text-white" /> Inteligencia Situacional</h3>
                             <div className="flex items-center gap-3">
                               {speechSupported() && (
                                 <button onClick={toggleSpeak} aria-label={speaking ? 'Detener lectura' : 'Escuchar informe'} className="p-2 -m-2 text-white/60 hover:text-white transition-colors">
                                   {speaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                 </button>
                               )}
                               <button onClick={() => setShareOpen(true)} aria-label="Compartir informe" className="p-2 -m-2 text-white/60 hover:text-white transition-colors"><Share2 className="w-4 h-4" /></button>
                             </div>
                           </div>
                           <p className="text-white text-lg font-bold leading-tight">{analysis}</p>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between px-2">
                              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Siren className="w-4 h-4" /> Alertas Operativas</h3>
                              <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-3 py-1 rounded-full uppercase">{visibleAlerts.length} Eventos</span>
                           </div>
                           <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 pb-1">
                              {CATEGORIES.map(cat => (
                                 <button
                                    key={cat}
                                    onClick={() => setCategoryFilter(cat)}
                                    className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors border ${categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                                 >
                                    {cat}
                                 </button>
                              ))}
                           </div>
                           {visibleAlerts.map(evt => <AlertCard key={evt.id} event={evt} distanceKm={alertDistance(evt)} onOpenGuide={openGuide} />)}
                           {visibleAlerts.length === 0 && <div className="py-20 text-center opacity-30"><ShieldCheck className="w-12 h-12 mx-auto mb-4" /><p className="text-xs font-black uppercase tracking-widest">{categoryFilter === 'TODAS' ? 'Sin Riesgos Detectados' : `Sin eventos de ${categoryFilter}`}</p></div>}
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
