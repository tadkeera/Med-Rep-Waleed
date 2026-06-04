import React from 'react';
import { VisitLog } from '../types';

interface VisitsLogMapProps {
  visits: VisitLog[];
  lang: 'ar' | 'en';
}

export default function VisitsLogMap({ visits, lang }: VisitsLogMapProps) {
  // Safe filtering of visits with coordinates
  const validVisits = visits.filter(v => v.latitude && v.longitude);

  // If no visits with coordinates are present yet, provide default centers (e.g., Riyadh, Saudi Arabia)
  const meanLat = validVisits.length > 0 
    ? validVisits.reduce((sum, v) => sum + v.latitude, 0) / validVisits.length
    : 24.7136;
    
  const meanLng = validVisits.length > 0 
    ? validVisits.reduce((sum, v) => sum + v.longitude, 0) / validVisits.length
    : 46.6753;

  // Compile markers data with detailed HTML popups
  const markersData = validVisits.map((v) => {
    const name = v.clientType === 'Doctor' ? v.doctorName || '' : v.workplaceName;
    const subtitle = v.clientType === 'Doctor' ? v.workplaceName : (lang === 'ar' ? 'زيارة صيدلية خارجية' : 'Pharmacy Customer');
    
    const formatTime = (isoString?: string) => {
      if (!isoString) return '---';
      const dateObj = new Date(isoString);
      if (isNaN(dateObj.getTime())) return isoString;
      return dateObj.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }) + ' (' + dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'numeric',
        day: 'numeric'
      }) + ')';
    };

    const inTimeStr = formatTime(v.checkInTime);
    const outTimeStr = formatTime(v.checkOutTime);
    
    const samplesLi = v.samples && v.samples.length > 0
      ? v.samples.map(s => `<li style="margin-bottom: 2px;">💊 ${s.sampleName}: <b>${s.quantityDistributed}</b></li>`).join('')
      : `<li style="color: #94a3b8; font-style: italic;">${lang === 'ar' ? 'لا يوجد عينات مصروفة' : 'No samples dispensed'}</li>`;

    const popupHtml = `
      <div style="direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; text-align: ${lang === 'ar' ? 'right' : 'left'}; font-family: system-ui, sans-serif;">
        <div style="font-weight: bold; font-size: 12px; color: #ffffff; border-bottom: 1px solid #4f46e5; padding-bottom: 5px; margin-bottom: 5px; text-shadow: 0 1px 1px rgba(0,0,0,0.2);">
          ${name}
        </div>
        <div style="font-size: 10px; color: #94a3b8; margin-bottom: 6px;">
          🏢 ${subtitle}
        </div>
        <div style="font-size: 10px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4; background: rgba(255,255,255,0.03); padding: 5px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
          ⏱️ <b>${lang === 'ar' ? 'الدخول:' : 'In:'}</b> ${inTimeStr}<br/>
          ⏱️ <b>${lang === 'ar' ? 'الخروج:' : 'Out:'}</b> ${outTimeStr}
        </div>
        <div style="font-size: 9px; color: #e2e8f0;">
          <div style="font-weight: bold; color: #a5b4fc; margin-bottom: 3px; font-size: 10px;">📦 ${lang === 'ar' ? 'العينات والكميات:' : 'Distributed Samples:'}</div>
          <ul style="margin: 0; padding-left: 10px; padding-right: 10px; list-style-type: none;">
            ${samplesLi}
          </ul>
        </div>
      </div>
    `;

    return {
      lat: v.latitude,
      lng: v.longitude,
      popupHtml
    };
  });

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Visits History Map</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
      <style>
        html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #0f172a;
          color: #f8fafc;
          border-radius: 12px;
          padding: 8px 10px;
          font-family: inherit;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .custom-popup .leaflet-popup-tip {
          background: #0f172a;
        }
        .leaflet-popup-content {
          margin: 6px 8px !important;
          min-width: 180px !important;
        }
      </style>
    </head>
    <body>
      <div id="map" style="width: 100vw; height: 100vh;"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          var map = L.map('map', { zoomControl: false }).setView([${meanLat}, ${meanLng}], 12);
          
          L.control.zoom({ position: 'topright' }).addTo(map);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CartoDB'
          }).addTo(map);

          var markers = ${JSON.stringify(markersData)};
          var group = [];

          markers.forEach(function(m) {
            // Elegant royal violet custom pin SVG
            var iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#a855f7" style="width:28px;height:28px;filter:drop-shadow(0 4px 5px rgba(0,0,0,0.3));"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>';
            
            var customIcon = L.divIcon({
              html: iconSvg,
              className: 'custom-div-icon',
              iconSize: [28, 28],
              iconAnchor: [14, 28],
              popupAnchor: [0, -28]
            });

            var marker = L.marker([m.lat, m.lng], { icon: customIcon }).addTo(map);
            marker.bindPopup(m.popupHtml, { className: 'custom-popup' });
            group.push([m.lat, m.lng]);
          });

          // Autofit boundary
          if (group.length > 0) {
            map.fitBounds(group, { padding: [40, 40] });
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-50">
      <iframe
        className="w-full h-full border-0"
        title="Interactive Field GPS Map"
        srcDoc={mapHtml}
        sandbox="allow-scripts"
      />
    </div>
  );
}
