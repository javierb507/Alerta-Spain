
import React, { useState } from 'react';
import { Siren, Phone, MapPin, X, Share2, Loader2 } from 'lucide-react';

// Teléfonos oficiales de emergencia en España. Estático y offline a propósito:
// debe funcionar sin red, sin claves y sin depender de nada externo.
const EMERGENCY_NUMBERS = [
  { num: '112', label: 'Emergencias (general)', highlight: true },
  { num: '061', label: 'Urgencias sanitarias' },
  { num: '091', label: 'Policía Nacional' },
  { num: '062', label: 'Guardia Civil' },
  { num: '080', label: 'Bomberos' },
  { num: '016', label: 'Violencia de género' },
  { num: '915620420', label: 'Toxicología', display: '91 562 04 20' },
];

const SOSPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const shareMyLocation = () => {
    if (!('geolocation' in navigator)) {
      alert('Tu navegador no soporta geolocalización.');
      return;
    }
    setSharing(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const mapsUrl = `https://maps.google.com/?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
        const text = `🆘 Necesito ayuda. Esta es mi ubicación exacta: ${mapsUrl}`;
        try {
          if (navigator.share) {
            await navigator.share({ text });
          } else {
            await navigator.clipboard.writeText(text);
            alert('Ubicación copiada al portapapeles. Pégala donde la necesites.');
          }
        } catch { /* usuario canceló el diálogo de compartir */ }
        setSharing(false);
      },
      () => {
        setSharing(false);
        alert('No se pudo obtener tu ubicación. Activa el GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <>
      {/* Botón flotante SOS, visible en todas las vistas */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir panel de emergencia SOS"
        className="fixed bottom-6 right-6 z-[90] w-16 h-16 rounded-full bg-red-600 text-white shadow-2xl shadow-red-500/40 flex flex-col items-center justify-center border-4 border-white dark:border-slate-900 active:scale-95 transition-transform"
      >
        <Siren className="w-5 h-5" />
        <span className="text-[10px] font-black tracking-widest">SOS</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[85vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600 rounded-xl"><Siren className="w-5 h-5 text-white" /></div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Emergencia</h2>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
            </div>

            {/* Acciones principales: llamar 112 y compartir ubicación */}
            <a
              href="tel:112"
              className="w-full py-5 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-lg flex items-center justify-center gap-3 shadow-lg shadow-red-500/30"
            >
              <Phone className="w-6 h-6" /> Llamar al 112
            </a>
            <button
              onClick={shareMyLocation}
              disabled={sharing}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3"
            >
              {sharing ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
              Compartir mi ubicación
              <Share2 className="w-4 h-4 opacity-60" />
            </button>

            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Teléfonos de emergencia</p>
              {EMERGENCY_NUMBERS.map(t => (
                <a
                  key={t.num}
                  href={`tel:${t.num}`}
                  className={`flex items-center justify-between p-3 rounded-2xl border transition-colors ${t.highlight ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}
                >
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{t.label}</span>
                  <span className={`text-sm font-black tracking-wider ${t.highlight ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                    {t.display || t.num}
                  </span>
                </a>
              ))}
            </div>
            <p className="text-[9px] text-slate-400 font-bold leading-snug">
              Esta lista funciona sin conexión. En caso de emergencia real llama siempre al 112.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default SOSPanel;
