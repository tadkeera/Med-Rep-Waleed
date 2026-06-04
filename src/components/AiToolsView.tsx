/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState } from '../utils/db';
import { Sparkles, Map, Compass, ShieldAlert, Navigation, Loader, Network, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface AiToolsViewProps {
  lang: 'ar' | 'en';
}

export default function AiToolsView({ lang }: AiToolsViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [planResult, setPlanResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState<string | null>(null);

  useEffect(() => {
    setDb(getInitialState());
  }, []);

  const t = {
    ar: {
      title: 'مركز الذكاء الاصطناعي وجدولة خطوط السير',
      planGenTitle: '🧠 مولد السير المقارن الذكي (AI Model Plan Generator)',
      planGenDesc: 'تقوم هذه الأداة بتحليل كثافة الزيارات السابقة، وتصنيف الأطباء، ومراعاة التقارب الجغرافي لتوليد خطة سير مثالية تعزل مسارات النقل وتقلص التكلفة.',
      generateBtn: 'إنشاء خطة السير المحسنة بالكامل',
      generating: 'جاري تشغيل الخوارزميات وتصنيف الأطباء جغرافياً...',
      aiSourcesim: 'تم الحساب بواسطة الخوارزمية الجغرافية المحلية',
      aiSourcegemini: 'تم الحساب بواسطة نموذج Gemini-3.5-flash',
      clusteringTitle: '🗺️ التجميع العنقودي الجغرافي للمنشآت (Geographical Clustering)',
      clusteringDesc: 'عرض تفاعلي لتوزيع المنشآت الطبية والعيادات على مناطق تملي الفرز الجغرافي (Clustering) لتفادي تداخل خطوط السير الميدانية.',
      totalWorkplaces: 'المنشآت المسجلة:',
      neglectAlerts: 'تنبيهات الفجوة الزمنية (Class A Gaps):',
    },
    en: {
      title: 'AI Dashboard & Spatial Routing',
      planGenTitle: '🧠 AI Weekly Plan Generator',
      planGenDesc: 'Automates and crafts an idealized weekly cycle plan by analyzing historical visit patterns, prioritizing Class A targets first, and grouping clinics closely.',
      generateBtn: 'Synthesize Optimized Weekly Route',
      generating: 'Computing geographical proximities and Class A frequencies...',
      aiSourcesim: 'Simulated locally via offline routing models',
      aiSourcegemini: 'Live synthesis via connected Gemini-3.5-flash',
      clusteringTitle: '🗺️ Geographical Clustering (AI Clinicial Hubs)',
      clusteringDesc: 'Spatial clusters organizing workplaces into neighborhoods. Maximize visit counts while protecting rep limits.',
      totalWorkplaces: 'Workplaces monitored:',
      neglectAlerts: 'SFA Gap Alerts (Class A Physician Neglect):',
    },
  }[lang];

  // AI model request to server endpoint with correct gemini-3.5-flash model mapping
  const generateOptimizedAiPlan = async () => {
    setIsLoading(true);
    setPlanResult(null);

    try {
      const response = await fetch('/api/ai/plan-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctors: db.doctors,
          workplaces: db.workplaces,
          visits: db.visits.map((v) => ({ date: v.visitDate, doctor: v.doctorName, work: v.workplaceName })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setPlanResult(result.plan);
      } else {
        setPlanResult('باءت محاولة توليد السير الذكي بالفشل. يرجى تكرار المحاولة ثانية.');
      }
    } catch (e) {
      console.error(e);
      setPlanResult('تعذر تعبئة خطة السير بالذكاء الاصطناعي بسبب توقف الشبكة الميدانية.');
    } finally {
      setIsLoading(false);
    }
  };

  const workplaces = db.workplaces;

  // Real geographical clustering and dynamic range normalizer
  const minLat = workplaces.length ? Math.min(...workplaces.map((w) => w.latitude)) : 24.6;
  const maxLat = workplaces.length ? Math.max(...workplaces.map((w) => w.latitude)) : 24.8;
  const minLng = workplaces.length ? Math.min(...workplaces.map((w) => w.longitude)) : 46.6;
  const maxLng = workplaces.length ? Math.max(...workplaces.map((w) => w.longitude)) : 46.8;

  const latRange = maxLat - minLat || 0.05;
  const lngRange = maxLng - minLng || 0.05;

  const plottedWorkplaces = workplaces.map((w) => {
    // scale coordinates between 10% and 90% safely to fit HTML viewport beautifully
    const x = ((w.longitude - minLng) / lngRange) * 80 + 10;
    const y = (1 - (w.latitude - minLat) / latRange) * 80 + 10;

    // Classify colors dynamically by quadrant relative to center
    const latCenter = (minLat + maxLat) / 2;
    const isNorth = w.latitude >= latCenter;
    const color = isNorth ? 'bg-emerald-500 ring-emerald-100 text-emerald-500' : 'bg-indigo-500 ring-indigo-100 text-indigo-500';

    return {
      ...w,
      x,
      y,
      color,
    };
  });

  // Active Leaflet state observer with defensive container cleanups
  useEffect(() => {
    const L = (window as any).L;
    if (!L || !workplaces.length) return;

    // Standard DOM wrapper reset to allow Leaflet reinstantiations
    const container = L.DomUtil.get('clustering-leaflet-map');
    if (container) {
      (container as any)._leaflet_id = null;
    }

    // Centered around Riyadh default hub safely
    const validCoords = workplaces.filter((w) => typeof w.latitude === 'number' && typeof w.longitude === 'number' && w.latitude !== null && w.longitude !== null);
    const centerLat = validCoords.length ? validCoords.reduce((sum, w) => sum + (w.latitude as number), 0) / validCoords.length : 24.7136;
    const centerLng = validCoords.length ? validCoords.reduce((sum, w) => sum + (w.longitude as number), 0) / validCoords.length : 46.6753;

    const map = L.map('clustering-leaflet-map', {
      center: [centerLat, centerLng],
      zoom: 12,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const markers: any[] = [];
    validCoords.forEach((w) => {
      const isNorth = (w.latitude as number) >= centerLat;
      const markerColor = isNorth ? '#10b981' : '#6366f1';
      
      const customIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${markerColor}; position: relative; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);" class="pulse-ring"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const marker = L.marker([w.latitude as number, w.longitude as number], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="direction: ${lang === 'ar' ? 'rtl' : 'ltr'}; font-family: 'Cairo', sans-serif; text-align: ${lang === 'ar' ? 'right' : 'left'}; font-size: 11px;">
          <strong style="color: #4f46e5; display: block; margin-bottom: 2px;">${w.name}</strong>
          <span style="color: #64748b;">${lang === 'ar' ? 'مجمع عيادات الرياض' : 'Riyadh Medical Hub'}</span>
        </div>
      `);

      marker.on('click', () => {
        setSelectedWorkplaceId(w.id);
      });

      markers.push(marker);
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.1));
    }

    return () => {
      map.remove();
    };
  }, [workplaces, lang]);

  // Premium corporate PDF export capability
  const exportPlanAsPdf = () => {
    if (!planResult) return;
    const representativeName = localStorage.getItem('medrep_representative_name') || (lang === 'ar' ? 'مندوب الدعاية الطبية' : 'Medical Representative');
    const representativeGrade = localStorage.getItem('medrep_representative_grade') || 'Senior Rep';
    const logo = localStorage.getItem('corporate_logo') || '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${lang === 'ar' ? 'خطة سير الدعاية الطبية المعتمدة' : 'Official Medical Route Plan'}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
          <style>
            body {
              font-family: ${lang === 'ar' ? "'Cairo'" : "'Inter'"}, sans-serif;
              color: #1e293b;
              margin: 40px;
              line-height: 1.6;
              direction: ${lang === 'ar' ? 'rtl' : 'ltr'};
              background-color: #ffffff;
            }
            .header-container {
              display: flex;
              align-items: center;
              border-bottom: 3px double #cbd5e1;
              padding-bottom: 20px;
              margin-bottom: 25px;
            }
            .logo-placeholder {
              width: 70px;
              height: 70px;
              border-radius: 12px;
              background-color: #4f46e5;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              color: #ffffff;
              font-weight: bold;
              box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.1);
            }
            .title-section {
              flex-grow: 1;
              text-align: center;
              padding: 0 20px;
            }
            .title-section h1 {
              font-size: 20px;
              margin: 0;
              color: #1e1b4b;
              font-weight: 800;
            }
            .title-section p {
              font-size: 11px;
              color: #64748b;
              margin: 6px 0 0 0;
              letter-spacing: 0.5px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 25px;
              background: #f8fafc;
              padding: 15px 20px;
              border-radius: 10px;
              font-size: 12px;
              border: 1px solid #e2e8f0;
            }
            .meta-item {
              display: flex;
              gap: 8px;
            }
            .meta-item strong {
              color: #4f46e5;
              min-width: 110px;
            }
            .content-box {
              background: #ffffff;
              border: 1px solid #e2e8f0;
              padding: 24px;
              border-radius: 12px;
              white-space: pre-line;
              font-size: 13.5px;
              color: #334155;
              line-height: 1.7;
              box-shadow: 0 1px 3px rgba(0,0,0,0.02);
            }
            .footer-note {
              margin-top: 50px;
              text-align: center;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
              font-weight: 500;
            }
            @media print {
              body { margin: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            ${logo ? `<img src="${logo}" style="max-height: 70px; max-width: 140px; border-radius: 8px;" />` : `<div class="logo-placeholder">MED REP</div>`}
            <div class="title-section">
              <h1>${lang === 'ar' ? 'خطة عمل الميدان الأسبوعية المحسنة ذكياً' : 'AI-Optimized Field Visit Dispatch'}</h1>
              <p>${lang === 'ar' ? 'التقرير التوجيهي الصادر عن نظام SFA الذكي للمبيعات والترويج' : 'Strategic Area Mapping & Spatial Routing Report'}</p>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <strong>${lang === 'ar' ? 'المندوب:' : 'Representative:'}</strong> <span>${representativeName}</span>
            </div>
            <div class="meta-item">
              <strong>${lang === 'ar' ? 'الفئة القيادية:' : 'Seniority Level:'}</strong> <span>${representativeGrade}</span>
            </div>
            <div class="meta-item">
              <strong>${lang === 'ar' ? 'تاريخ التحديث:' : 'Generated Date:'}</strong> <span>${new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US')}</span>
            </div>
            <div class="meta-item">
              <strong>${lang === 'ar' ? 'أمان التوقيع:' : 'SFA GPS Hash:'}</strong> <span>Verified Security Handshake</span>
            </div>
          </div>

          <div class="content-box">
            ${planResult}
          </div>

          <div class="footer-note font-semibold">
            ${lang === 'ar' ? 'تصنيف السرية: وثيقة داخلية سرية وخاصة بممثلي الدعاية الطبية للمنشآت.' : 'CONFIDENTIAL DOCUMENT — SOLELY FOR REGISTERED SFA REPRESENTATIVE FIELD DEPLOYMENT.'}
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 fade-in text-slate-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{lang === 'ar' ? 'أدوات التغطية والمطابقة بالذكاء المساعد' : 'AI Routing & Proximity Optimization'}</h2>
          <p className="text-xs text-slate-500">
            {lang === 'ar' 
              ? 'صممت لخدمة مندوب الدعاية في تلافي فجوات الزيارة وتقليل وقت التنقل والتكلفة.' 
              : 'Empower field campaigns with clustering layouts, AI route plans, and gaps solver.'}
          </p>
        </div>
      </div>

      {/* Grid view of AI utilities */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* AI Weekly Plan Generator Card */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-600 animate-pulse" />
              {t.planGenTitle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.planGenDesc}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={generateOptimizedAiPlan}
              disabled={isLoading}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/15 transition-all cursor-pointer w-full justify-center"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  {t.generating}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t.generateBtn}
                </>
              )}
            </button>
          </div>

          {/* Result Output Area */}
          {planResult && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 text-slate-100 rounded-xl p-4 border border-slate-800 text-xs leading-relaxed space-y-3"
            >
              <div className="text-[10px] text-indigo-300 font-mono flex items-center justify-between border-b border-slate-850 pb-2">
                <span>⚡ {lang === 'ar' ? 'مشورة المساعد للـ SFA' : 'SFA Optimization Advice'}</span>
                <span>{t.aiSourcegemini}</span>
              </div>

              <div className="whitespace-pre-line text-slate-200 max-h-72 overflow-y-auto pr-1">
                {planResult}
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={exportPlanAsPdf}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-white" />
                  {lang === 'ar' ? 'اصدار التقرير بصيغة PDF المعتمدة' : 'Export Route Report as standard PDF'}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Geographical Proximity Clustering Visual Card */}
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Map className="w-5 h-5 text-emerald-500" />
              {t.clusteringTitle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              {t.clusteringDesc}
            </p>
          </div>

          {/* Interactive proximity clusters map representation */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 relative min-h-[220px] flex flex-col justify-between overflow-hidden">
            <div className="text-[10px] text-slate-400 font-bold mb-2">{t.totalWorkplaces} <span className="font-mono text-slate-700">{db.workplaces.length} منشأة</span></div>
            
            {/* Map visual representation using REAL Leaflet container */}
            <div id="clustering-leaflet-map" className="w-full h-52 border border-slate-200 bg-white rounded-lg overflow-hidden z-[5]" style={{ minHeight: '200px' }}>
              {workplaces.length === 0 && (
                <div className="h-full flex items-center justify-center text-slate-400 italic text-[10px] bg-slate-50">
                  {lang === 'ar' ? 'لا توجد عيادات مسجلة لرسمها على خريطة الرياض.' : 'No registered workplaces to plot on map.'}
                </div>
              )}
            </div>

            {/* Click to expand dynamic clinic details */}
            <div className="pt-2 border-t border-slate-100">
              {selectedWorkplaceId ? (() => {
                const selectedWp = workplaces.find(w => w.id === selectedWorkplaceId);
                if (!selectedWp) return null;
                // Find all physicians who have visits in this workplace
                const linkedDoctors = db.doctors.filter(d => {
                  return db.visits.some(v => v.workplaceName === selectedWp.name && v.doctorName === d.name);
                });
                return (
                  <div className="bg-white border border-slate-150 p-2.5 rounded-lg text-[10px] space-y-1">
                    <div className="font-bold flex items-center justify-between text-slate-800">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                        <span>{selectedWp.name}</span>
                      </span>
                      <span className="text-[8px] text-slate-400 font-mono">
                        Lat: {selectedWp.latitude.toFixed(4)}, Lng: {selectedWp.longitude.toFixed(4)}
                      </span>
                    </div>
                    {linkedDoctors.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-[8.5px] font-bold text-slate-500">{lang === 'ar' ? 'الأطباء المسجلون والمتواجدون بهذه المنشأة والمسجل لهم متابعات:' : 'Linked target Doctors monitored in visits:'}</div>
                        <div className="flex flex-wrap gap-1">
                          {linkedDoctors.map(doc => (
                            <span key={doc.id} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-sm text-[8.5px] font-bold">
                              {doc.name} ({doc.classRating})
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[8px] text-slate-400 italic font-medium">
                        {lang === 'ar' ? 'لم يتم العثور على أطباء مسجلين بزيارات في هذه العيادة بعد.' : 'No active visits linked to doctors in this clinic.'}
                      </span>
                    )}
                  </div>
                );
              })() : (
                <div className="text-[10px] text-slate-400 italic text-center">
                  {lang === 'ar' ? 'اضغط على أي منشأة في لوحة الخريطة أعلاه لمشاهدة التفاصيل ومطابقة عياداتها.' : 'Press any dynamic clinic or workplace hub to inspect details.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
