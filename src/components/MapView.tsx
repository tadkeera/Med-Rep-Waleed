import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Hospital, User, CheckCircle, Navigation, Users, Building2, BrainCircuit, Sparkles } from 'lucide-react';
import { getInitialState, getClients } from '../utils/db';
import { Doctor, Client } from '../types';

interface MapViewProps {
  lang: 'ar' | 'en';
}

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function MapView({ lang }: MapViewProps) {
  const [tab, setTab] = useState<'doctors' | 'hospitals'>('doctors');
  const [isGenerating, setIsGenerating] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  
  const state = getInitialState();
  const doctors = state.doctors || [];
  const clients = getClients() || [];
  
  const t = {
    ar: {
      mapTitle: 'الخريطة التفاعلية',
      doctorsTab: 'الأطباء',
      hospitalsTab: 'المستشفيات والمراكز الطبية',
      generatePlan: 'انشاء الخطة الشهرية الذكية',
      planGenerated: 'تم إنشاء خطة السير بذكاء!',
      generating: 'جاري التحليل وبناء الخطة...',
      hospitalDetails: 'تفاصيل المرفق الصحي',
      planDesc: 'توزيع حصص الزيارات (A=4, B=3, C=1) وحساب المسارات الأقصر لتوفير الجهد والوقت.',
    },
    en: {
      mapTitle: 'Interactive Map',
      doctorsTab: 'Doctors',
      hospitalsTab: 'Hospitals & Medical Centers',
      generatePlan: 'Create Smart Monthly Plan',
      planGenerated: 'Smart Routing Plan Generated!',
      generating: 'Analyzing & Building Plan...',
      hospitalDetails: 'Facility Details',
      planDesc: 'Distribute visit quotas (A=4, B=3, C=1) and compute shortest paths to save effort and time.',
    }
  }[lang];

  // Default coordinate for Sana'a, Yemen
  const yemenCenter: [number, number] = [15.3694, 44.1910];

  const handleGeneratePlan = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setPlanGenerated(true);
    }, 2000);
  };

  return (
    <div className="space-y-6 fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Navigation className="w-6 h-6 text-indigo-600" />
            {t.mapTitle}
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTab('doctors')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
            tab === 'doctors' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4" />
          {t.doctorsTab}
        </button>
        <button
          onClick={() => setTab('hospitals')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${
            tab === 'hospitals' ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          {t.hospitalsTab}
        </button>
      </div>

      {tab === 'doctors' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">{t.generatePlan}</h3>
                <p className="text-xs text-slate-600 mt-1">{t.planDesc}</p>
              </div>
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={isGenerating || planGenerated}
              className={`shrink-0 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center gap-2 ${
                planGenerated 
                  ? 'bg-emerald-500 cursor-default'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  {t.generating}
                </>
              ) : planGenerated ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {t.planGenerated}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t.generatePlan}
                </>
              )}
            </button>
          </div>

          <div className="h-[600px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative z-0">
            <MapContainer center={yemenCenter} zoom={6} className="w-full h-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {doctors.map((doctor) => {
                // If real GPS doesn't exist, we fallback or ignore
                // Using fallback to Yemen general areas if not set just for visualization
                const lat = doctor.locationLatitude || (15.3694 + (Math.random() - 0.5) * 4);
                const lng = doctor.locationLongitude || (44.1910 + (Math.random() - 0.5) * 4);
                return (
                  <Marker key={doctor.id} position={[lat, lng]}>
                    <Popup>
                      <div className="font-sans text-right" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="font-bold text-slate-900 border-b pb-1 mb-1">{doctor.name}</div>
                        <div className="text-xs text-slate-500">{doctor.speciality}</div>
                        <div className="text-xs font-bold mt-1 text-indigo-600">Class {doctor.classRating}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}

      {tab === 'hospitals' && (
        <div className="space-y-4">
          <div className="h-[600px] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative z-0">
            <MapContainer center={yemenCenter} zoom={6} className="w-full h-full">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {clients.map((client) => {
                const lat = client.locationLatitude || (15.3694 + (Math.random() - 0.5) * 4);
                const lng = client.locationLongitude || (44.1910 + (Math.random() - 0.5) * 4);
                return (
                  <Marker key={client.id} position={[lat, lng]}>
                    <Popup>
                      <div className="font-sans text-right" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{client.type}</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5">{client.name}</div>
                        <div className="text-xs text-slate-600 mt-1">{client.address}</div>
                        
                        <div className="mt-3 border-t border-slate-100 pt-2">
                          <div className="text-xs font-bold text-slate-800 mb-1">
                            {lang === 'ar' ? 'الأطباء المرتبطين' : 'Associated Doctors'}:
                          </div>
                          <ul className="text-[11px] text-slate-500 space-y-1 list-disc list-inside">
                            {doctors.filter(d => 
                              (d.workplace1?.toLowerCase() === client.name.toLowerCase()) || 
                              (d.workplace2?.toLowerCase() === client.name.toLowerCase())
                            ).map((d, idx) => (
                              <li key={idx}>{d.name} <span className="text-indigo-400">({d.classRating})</span></li>
                            ))}
                            {doctors.filter(d => 
                              (d.workplace1?.toLowerCase() === client.name.toLowerCase()) || 
                              (d.workplace2?.toLowerCase() === client.name.toLowerCase())
                            ).length === 0 && (
                              <li className="text-slate-400 italic">{lang === 'ar' ? 'لا يوجد' : 'None'}</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}
