import React from 'react';

interface LeafletMapProps {
  workplaces: Array<{ id: string; name: string; latitude: number; longitude: number }>;
  visits: Array<{ id: string; doctorName?: string; workplaceName?: string; visitDate?: string }>;
  lang: 'ar' | 'en';
}

export default function LeafletMap({ workplaces, visits, lang }: LeafletMapProps) {
  // If no workplaces are entered yet, let's provide default beautiful centers
  const places = workplaces.length > 0 ? workplaces : [
    { id: '1', name: 'مستشفى دلة الرياض (Dallah)', latitude: 24.7431, longitude: 46.6432 },
    { id: '2', name: 'مستشفى سليمان الحبيب (Al-Habib)', latitude: 24.7136, longitude: 46.6753 },
    { id: '3', name: 'جامعة الملك سعود الطبية (KSU Hospital)', latitude: 24.7162, longitude: 46.6201 },
  ];

  // Calculate center of map safely
  const meanLat = places.reduce((sum, p) => sum + p.latitude, 0) / places.length;
  const meanLng = places.reduce((sum, p) => sum + p.longitude, 0) / places.length;

  // Let's build markers JSON Array
  const markersData = places.map((p) => {
    // Find visits count for this workplace
    const dVisits = visits.filter(v => v.workplaceName === p.name);
    const count = dVisits.length;
    return {
      name: p.name,
      lat: p.latitude,
      lng: p.longitude,
      visitsCount: count,
      details: lang === 'ar' 
        ? `عدد الزيارات الموثقة هنا: <b>\${count} زيارة</b>` 
        : `Recorded GPS Visits: <b>\${count} visits</b>`,
    };
  });

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Interactive Leaflet Map</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin=""/>
      <style>
        html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f8fafc; }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: #f8fafc;
          border-radius: 10px;
          padding: 4px 6px;
          font-family: sans-serif;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .custom-popup .leaflet-popup-tip {
          background: #1e293b;
        }
        .marker-title {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 2px;
          border-bottom: 1px solid #475569;
          padding-bottom: 4px;
        }
        .marker-desc {
          font-size: 10px;
          color: #cbd5e1;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <div id="map" style="width: 100vw; height: 100vh;"></div>
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          var map = L.map('map', { zoomControl: false }).setView([\${meanLat}, \${meanLng}], 12);
          
          L.control.zoom({ position: 'topright' }).addTo(map);

          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CartoDB'
          }).addTo(map);

          var markers = \${JSON.stringify(markersData)};
          var group = [];

          markers.forEach(function(m) {
            var color = m.visitsCount > 0 ? '#4f46e5' : '#10b981';
            
            // Beautiful custom DivIcon marker pins
            var iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="' + color + '" style="width:24px;height:24px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.25));"><path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" /></svg>';
            
            var customIcon = L.divIcon({
              html: iconSvg,
              className: 'custom-div-icon',
              iconSize: [24, 24],
              iconAnchor: [12, 24],
              popupAnchor: [0, -24]
            });

            var marker = L.marker([m.lat, m.lng], { icon: customIcon }).addTo(map);
            
            var popupContent = '<div class="custom-popup">' +
              '<div class="marker-title">' + m.name + '</div>' +
              '<div class="marker-desc">' + m.details + '</div>' +
              '</div>';
            
            marker.bindPopup(popupContent);
            group.push([m.lat, m.lng]);
          });

          // Autofit markers inside boundaries safely
          if (group.length > 0) {
            map.fitBounds(group, { padding: [30, 30] });
          }
        });
      </script>
    </body>
    </html>
  `;

  return (
    <div className="w-full h-80 rounded-2xl overflow-hidden border border-slate-200/60 shadow-xs relative bg-slate-50">
      <iframe
        className="w-full h-full border-0 rounded-2xl"
        title="Interactive Field GPS Map"
        srcDoc={mapHtml}
        sandbox="allow-scripts"
      />
    </div>
  );
}
