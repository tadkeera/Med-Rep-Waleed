/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, evaluateGuardrailAlarms, GuardrailAlarm } from '../utils/db';
import { AlertTriangle, CheckCircle, TrendingUp, Calendar, Users, MapPin, Package, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardViewProps {
  lang: 'ar' | 'en';
}

export default function DashboardView({ lang }: DashboardViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [alarms, setAlarms] = useState<GuardrailAlarm[]>([]);

  useEffect(() => {
    // Reload database state
    setDb(getInitialState());
    setAlarms(evaluateGuardrailAlarms());
  }, []);

  const t = {
    ar: {
      title: 'لوحة التحكم والمؤشرات الذكية',
      kpiCallRate: 'معدل المكالمات اليومية / الأسبوعية',
      kpiCoverage: 'نسبة تغطية العملاء المستهدفين',
      kpiRoute: 'نسبة الالتزام بخط السير والموقع',
      kpiFocus: 'تقرير تركيز المنتجات الشائع تفصيلها',
      productiveClass: 'إنتاجية الفئات المعيارية للأطباء',
      trendTitle: 'تحليل المنحنى والطلب الموسمي (تاريخي)',
      target: 'المستهدف',
      actual: 'المنجز',
      neglectedAccounts: 'أطباء فئة (أ) مهملون حالياً (أكثر من 14 يوماً بدون زيارة):',
      noNeglected: 'عمل رائع! تم تغطية جميع الأطباء فئة (أ) مؤخراً.',
      redAlerts: 'تنبيهات الأمان الذكية والرقابة الميدانية',
      noAlarms: 'لا توجد مخالفات في خطوط السير أو التواقيت. العمل متطابق تماماً مع السياسات.',
      totalVisits: 'مجموع الزيارات',
      totalProducts: 'العينات الموزعة',
      totalStock: 'المخزون المتبقي',
      activeDoctors: 'الأطباء النشطون',
      monthlyTrend: 'تحليل الأنشطة عبر الشهور لعام 2026',
      kpisLeaderboard: 'لوحة تفوق الأداء والتحفيز (SFA Leaderboard)',
      leaderRank: 'الترتيب الحركي بالمنطقة الوسطى',
      leaderScore: 'نقاط رعاية الأطباء التراكمية (SFA Score)',
      leaderStreak: 'سلسلة العمل الميداني المتواصل',
      leaderGrade: 'مستوى فعالية الاستهداف',
      rankValue: 'المركز الأول (🥇 1st Place)',
      gradeDesc: 'ممتاز جداً (Grade A+)',
    },
    en: {
      title: 'Dashboard & Smart SFA Indicators',
      kpiCallRate: 'Daily / Weekly Call Rate',
      kpiCoverage: 'Target Customer Coverage %',
      kpiRoute: 'Route & GPS Compliance %',
      kpiFocus: 'Product focus - Detailing Shares',
      productiveClass: 'Account Classes Productivity Ratio',
      trendTitle: 'Longitudinal Trend & Seasonal Analysis',
      target: 'Target',
      actual: 'Actual',
      neglectedAccounts: 'Neglected Class A Doctors (>14 days without visit):',
      noNeglected: 'Splendid! All Class A doctors visited recently.',
      redAlerts: 'Smart Security & Field Compliance Infractions',
      noAlarms: 'No route or timing violations detected. Field tracks are compliant.',
      totalVisits: 'Total Visits',
      totalProducts: 'Samples Distributed',
      totalStock: 'Stock in Reserve',
      activeDoctors: 'Active Physicians',
      monthlyTrend: 'Monthly Activity Analysis (2026)',
      kpisLeaderboard: 'SFA Performance & Motivation Leaderboard',
      leaderRank: 'Regional Field Ranking',
      leaderScore: 'Field Excellence Cumulative Points',
      leaderStreak: 'Continuous Daily Active Streak',
      leaderGrade: 'Targeting Execution & Quality Class',
      rankValue: '1st Place Rank',
      gradeDesc: 'Excellent (Grade A+)',
    },
  }[lang];

  // Calculated metrics
  const totalVisits = db.visits.length;
  const activeDoctors = db.doctors.length;
  
  // Total samples distributed
  let totalSamplesDistributed = 0;
  db.visits.forEach((v) => {
    v.samples.forEach((s) => {
      totalSamplesDistributed += s.quantityDistributed;
    });
  });

  // Remaining stock
  let totalStockLeft = 0;
  db.invoices.forEach((inv) => {
    inv.items.forEach((it) => {
      totalStockLeft += it.currentQuantity;
    });
  });

  // Call Rate calculation: Target 6 visits per week. Actual depends on db.
  const targetCallRate = 8;
  const actualCallRate = db.visits.filter(v => {
    // count visits in current week/month
    return true;
  }).length;
  const callRatePct = Math.min(Math.round((actualCallRate / targetCallRate) * 100), 100);

  // Customer Coverage: count distinct visited doctors in last 30 days vs total target list size (Class A + B)
  const totalTargetList = db.doctors.filter(d => d.classRating === 'A' || d.classRating === 'B').length;
  const visitedDoctorNames = new Set(db.visits.filter(v => v.clientType === 'Doctor').map(v => v.doctorName));
  const distinctVisitedCount = Array.from(visitedDoctorNames).length;
  const coveragePct = totalTargetList > 0 ? Math.min(Math.round((distinctVisitedCount / totalTargetList) * 100), 100) : 100;

  // Route Compliance: visits where isUnplanned is false / total visits
  const unplannedCount = db.visits.filter(v => v.isUnplanned).length;
  const compliancePct = totalVisits > 0 ? Math.round(((totalVisits - unplannedCount) / totalVisits) * 100) : 100;

  // Neglected Class A
  const neglectedClassADocs = db.doctors.filter(d => {
    if (d.classRating !== 'A') return false;
    const docVisits = db.visits.filter(v => v.doctorName === d.name);
    if (docVisits.length === 0) return true;
    const lastVisitDate = new Date([...docVisits].sort((a,b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0].visitDate);
    // current time anchor: 2026-06-02
    const diff = (new Date('2026-06-02').getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
    return diff > 14;
  });

  // Product focus stats
  const productShares: { [name: string]: number } = {};
  db.visits.forEach((v) => {
    v.samples.forEach((s) => {
      productShares[s.sampleName] = (productShares[s.sampleName] || 0) + s.quantityDistributed;
    });
  });
  const sortedProducts = Object.entries(productShares).sort((a, b) => b[1] - a[1]);
  const productTotalVal = Object.values(productShares).reduce((acc, curr) => acc + curr, 0);

  // Class productivity ratios (A, B, C count of visits)
  const classVisits = { A: 0, B: 0, C: 0 };
  db.visits.forEach((v) => {
    if (v.clientType === 'Doctor' && v.doctorClass) {
      if (v.doctorClass === 'A') classVisits.A++;
      else if (v.doctorClass === 'B') classVisits.B++;
      else if (v.doctorClass === 'C') classVisits.C++;
    }
  });
  const totalClassVisits = classVisits.A + classVisits.B + classVisits.C;

  // Monthly trend mock database
  const monthlyData = [
    { name: 'Jan', count: 12 },
    { name: 'Feb', count: 18 },
    { name: 'Mar', count: 24 },
    { name: 'Apr', count: 29 },
    { name: 'May', count: 35 },
    { name: 'Jun', count: totalVisits }, // real-time link
  ];

  // Determine dynamic Representative Profile Name
  const repName = localStorage.getItem('medrep_representative_name') || (lang === 'ar' ? 'وليد فريد' : 'Waleed Fareed');

  return (
    <div className="space-y-6 fade-in" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Welcome Top Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
              {lang === 'ar' ? `لوحة تحكم المندوب: ${repName}` : `Representative Dashboard: ${repName}`}
            </h1>
            <p className="text-slate-400 text-sm max-w-xl">
              {lang === 'ar' 
                ? 'مرحباً في نظام Med Rep الذكي لإدارة زياراتك الميدانية ومخزون فواتير العينات FIFO بشكل مستقل تماماً وبدون تغطية إنترنت مسبقة.' 
                : 'Welcome to the smart Med Rep CRM and SFA system. Monitor your field records and FIFO inventory fully offline.'}
            </p>
          </div>
          <div className="flex gap-3 text-xs shrink-0">
            <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full font-medium flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {lang === 'ar' ? 'منفصل كلياً (Offline-First)' : 'Offline-First Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Counter Summaries */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.totalVisits}</div>
            <div className="text-xl font-bold text-slate-800">{totalVisits}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.totalProducts}</div>
            <div className="text-xl font-bold text-slate-800">{totalSamplesDistributed}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-600 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.totalStock}</div>
            <div className="text-xl font-bold text-slate-800">{totalStockLeft}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-purple-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.activeDoctors}</div>
            <div className="text-xl font-bold text-slate-800">{activeDoctors}</div>
          </div>
        </div>
      </div>

      {/* Primary KPI Circular and Bar Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Call Rate Compliance */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-500" />
            {t.kpiCallRate}
          </h3>
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            {/* Custom SVG Circular Progress */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#3b82f6" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * callRatePct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-800">{callRatePct}%</span>
                <span className="text-[10px] text-slate-400 font-medium">{actualCallRate} / {targetCallRate}</span>
              </div>
            </div>
            <div className="flex justify-between w-full text-xs text-slate-500 mt-6 border-t border-slate-50 pt-3">
              <span>{t.actual}: <strong className="text-slate-800">{actualCallRate}</strong></span>
              <span>{t.target}: <strong className="text-slate-800">{targetCallRate}</strong></span>
            </div>
          </div>
        </div>

        {/* Target Coverage Rate */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            {t.kpiCoverage}
          </h3>
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#10b981" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * coveragePct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-800">{coveragePct}%</span>
                <span className="text-[10px] text-slate-400 font-medium">{distinctVisitedCount} / {totalTargetList}</span>
              </div>
            </div>
            <div className="flex justify-between w-full text-xs text-slate-500 mt-6 border-t border-slate-50 pt-3">
              <span>{t.actual}: <strong className="text-slate-800">{distinctVisitedCount} أطباء</strong></span>
              <span>{t.target}: <strong className="text-slate-800">{totalTargetList} مستهدف</strong></span>
            </div>
          </div>
        </div>

        {/* Route compliance and unplanned deviations */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-500" />
            {t.kpiRoute}
          </h3>
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#f59e0b" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * compliancePct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-800">{compliancePct}%</span>
                <span className="text-[10px] text-slate-400 font-medium">{totalVisits - unplannedCount} / {totalVisits}</span>
              </div>
            </div>
            <div className="flex justify-between w-full text-xs text-slate-500 mt-6 border-t border-slate-50 pt-3">
              <span>{lang === 'ar' ? 'مخطط:' : 'Planned:'} <strong className="text-slate-800">{totalVisits - unplannedCount}</strong></span>
              <span>{lang === 'ar' ? 'غير مخطط:' : 'Unplanned:'} <strong className="text-amber-600 font-bold">{unplannedCount}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Class Ratings and Focus share reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Product share bar lists */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm border-b border-slate-50 pb-2 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" />
            {t.kpiFocus}
          </h3>
          {sortedProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {lang === 'ar' ? 'لا توجد هدايا عينات منشورة لبيان مساهمة المنتجات' : 'No sample distribution logs found.'}
            </div>
          ) : (
            <div className="space-y-4">
              {sortedProducts.map(([name, qty]) => {
                const percent = productTotalVal > 0 ? Math.round((qty / productTotalVal) * 100) : 0;
                return (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-slate-700">{name}</span>
                      <span className="font-semibold text-slate-950 font-mono">{qty} وحدة ({percent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Class Ratings Breakdown */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-semibold text-slate-800 text-sm border-b border-slate-50 pb-2 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-500" />
            {t.productiveClass}
          </h3>
          {totalClassVisits === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {lang === 'ar' ? 'لا توجد تفاصيل تصنيفية متوفرة' : 'No ratings data available.'}
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-50">
                  <div className="text-xl font-extrabold text-purple-700 font-mono">{classVisits.A}</div>
                  <div className="text-[11px] text-purple-600 font-semibold mt-1">الفئة (A)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ({totalClassVisits > 0 ? Math.round((classVisits.A / totalClassVisits) * 100) : 0}%)
                  </div>
                </div>
                <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-50">
                  <div className="text-xl font-extrabold text-blue-700 font-mono">{classVisits.B}</div>
                  <div className="text-[11px] text-blue-600 font-semibold mt-1">الفئة (B)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ({totalClassVisits > 0 ? Math.round((classVisits.B / totalClassVisits) * 100) : 0}%)
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <div className="text-xl font-extrabold text-slate-700 font-mono">{classVisits.C}</div>
                  <div className="text-[11px] text-slate-600 font-semibold mt-1">الفئة (C)</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    ({totalClassVisits > 0 ? Math.round((classVisits.C / totalClassVisits) * 100) : 0}%)
                  </div>
                </div>
              </div>

              {/* Graphical Segmented Bar for easy reading */}
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 text-center font-medium">توزيع كثافة تفاعل الأطباء</div>
                <div className="w-full h-4 bg-slate-100 rounded-lg overflow-hidden flex">
                  <div 
                    className="bg-purple-500 h-full transition-all" 
                    style={{ width: `${totalClassVisits > 0 ? (classVisits.A / totalClassVisits) * 100 : 0}%` }}
                    title={`Class A: ${classVisits.A} visits`}
                  ></div>
                  <div 
                    className="bg-blue-500 h-full transition-all" 
                    style={{ width: `${totalClassVisits > 0 ? (classVisits.B / totalClassVisits) * 100 : 0}%` }}
                    title={`Class B: ${classVisits.B} visits`}
                  ></div>
                  <div 
                    className="bg-slate-400 h-full transition-all" 
                    style={{ width: `${totalClassVisits > 0 ? (classVisits.C / totalClassVisits) * 100 : 0}%` }}
                    title={`Class C: ${classVisits.C} visits`}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trend Analysis Longitudinal View */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-semibold text-slate-800 text-sm border-b border-slate-50 pb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          {t.trendTitle}
        </h3>
        <div className="space-y-2">
          <div className="text-xs text-slate-400">{t.monthlyTrend}:</div>
          {/* Custom SVG Line or area graph to avoid massive Recharts library errors */}
          <div className="w-full overflow-hidden">
            <svg viewBox="0 0 500 130" className="w-full h-32 overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Background grid lines */}
              <line x1="10" y1="10" x2="490" y2="10" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="10" y1="50" x2="490" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="10" y1="90" x2="490" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              
              {/* Plot coordinates */}
              {/* Jan: 10, Feb: 106, Mar: 202, Apr: 298, May: 394, Jun: 490 */}
              {/* Y coordinates derived from count: 12->95, 18->85, 24->75, 29->65, 35->55, real-time-visit->calculated */}
              {(() => {
                const junVal = totalVisits;
                const points = [
                  { x: 30, y: 110, count: 12, name: 'Jan' },
                  { x: 120, y: 95, count: 18, name: 'Feb' },
                  { x: 210, y: 80, count: 24, name: 'Mar' },
                  { x: 300, y: 68, count: 29, name: 'Apr' },
                  { x: 390, y: 50, count: 35, name: 'May' },
                  { x: 470, y: Math.max(10, 110 - (junVal * 1.5)), count: junVal, name: 'Jun' }
                ];
                
                const pathString = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const closedPathString = `${pathString} L ${points[points.length-1].x} 115 L ${points[0].x} 115 Z`;
                
                return (
                  <>
                    {/* Area fill */}
                    <path d={closedPathString} fill="url(#chartGradient)" />
                    {/* Stroke line */}
                    <path d={pathString} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Points and Text labels */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle cx={p.x} cy={p.y} r="4.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" className="hover:scale-125 transition-transform" />
                        <text x={p.x} y={p.y - 12} fontSize="10" fill="#1e293b" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">{p.count}</text>
                        <text x={p.x} y="125" fontSize="10" fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">{p.name}</text>
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      </div>

      {/* SFA KPIs Leaderboard & Motivation Scorecard */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-50 pb-2.5">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-500" />
            {t.kpisLeaderboard}
          </h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-center space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">{t.leaderRank}</div>
            <div className="text-sm font-extrabold text-slate-900 font-sans">{t.rankValue}</div>
            <div className="text-[9px] text-indigo-500 font-semibold">{lang === 'ar' ? 'القطاع الأوسط (الرياض)' : 'Riyadh Central Sector'}</div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-center space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">{t.leaderScore}</div>
            <div className="text-sm font-extrabold text-slate-900 font-mono">
              {(totalVisits * 125) + (totalSamplesDistributed * 20) + (compliancePct * 15)} PTS
            </div>
            <div className="text-[9px] text-slate-400 font-semibold">{lang === 'ar' ? 'محتسب حركياً' : 'Dynamically calculated'}</div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-center space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">{t.leaderStreak}</div>
            <div className="text-sm font-extrabold text-orange-600 font-sans">
              🔥 5 {lang === 'ar' ? 'أيام متواصلة' : 'Continuous Days'}
            </div>
            <div className="text-[9px] text-slate-400 font-semibold">{lang === 'ar' ? 'نسبة دقة تزامنية عالية' : 'Sync Precision Rate: 100%'}</div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-center space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase">{t.leaderGrade}</div>
            <div className="text-sm font-extrabold text-emerald-600 font-sans">{t.gradeDesc}</div>
            <div className="text-[9px] text-emerald-500 font-bold">🎖️ {lang === 'ar' ? 'المندوب العقاري المثالي' : 'Elite Representative'}</div>
          </div>
        </div>
      </div>

      {/* Class A physician neglect warning block */}
      {neglectedClassADocs.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <h4 className="font-semibold text-amber-900 text-sm flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            {t.neglectedAccounts}
          </h4>
          <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
            {neglectedClassADocs.map((d) => (
              <li key={d.id} className="font-medium">
                {d.name} <span className="text-slate-500">[{d.speciality}]</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Smart Guardrail alerts in RED */}
      <div className="bg-red-50/40 border border-red-100 rounded-2xl p-5 space-y-4">
        <h3 className="font-bold text-red-900 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 animate-pulse" />
          {t.redAlerts}
        </h3>
        
        {alarms.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-2 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            {t.noAlarms}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {alarms.map((alarm) => (
              <motion.div 
                whileHover={{ scale: 1.01 }}
                key={alarm.id} 
                className="bg-white border-l-4 border-red-500 hover:border-red-600 text-slate-800 p-3.5 rounded-xl shadow-xs flex items-start gap-3 border border-slate-100 transition-all"
              >
                <div className="p-1.5 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-red-950">
                    {lang === 'ar' ? alarm.titleAr : alarm.titleEn}
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-500">
                    {lang === 'ar' ? alarm.descriptionAr : alarm.descriptionEn}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
