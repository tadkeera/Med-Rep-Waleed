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
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);

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

  // AI model request to server endpoint
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

  // Micro geographical clustering visualization mockup
  // Let's divide Riyadh clinics into clusters:
  // Cluster North (North Riyadh): Suleiman Al-Habib, Dallah Hospital (Green)
  // Cluster Center (Central Riyadh): King Fahd Hospital, Specialist Medical Center (Blue)
  const CLUSTERS = {
    'Zone-North': {
      ar: 'المربع الطبي الشمالي (مستشفى الحبيب ومستشفى دلة)',
      en: 'Zone Medical North (Al-Habib & Dallah Hub)',
      color: 'bg-emerald-500',
      text: 'text-emerald-500',
      border: 'border-emerald-200',
      items: ['مستشفى دلة (Dallah Hospital)', 'مستشفى الحبيب (Suleiman Al-Habib)'],
      coords: { x: 340, y: 50 },
    },
    'Zone-Central': {
      ar: 'المربع الطبي الأوسط (مستشفى الملك فهد والمجمع التخصصي)',
      en: 'Zone Medical Central (King Fahd & Specialist Hub)',
      color: 'bg-blue-500',
      text: 'text-blue-500',
      border: 'border-blue-200',
      items: ['مستشفى الملك فهد (King Fahd Hospital)', 'مجمع التخصصي الطبي (Specialist Medical Center)'],
      coords: { x: 160, y: 90 },
    },
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
                <span>{planResult.includes('تلافي الخروج الجغرافي') ? t.aiSourcesim : t.aiSourcegemini}</span>
              </div>

              <div className="whitespace-pre-line text-slate-200 max-h-72 overflow-y-auto pr-1">
                {planResult}
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
            <div className="text-[10px] text-slate-400 font-bold mb-1">{t.totalWorkplaces} <span className="font-mono text-slate-700">{db.workplaces.length} عيادات</span></div>
            
            {/* Map visual representation */}
            <div className="relative w-full h-36 border border-slate-100 bg-white rounded-lg overflow-hidden">
              {/* Radial city grid lines mock */}
              <div className="absolute inset-x-0 top-12 border-b border-dashed border-slate-100"></div>
              <div className="absolute inset-x-0 top-24 border-b border-dashed border-slate-100"></div>
              <div className="absolute inset-y-0 left-1/3 border-r border-dashed border-slate-100"></div>
              <div className="absolute inset-y-0 left-2/3 border-r border-dashed border-slate-100"></div>

              {/* Draw animated clusters */}
              {Object.entries(CLUSTERS).map(([key, cluster]) => (
                <div 
                  key={key}
                  style={{ top: cluster.coords.y, left: cluster.coords.x }}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCluster(key)}
                    className="relative focus:outline-none flex flex-col items-center cursor-pointer group"
                  >
                    <span className={`w-4 h-4 rounded-full ${cluster.color} flex items-center justify-center border-2 border-white ring-4 ring-slate-100 shadow-md group-hover:scale-125 transition-transform`}>
                      <MapPin className="w-2.5 h-2.5 text-white" />
                    </span>
                    <span className="text-[8px] bg-slate-900/90 text-white px-1.5 py-0.5 rounded-sm shadow-sm font-bold mt-1 max-w-[80px] break-keep truncate text-center">
                      {lang === 'ar' ? key === 'Zone-North' ? 'الشمال' : 'الوسط' : key}
                    </span>
                  </button>
                </div>
              ))}
            </div>

            {/* Click to expand cluster details */}
            <div className="pt-2 border-t border-slate-100">
              {selectedCluster ? (
                <div className="bg-white border border-slate-150 p-2.5 rounded-lg text-[10px] space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${CLUSTERS[selectedCluster as 'Zone-North'].color}`}></span>
                    <span className="text-slate-800">{lang === 'ar' ? CLUSTERS[selectedCluster as 'Zone-North'].ar : CLUSTERS[selectedCluster as 'Zone-North'].en}</span>
                  </div>
                  <ul className="list-disc list-inside text-slate-500 space-y-0.5 pl-2">
                    {CLUSTERS[selectedCluster as 'Zone-North'].items.map(item => (
                      <li key={item} className="font-medium">{item}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 italic text-center">
                  {lang === 'ar' ? 'اضغط على مربع مجمّع جغرافي لاستكشاف عياداته.' : 'Press a geographical hub to explore Clinics.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
