/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, evaluateGuardrailAlarms, GuardrailAlarm } from '../utils/db';
import { AlertTriangle, CheckCircle, TrendingUp, Calendar, Users, MapPin, Package, Award, Clock, Sun, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardViewProps {
  lang: 'ar' | 'en';
}

const AlarmCard: React.FC<{ alarm: GuardrailAlarm; lang: 'ar' | 'en' }> = ({ alarm, lang }) => {
  return (
    <div className={`border-l-4 ${alarm.severity === 'red' ? 'border-red-500 hover:border-red-650 bg-red-50/20' : 'border-amber-500 hover:border-amber-650 bg-amber-50/20'} border-slate-100 p-4 rounded-xl shadow-xs flex items-start gap-3.5 transition-all text-right`}>
      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${alarm.severity === 'red' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div className="space-y-1 w-full flex-1 min-w-0">
        <div className="text-xs font-bold text-slate-950 truncate">
          {lang === 'ar' ? alarm.titleAr : alarm.titleEn}
        </div>
        <div className="text-[11px] leading-relaxed text-slate-550 break-words line-clamp-3">
          {lang === 'ar' ? alarm.descriptionAr : alarm.descriptionEn}
        </div>
        <div className="pt-2 text-[9px] text-slate-400 font-semibold border-t border-slate-100 mt-2 flex items-center justify-between">
          <span>{lang === 'ar' ? 'الرمز:' : 'Ref:'}</span>
          <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded text-slate-600">{alarm.id}</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardView({ lang }: DashboardViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [alarms, setAlarms] = useState<GuardrailAlarm[]>([]);
  const [subView, setSubView] = useState<'main' | 'stock' | 'security'>('main');

  useEffect(() => {
    // Reload database state
    setDb(getInitialState());
    setAlarms(evaluateGuardrailAlarms());
  }, []);

  const t = {
    ar: {
      title: 'لوحة التحكم والمؤشرات الذكية',
      kpiCallRate: 'معدل المكالمات للأسبوع الحالي',
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
      stockWarnings: '⚠️ تنبيهات المخزون الذكي وصلاحية الدفعات:',
      lowStockMsg: 'تنبيه انخفاض مخزون: الصنف [NAME] شارف على النفاد (المتبقي: QTY علب).',
    },
    en: {
      title: 'Dashboard & Smart SFA Indicators',
      kpiCallRate: 'Current Week Call Rate',
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
      stockWarnings: '⚠️ Intelligent Stock & Expiration Warnings:',
      lowStockMsg: 'Low inventory alert: [NAME] is running out (Remaining: QTY units).',
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

  // =====================================================================================
  // دقة الفلترة: حساب الزيارات التي وقعت في الأسبوع الحالي فقط (حل النقطة 8)
  // =====================================================================================
  const getStartOfWeek = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday is start
    return new Date(d.setDate(diff));
  };
  const startOfWeekDate = getStartOfWeek(new Date());
  startOfWeekDate.setHours(0,0,0,0);

  const visitsThisWeek = db.visits.filter((v) => {
    const vDate = new Date(v.visitDate);
    return vDate >= startOfWeekDate;
  });

  const targetCallRate = 60;
  const actualCallRate = visitsThisWeek.length;
  const callRatePct = Math.min(Math.round((actualCallRate / targetCallRate) * 100), 100);

  // Customer Coverage
  const totalTargetList = db.doctors.filter(d => d.classRating === 'A' || d.classRating === 'B').length;
  const visitedDoctorNames = new Set(db.visits.filter(v => v.clientType === 'Doctor').map(v => v.doctorName));
  const distinctVisitedCount = Array.from(visitedDoctorNames).length;
  const coveragePct = totalTargetList > 0 ? Math.min(Math.round((distinctVisitedCount / totalTargetList) * 100), 100) : 100;

  // =====================================================================================
  // الالتزام الفعلي: مقارنة الزيارات الفعلية بالعيادات المحددة في خطة السير الأسبوعية (حل النقطة 11)
  // =====================================================================================
  let routeCompliancePct = 100;
  const activeCycle = db.weeklyCycles[0];
  if (activeCycle && visitsThisWeek.length > 0) {
    let matchesCount = 0;
    visitsThisWeek.forEach((v) => {
      const dayName = new Date(v.visitDate).toLocaleDateString('en-US', { weekday: 'long' });
      const planForDay = activeCycle.plans.find(p => p.day === dayName);
      if (planForDay) {
        const isScheduled = planForDay.morning.workplaces.some(w => w.toLowerCase() === v.workplaceName.toLowerCase()) ||
                            planForDay.evening.workplaces.some(w => w.toLowerCase() === v.workplaceName.toLowerCase());
        if (isScheduled) {
          matchesCount++;
        }
      }
    });
    routeCompliancePct = Math.round((matchesCount / visitsThisWeek.length) * 100);
  } else if (totalVisits > 0) {
    // Fallback if no active cycle: non-unplanned visits percentage
    const unplannedCount = db.visits.filter(v => v.isUnplanned).length;
    routeCompliancePct = Math.round(((totalVisits - unplannedCount) / totalVisits) * 100);
  }

  // Dynamic Class A Neglect check
  const neglectedClassADocs = db.doctors.filter(d => {
    if (d.classRating !== 'A') return false;
    const docVisits = db.visits.filter(v => v.doctorName === d.name);
    if (docVisits.length === 0) return true;
    const lastVisitDate = new Date([...docVisits].sort((a,b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime())[0].visitDate);
    const diff = (new Date().getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24);
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

  // =====================================================================================
  // تنبيهات المخزون التلقائية الذكية (حل النقطة 9) تتبع الصلاحية وتفاصيل الدفعات
  // =====================================================================================
  const today = new Date();
  today.setHours(0,0,0,0);

  const batchExpiryDetails: {
    sampleName: string;
    invoiceNumber: string;
    invoiceDate: string;
    currentQuantity: number;
    expiryDate: string;
    status: 'expired' | 'critical' | 'normal';
    daysDiff: number;
  }[] = [];

  const sparseStockList: {
    sampleName: string;
    currentQuantity: number;
    invoiceNumber: string;
    status: 'empty' | 'low';
  }[] = [];

  const stockWarnings: string[] = [];

  db.invoices.forEach((inv) => {
    inv.items.forEach((it) => {
      // 1. Quantity check (low stock under 10)
      if (it.currentQuantity < 10) {
        sparseStockList.push({
          sampleName: it.sampleName,
          currentQuantity: it.currentQuantity,
          invoiceNumber: inv.invoiceNumber,
          status: it.currentQuantity === 0 ? 'empty' : 'low'
        });

        if (it.currentQuantity > 0) {
          const msg = t.lowStockMsg.replace('[NAME]', it.sampleName).replace('QTY', String(it.currentQuantity));
          if (!stockWarnings.includes(msg)) {
            stockWarnings.push(msg);
          }
        }
      }

      // 2. Expiry dates check
      if (it.currentQuantity > 0 && it.expiryDate) {
        const expDate = new Date(it.expiryDate);
        expDate.setHours(0,0,0,0);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let expiryStatus: 'expired' | 'critical' | 'normal' = 'normal';
        if (diffDays <= 0) {
          expiryStatus = 'expired';
        } else if (diffDays <= 60) {
          expiryStatus = 'critical';
        }

        if (expiryStatus !== 'normal') {
          batchExpiryDetails.push({
            sampleName: it.sampleName,
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            currentQuantity: it.currentQuantity,
            expiryDate: it.expiryDate,
            status: expiryStatus,
            daysDiff: diffDays
          });
        }
      }
    });
  });

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

  // =====================================================================================
  // Daily Achievement & Smart Notifications
  // =====================================================================================
  const todayDateString = new Date().toISOString().split('T')[0];
  const todayDayNameEN = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todayPlan = activeCycle?.plans.find(p => p.day === todayDayNameEN);
  
  const visitsTodayList = db.visits.filter(v => v.visitDate.startsWith(todayDateString));
  const visitsTodayCount = visitsTodayList.length;
  const workplacesVisitedToday = new Set(visitsTodayList.map(v => v.workplaceName)).size;
  
  let todayScheduledWorkplacesCount = 0;
  let todayScheduledNames: string[] = [];
  if(todayPlan) {
      const scheduledSet = new Set<string>();
      todayPlan.morning.workplaces.forEach(w => { if(w.trim()) scheduledSet.add(w.trim()) });
      todayPlan.evening.workplaces.forEach(w => { if(w.trim()) scheduledSet.add(w.trim()) });
      todayScheduledWorkplacesCount = scheduledSet.size;
      todayScheduledNames = Array.from(scheduledSet);
  }
  
  const remainingPlanToday = Math.max(0, todayScheduledWorkplacesCount - workplacesVisitedToday);

  // Representative Name
  const repName = localStorage.getItem('medrep_representative_name') || (lang === 'ar' ? 'وليد فريد' : 'Waleed Fareed');

  // Dynamic score and standings calculations
  const calculatedScore = (totalVisits * 125) + (totalSamplesDistributed * 20) + (routeCompliancePct * 15);
  
  const regionalCompetitors = [
    { name: lang === 'ar' ? 'أحمد سليمان (جدة)' : 'Ahmad Suleiman (Jeddah)', region: lang === 'ar' ? 'القطاع الغربي' : 'Western Region', score: 3850, compliance: 96, isUser: false },
    { name: lang === 'ar' ? 'سارة مراد (الدمام)' : 'Sarah Mourad (Dammam)', region: lang === 'ar' ? 'القطاع الشرقي' : 'Eastern Region', score: 2420, compliance: 92, isUser: false },
    { name: lang === 'ar' ? 'ياسر العتيبي (أبها)' : 'Yasser Al-Otaibi (Abha)', region: lang === 'ar' ? 'القطاع الجنوبي' : 'Southern Region', score: 1450, compliance: 85, isUser: false },
    { name: lang === 'ar' ? 'ريما القحطاني (تبوك)' : 'Rima Al-Qahtani (Tabuk)', region: lang === 'ar' ? 'القطاع الشمالي' : 'Northern Region', score: 720, compliance: 78, isUser: false }
  ];

  const liveLeaderboard = [
    ...regionalCompetitors,
    { name: repName + (lang === 'ar' ? ' (أنت - الرياض)' : ' (You - Riyadh)'), region: lang === 'ar' ? 'القطاع الأوسط' : 'Central Region', score: calculatedScore, compliance: routeCompliancePct, isUser: true }
  ].sort((a, b) => b.score - a.score);

  const userRankIndex = liveLeaderboard.findIndex(c => c.isUser);
  const userRank = userRankIndex + 1;

  let targetingGrade = 'C';
  if (calculatedScore >= 2500) targetingGrade = 'A+';
  else if (calculatedScore >= 1500) targetingGrade = 'A';
  else if (calculatedScore >= 850) targetingGrade = 'B';
  else if (calculatedScore >= 350) targetingGrade = 'B-';

  const gradingLabel = {
    'A+': lang === 'ar' ? 'استثنائي (A+)' : 'Elite (A+)',
    'A': lang === 'ar' ? 'ممتاز (A)' : 'Excellent (A)',
    'B': lang === 'ar' ? 'جيد جداً (B)' : 'Very Good (B)',
    'B-': lang === 'ar' ? 'مقبول (B-)' : 'Good (B-)',
    'C': lang === 'ar' ? 'تحت التقييم (C)' : 'Under Evaluation (C)'
  }[targetingGrade as 'A+' | 'A' | 'B' | 'B-' | 'C'] || (lang === 'ar' ? 'تحت التقييم (C)' : 'Under Evaluation (C)');

  const dynamicStreak = Math.max(1, new Set(db.visits.map(v => v.visitDate.split('T')[0])).size);

  const stockAlertsCount = sparseStockList.length + batchExpiryDetails.length;
  const securityAlertsCount = alarms.length + neglectedClassADocs.length;

  if (subView === 'stock') {
    return (
      <div className="space-y-6 fade-in text-right" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header with Back Button */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSubView('main')}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center w-10 h-10 shrink-0"
              title={lang === 'ar' ? 'العودة للوحة التحكم الرئيسية' : 'Back to Dashboard'}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {lang === 'ar' ? 'تنبيهات المخزون الذكي وصلاحية الدفعات' : 'Smart Stock & Batch Expiry Alerts'}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {lang === 'ar' 
                  ? 'عرض تفصيلي لجميع الأدوية شحيحة المخزون وتواريخ الصلاحية وتتبع دفعات FIFO المنتهية أو القريبة من النفاد.'
                  : 'FIFO batch tracking, low levels, and soon-to-expire pharmaceutical items.'}
              </p>
            </div>
          </div>
          <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-100 self-start sm:self-center">
            {lang === 'ar' ? 'متابعة الصلاحية (FIFO)' : 'FIFO Compliance Screen'}
          </span>
        </div>

        {/* Overview Stats for Stock Alarm */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1">{lang === 'ar' ? 'أصناف قاربت على النفاد / فارغة' : 'Low Stock Items (<10 units)'}</div>
            <div className="text-3xl font-extrabold text-amber-655 font-mono">
              {sparseStockList.length}
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1">{lang === 'ar' ? 'دفعات منتهية الصلاحية كلياً' : 'Expired Batches'}</div>
            <div className="text-3xl font-extrabold text-red-650 font-mono">
              {batchExpiryDetails.filter(b => b.status === 'expired').length}
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs">
            <div className="text-xs text-slate-500 mb-1">{lang === 'ar' ? 'دفعات تقترب من الانتهاء (60 يوم)' : 'Critical Batches (<60 days)'}</div>
            <div className="text-3xl font-extrabold text-orange-550 font-mono">
              {batchExpiryDetails.filter(b => b.status === 'critical').length}
            </div>
          </div>
        </div>

        {/* Section: Low Stock / Sparse Items list */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-500" />
            {lang === 'ar' ? 'مستويات المخزون المنخفضة والأقسام الفارغة' : 'Low Stock & Depleted Quantities'}
          </h3>

          {sparseStockList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <span className="font-semibold text-slate-700">{lang === 'ar' ? 'رائع! جميع مستويات المخزون آمنة وبكثرة.' : 'Splendid! All sample quantities are safe.'}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right text-slate-600">
                <thead className="text-xs text-slate-500 bg-slate-50">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-right">{lang === 'ar' ? 'اسم الصنف' : 'Sample Name'}</th>
                    <th scope="col" className="px-4 py-3 text-right">{lang === 'ar' ? 'الكمية الحالية' : 'Current Qty'}</th>
                    <th scope="col" className="px-4 py-3 text-right">{lang === 'ar' ? 'رقم الفاتورة' : 'Invoice Ref'}</th>
                    <th scope="col" className="px-4 py-3 text-right">{lang === 'ar' ? 'الحالة المعيارية' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sparseStockList.map((st, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{st.sampleName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-850">{st.currentQuantity}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{st.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        {st.currentQuantity === 0 ? (
                          <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100 inline-block">
                            {lang === 'ar' ? 'نفذ بالكامل (0 علبة)' : 'Out of Stock'}
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-105 inline-block">
                            {lang === 'ar' ? 'منخفض وحرج' : 'Low Inventory'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section: Batch expirations detail list */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-red-500" />
            {lang === 'ar' ? 'تنبيهات جرد صلاحية الدفعات (تاريخ الانتهاء)' : 'Batch Expiration Details & SFA Warnings'}
          </h3>

          {batchExpiryDetails.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
              <span className="font-semibold text-slate-700">{lang === 'ar' ? 'كل دفعات الأدوية المخزنة صالحة ولم تنته أو تقترب من النفاد.' : 'All pharmaceutical batches have safe shelf life.'}</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {batchExpiryDetails.map((batch, idx) => (
                <div 
                  key={idx} 
                  className={`p-4 rounded-xl border flex items-start gap-3.5 transition-all text-right ${
                    batch.status === 'expired' 
                      ? 'bg-red-50/40 border-red-150 text-slate-800' 
                      : 'bg-amber-50/30 border-amber-150 text-slate-800'
                  }`}
                >
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    batch.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{batch.sampleName}</span>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                        batch.status === 'expired' ? 'bg-red-200 text-red-850' : 'bg-amber-200/80 text-amber-850'
                      }`}>
                        {batch.status === 'expired' 
                          ? (lang === 'ar' ? 'منتهية الصلاحية ❌' : 'Expired') 
                          : (lang === 'ar' ? 'قاربت على الانتهاء ⚠️' : 'Expiring Soon')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span>{lang === 'ar' ? 'الفاتورة:' : 'Inv:'} <strong>{batch.invoiceNumber}</strong></span>
                      <span>{lang === 'ar' ? 'الكمية المتضررة:' : 'Qty:'} <strong>{batch.currentQuantity} علبة</strong></span>
                    </div>
                    <div className="text-xs font-semibold text-slate-800 pt-2 border-t border-slate-100 mt-2 flex justify-between items-center">
                      <span>{lang === 'ar' ? 'تاريخ الصلاحية:' : 'Expiry Date:'} <strong className="font-mono">{batch.expiryDate}</strong></span>
                      <span className={`font-bold ${batch.status === 'expired' ? 'text-red-705' : 'text-amber-850'}`}>
                        {batch.status === 'expired' 
                          ? (lang === 'ar' ? `منته منذ ${Math.abs(batch.daysDiff)} يوم` : `Expired ${Math.abs(batch.daysDiff)} days ago`)
                          : (lang === 'ar' ? `يتبقي ${batch.daysDiff} يوم فقط` : `${batch.daysDiff} days remaining`)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (subView === 'security') {
    return (
      <div className="space-y-6 fade-in text-right" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header with Back Button */}
        <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSubView('main')}
              className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center w-10 h-10 shrink-0"
              title={lang === 'ar' ? 'العودة للوحة التحكم الرئيسية' : 'Back to Dashboard'}
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                {lang === 'ar' ? 'تنبيهات الأمان الذكية والرقابة الميدانية' : 'Smart Security & Field Compliance'}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {lang === 'ar' 
                  ? 'رصد متقدم لمخالفات الـ GPS الجغرافي، التواقيت الزمنية للزيارات، التزييف الميداني، وإهمال الحسابات الهامة.'
                  : 'Advanced tracking of GPS coordinates mismatch, ghost visits, late entries, and class neglect.'}
              </p>
            </div>
          </div>
          <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full border border-red-150 self-start sm:self-center">
            {lang === 'ar' ? 'بروتوكول الرقابة الذاتية' : 'SFA Compliance Shield'}
          </span>
        </div>

        {/* Overview Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs flex justify-between items-center">
            <div>
              <div className="text-xs text-slate-550 mb-1">{lang === 'ar' ? 'مخالفات السير والـ GPS والأصالة' : 'Activity Compliance Breaches'}</div>
              <div className="text-3xl font-extrabold text-red-650 font-mono">{alarms.length}</div>
            </div>
            <div className="p-3 bg-red-100 text-red-600 rounded-xl shadow-xs">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-2xs flex justify-between items-center">
            <div>
              <div className="text-xs text-slate-550 mb-1">{lang === 'ar' ? 'أطباء فئة (أ) مهملون بدون زيارة' : 'Neglected Class A Physicians (>14d)'}</div>
              <div className="text-3xl font-extrabold text-amber-600 font-mono">{neglectedClassADocs.length}</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Section 1: Geofencing Breach (Geofencing Breach) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            {lang === 'ar' ? 'قسم خرق جيو-جغرافي (Geofencing Breach)' : 'Geofencing Breach'}
          </h3>
          {alarms.filter(a => a.type === 'Geofencing Breach').length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-4"><CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" /> {lang === 'ar' ? 'لا توجد مخالفات' : 'No violations'}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alarms.filter(a => a.type === 'Geofencing Breach').map((alarm) => (
                <AlarmCard key={alarm.id} alarm={alarm} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Ghost/Speed Call */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            {lang === 'ar' ? 'قسم زيارة وهمية / سريعة (Ghost/Speed Call)' : 'Ghost/Speed Call'}
          </h3>
          {alarms.filter(a => a.type === 'Ghost Call').length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-4"><CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" /> {lang === 'ar' ? 'لا توجد مخالفات' : 'No violations'}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alarms.filter(a => a.type === 'Ghost Call').map((alarm) => (
                <AlarmCard key={alarm.id} alarm={alarm} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* Section 3: Inactivity Alert */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            {lang === 'ar' ? 'قسم فجوة خمول ميداني (Inactivity Alert)' : 'Inactivity Alert'}
          </h3>
          {alarms.filter(a => a.type === 'Inactivity Alert').length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-4"><CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" /> {lang === 'ar' ? 'لا توجد مخالفات' : 'No violations'}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alarms.filter(a => a.type === 'Inactivity Alert').map((alarm) => (
                <AlarmCard key={alarm.id} alarm={alarm} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Late Start */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            {lang === 'ar' ? 'قسم بدء متأخر للنوبة (Late Start)' : 'Late Start Check-in'}
          </h3>
          {alarms.filter(a => a.type === 'Late Start').length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-4"><CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" /> {lang === 'ar' ? 'لا توجد مخالفات' : 'No violations'}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {alarms.filter(a => a.type === 'Late Start').map((alarm) => (
                <AlarmCard key={alarm.id} alarm={alarm} lang={lang} />
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Class A Neglect */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-50 pb-2.5 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            {lang === 'ar' ? 'قسم إهمال طبيب فئة (أ) تجاوز الوقت (Class A Neglect)' : 'Class A Neglect (>14 Days Without Visit)'}
          </h3>

          {neglectedClassADocs.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-4"><CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1" /> {lang === 'ar' ? 'لا توجد مخالفات' : 'No violations'}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {neglectedClassADocs.map((doc) => (
                <div key={doc.id} className="bg-amber-50/20 border border-amber-100 rounded-xl p-4 space-y-2 text-right">
                  <div className="flex items-center justify-between gap-2 border-b border-amber-50 pb-2">
                    <span className="font-bold text-slate-800 text-sm">{doc.name}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded">
                      {lang === 'ar' ? 'فئة أ' : 'Class A'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-550 space-y-1">
                    <div>{lang === 'ar' ? 'التخصص:' : 'Speciality:'} <strong className="text-slate-800">{doc.speciality}</strong></div>
                    <div>{lang === 'ar' ? 'مقر العمل ١:' : 'Workplace 1:'} <span className="text-slate-550 font-medium">{doc.workplace1 || 'غير محدد'}</span></div>
                    {doc.workplace2 && (
                      <div>{lang === 'ar' ? 'مقر العمل ٢:' : 'Workplace 2:'} <span className="text-slate-550 font-medium">{doc.workplace2}</span></div>
                    )}
                  </div>
                  <div className="pt-2 text-[10px] text-amber-800 font-bold leading-relaxed">
                    🚨 {lang === 'ar' ? 'حرج: مضى أكثر من ١٤ يوماً من دون تسجيل زيارة تسويقية!' : 'Critical: More than 14 days passed since last detailing!'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

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
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-blue-600 shrink-0 select-none">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.totalVisits}</div>
            <div className="text-xl font-bold text-slate-800">{totalVisits}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600 shrink-0 select-none">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.totalProducts}</div>
            <div className="text-xl font-bold text-slate-800">{totalSamplesDistributed}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-amber-600 shrink-0 select-none">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.totalStock}</div>
            <div className="text-xl font-bold text-slate-800">{totalStockLeft}</div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-4 hover:border-slate-200 transition-colors">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg text-purple-600 shrink-0 select-none">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-0.5">{t.activeDoctors}</div>
            <div className="text-xl font-bold text-slate-800">{activeDoctors}</div>
          </div>
        </div>
      </div>

      {/* Daily Achievement & Smart Notifications */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 shadow-md text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-300" />
              {lang === 'ar' ? 'إنجاز اليوم' : 'Today\'s Achievement'}
            </h3>
            <p className="text-white/80 text-sm">
              {lang === 'ar' ? 'تذكير ذكي: الزيارات المجدولة لهذا اليوم.' : 'Smart Notification: Scheduled routes for today.'}
            </p>
          </div>
          
          <div className="flex bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 gap-6">
            <div className="text-center">
              <div className="text-xs text-indigo-100 mb-1">{lang === 'ar' ? 'الزيارات المكتملة' : 'Visits Completed'}</div>
              <div className="text-2xl font-bold">{visitsTodayCount}</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-xs text-indigo-100 mb-1">{lang === 'ar' ? 'المواقع المزارة' : 'Places Visited'}</div>
              <div className="text-2xl font-bold">{workplacesVisitedToday}</div>
            </div>
            <div className="w-px bg-white/20"></div>
            <div className="text-center">
              <div className="text-xs text-indigo-100 mb-1">{lang === 'ar' ? 'المتبقي من الخطة' : 'Remaining To Do'}</div>
              <div className="text-2xl font-bold">{remainingPlanToday}</div>
            </div>
          </div>
        </div>

        {todayScheduledNames.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-white/90">
              <AlertCircle className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>
                 {lang === 'ar' ? 'المواقع المجدولة لك اليوم:' : 'Scheduled Workplaces Today:'}
                 <strong className="mx-1">{todayScheduledNames.join('، ')}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* بوابات المتابعة والتنبيهات المتقدمة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Portal Button 1: Stock alerts */}
        <button
          onClick={() => setSubView('stock')}
          className="bg-white hover:bg-slate-50/40 border border-slate-100 hover:border-amber-200 rounded-2xl p-5 text-right transition-all group flex items-start gap-4 cursor-pointer relative shadow-xs"
        >
          <div className="absolute top-4 left-4 flex items-center gap-1.5">
            {stockAlertsCount > 0 ? (
              <span className="bg-amber-100 text-amber-700 text-[10px] sm:text-xs font-extrabold px-2.5 py-1 rounded-full animate-bounce">
                {stockAlertsCount} {lang === 'ar' ? 'تنبيهات نشطة' : 'active alerts'}
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-600 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                ✔ {lang === 'ar' ? 'آمن كلياً' : 'Stock Secure'}
              </span>
            )}
          </div>

          <div className="p-3 bg-amber-50 group-hover:bg-amber-100 text-amber-600 rounded-xl transition-colors shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 leading-tight">
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-amber-700 transition-colors">
              {lang === 'ar' ? 'تنبيهات المخزون الذكي وصلاحية الدفعات' : 'Smart Stock & Expiry Alerts'}
            </h3>
            <p className="text-xs text-slate-500 leading-normal max-w-sm mt-1">
              {lang === 'ar' 
                ? 'استعراض النواقص الميدانية الفورية، تواريخ صلاحية عينات الأدوية المنتهية، والدفعات منتهية أو قاربت الانتهاء (حسب مبدأ FIFO).' 
                : 'Display low sample stocks, expired item batches, and soon-to-expire FIFO slots.'}
            </p>
          </div>
        </button>

        {/* Portal Button 2: Security & Guardrail alerts */}
        <button
          onClick={() => setSubView('security')}
          className="bg-white hover:bg-slate-50/40 border border-slate-100 hover:border-red-200 rounded-2xl p-5 text-right transition-all group flex items-start gap-4 cursor-pointer relative shadow-xs"
        >
          <div className="absolute top-4 left-4 flex items-center gap-1.5">
            {securityAlertsCount > 0 ? (
              <span className="bg-red-100 text-red-700 text-[10px] sm:text-xs font-extrabold px-2.5 py-1 rounded-full">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-ping ml-1"></span>
                {securityAlertsCount} {lang === 'ar' ? 'تنبيهات أمنية' : 'compliance notices'}
              </span>
            ) : (
              <span className="bg-emerald-50 text-emerald-600 text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full">
                ✔ {lang === 'ar' ? 'عمل آمن ومثالي' : 'Fully Compliant'}
              </span>
            )}
          </div>

          <div className="p-3 bg-red-50 group-hover:bg-red-100 text-red-650 rounded-xl transition-colors shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5 leading-tight">
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-red-750 transition-colors">
              {lang === 'ar' ? 'تنبيهات الأمان الذكية والرقابة الميدانية' : 'Smart Security & Field Compliance'}
            </h3>
            <p className="text-xs text-slate-550 leading-normal max-w-sm mt-1">
              {lang === 'ar' 
                ? 'مراقبة خطوط السير والالتزام الجغرافي بالـ GPS والمحطات الوهمية وتفادي إهمال الأطباء فئة (أ) الأكثر أهمية.' 
                : 'Track GPS geofence compliance, timing alignment, phantom visits and neglected doctors.'}
            </p>
          </div>
        </button>
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

        {/* Target Customer Coverage Rate */}
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
              <span>{t.actual}: <strong className="text-slate-800">{distinctVisitedCount} {lang === 'ar' ? 'أطباء' : 'docs'}</strong></span>
              <span>{t.target}: <strong className="text-slate-800">{totalTargetList} {lang === 'ar' ? 'مستهدف' : 'targets'}</strong></span>
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
                  strokeDashoffset={251.2 - (251.2 * routeCompliancePct) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-slate-800">{routeCompliancePct}%</span>
                <span className="text-[10px] text-slate-400 font-medium">{t.actual}</span>
              </div>
            </div>
            <div className="flex justify-between w-full text-xs text-slate-500 mt-6 border-t border-slate-50 pt-3">
              <span>{lang === 'ar' ? 'معدل الالتزام بخط السير والـ GPS التلقائي الذكي' : 'Route alignment & automatic matching accuracy.'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Class Ratings and Focus share reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="w-full overflow-hidden">
            <svg viewBox="0 0 500 130" className="w-full h-32 overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="10" y1="10" x2="490" y2="10" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="10" y1="50" x2="490" y2="50" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="10" y1="90" x2="490" y2="90" stroke="#f1f5f9" strokeWidth="1" />
              
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
                    <path d={closedPathString} fill="url(#chartGradient)" />
                    <path d={pathString} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
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
    </div>
  );
}
