
import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertEvent, SeverityLevel } from '../types';

interface Props {
  alerts: AlertEvent[];
  center: { lat: number, lng: number };
  radiusKm: number;
}

const SEVERITY_COLORS: Record<SeverityLevel, string> = {
  [SeverityLevel.CRITICAL]: '#ef4444',
  [SeverityLevel.WARNING]: '#f97316',
  [SeverityLevel.INFO]: '#3b82f6',
  [SeverityLevel.SAFE]: '#10b981',
};

const MapView: React.FC<Props> = ({ alerts, center, radiusKm }) => {
  const located = alerts.filter(a => a.lat !== undefined && a.lng !== undefined);

  return (
    <div className="w-full h-72 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl relative z-0">
      {/* key remonta el mapa cuando cambia el centro (búsqueda nueva) */}
      <MapContainer key={`${center.lat}-${center.lng}`} center={[center.lat, center.lng]} zoom={11} className="w-full h-full" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#2563eb', weight: 1.5, fillOpacity: 0.05, dashArray: '6 6' }}
        />
        {located.map(evt => (
          <CircleMarker
            key={evt.id}
            center={[evt.lat!, evt.lng!]}
            radius={10}
            pathOptions={{
              color: SEVERITY_COLORS[evt.severity] || '#64748b',
              fillColor: SEVERITY_COLORS[evt.severity] || '#64748b',
              fillOpacity: 0.5,
              weight: 2,
            }}
          >
            <Popup>
              <div className="text-xs font-bold">{evt.title}</div>
              <div className="text-[10px] text-slate-500 uppercase">{evt.category} · {evt.severity}</div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;
