/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, saveVirtualFile } from '../utils/db';
import { FileText, Search, TrendingUp, Sparkles, Download, Calendar, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportsViewProps {
  lang: 'ar' | 'en';
}

export default function ReportsView({ lang }: ReportsViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [reportType, setReportType] = useState<'sample' | 'doctor'>('sample');

  // Input Filters
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-06-30');
  const [selectedSample, setSelectedSample] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');

  // AI Analysis states
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    setDb(getInitialState());
    
    // Auto-populate default filters which are guaranteed to have data
    const activeSamples = getUniqueSamples();
    if (activeSamples.length > 0) setSelectedSample(activeSamples[0]);

    const activeDocs = db.doctors;
    if (activeDocs.length > 0) setSelectedDoctor(activeDocs[0].name);
  }, []);

  const getUniqueSamples = () => {
    const list = new Set<string>();
    db.invoices.forEach((inv) => inv.items.forEach((it) => list.add(it.sampleName)));
    return Array.from(list);
  };

  const t = {
    ar: {
      title: 'محرك التقارير المتقدم الميداني',
      sampleType: 'تقرير تفريغ الصنف الطبي (Sample)',
      doctorType: 'تقرير تفصيلي شامل للطبيب (Doctor)',
      dateFromLabel: 'من تاريخ الزيارات',
      dateToLabel: 'إلى تاريخ',
      sampleLabel: 'اختر الصنف المراد تفريغه',
      doctorLabel: 'اختر الطبيب للمسح الفحصي',
      generateHtml: 'تصدير التقرير لمجلد التحميلات',
      noData: 'لا توجد بيانات تطابق الفلاتر المحددة خلال هذه الفترة الزمنية.',
      visitDate: 'تاريخ الزيارة',
      docName: 'اسم الطبيب المعين',
      qtyDistributed: 'الكمية الموزعة',
      workplace: 'مكان العمل الحالي',
      notes: 'الملاحظات والجزئيات الفنية',
      doctorStatsTitle: 'ملخص مؤشرات الطبيب المستهدف:',
      totalVisits: 'إجمالي الزيارات المسجلة له:',
      totalDiscussions: 'مجموع العينات المصروفة للطبيب:',
      frequencyAnalysisTitle: '📊 تحليلات الفجوات الميدانية المتكررة (الخوارزمية المدمجة)',
      avgInterval: 'متوسط الفجوة الزمنية بين الزيارات الموثقة:',
      consistency: 'مستوى الثبات والاستمرارية:',
      regularPattern: 'ثبات منتظم • حلقة دائرية تفي شروط فئة أ',
      irregularPattern: 'تشتت مائل • فجوات متباعدة تتجاوز 14-20 يوماً! تنبيه إهمال',
      stableMsg: 'الزيارات متزنة وتحافظ على الفئة المعيارية بكفاءة.',
      warningMsg: 'تنبيه: يتجاوز معدل التفويت المخطط 14 يوماً. يجب تكثيف الزيارات هذا الأسبوع.',
      aiRecommendations: '🧠 اطلب استشارات وتوصيات الذكاء الاصطناعي (Gemini SFA Pro)',
      fetchingAi: 'جاري مراجعة سجلات الزيارة بواسطة ذكاء اصطناعي...',
      aiSourcesim: '(محاكاة سريعة - وضع الأوفلاين)',
      aiSourcegemini: '(بيانات حية ومباشرة من Gemini Pro)',
      exportSuccess: 'تم بنجاح تصدير وحفظ التقرير المطلوب داخل مسار التحميلات: /Med Rep/DOWNLOAD/',
    },
    en: {
      title: 'Advanced Diagnostic Reports',
      sampleType: 'Sample Release Distribution Report',
      doctorType: 'Detailed Analytics Physician Report',
      dateFromLabel: 'Visits From Date',
      dateToLabel: 'To Date',
      sampleLabel: 'Choose Sample Medicine',
      doctorLabel: 'Choose Targeted Doctor',
      generateHtml: 'Export Report Document',
      noData: 'No visits match selected filter parameters during this timeframe.',
      visitDate: 'Field Visit Date',
      docName: 'Doctor Name',
      qtyDistributed: 'Qty Distributed',
      workplace: 'Workplace',
      notes: 'Detailing notes',
      doctorStatsTitle: 'Physician SFA Summary Matrix:',
      totalVisits: 'Total Recorded Field Visits:',
      totalDiscussions: 'Total Distributed Medicine Items:',
      frequencyAnalysisTitle: '📊 Algorithmic Interval Frequency & Gap Analysis',
      avgInterval: 'Average chronological days elapsed between visits:',
      consistency: 'Vibe & Consistency Rating:',
      regularPattern: 'Regular Consistent Rhythm • Meets target benchmarks',
      irregularPattern: 'Unstable Intervals • Gaps exceed 14-20 days threshold!',
      stableMsg: 'Visits are consistent, successfully maintaining relation benchmarks.',
      warningMsg: 'Warning: Interaction interval exceeds 14 days safety threshold. Immediate callback suggested.',
      aiRecommendations: '🧠 Solve Detailing Recommendations using AI SFA Companion',
      fetchingAi: 'Analyzing physician chronological logs via Gemini brain...',
      aiSourcesim: '(Simulated offline local intelligence)',
      aiSourcegemini: '(Live connected Gemini SFA feedback)',
      exportSuccess: 'Report written to local directory successfully: /Med Rep/DOWNLOAD/',
    },
  }[lang];

  // 1. Sample report data calculations
  const filteredVisitsForSample = db.visits.filter((v) => {
    const isWithinDate = new Date(v.visitDate) >= new Date(dateFrom) && new Date(v.visitDate) <= new Date(dateTo);
    const hasSample = v.samples.some((s) => s.sampleName === selectedSample);
    return isWithinDate && hasSample;
  });

  // 2. Doctor report data calculations
  const doctorVisits = db.visits
    .filter((v) => {
      const isWithinDate = new Date(v.visitDate) >= new Date(dateFrom) && new Date(v.visitDate) <= new Date(dateTo);
      const isDoc = v.doctorName === selectedDoctor;
      return isWithinDate && isDoc;
    })
    .sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());

  // Aggregate items and quantities distributed to selected doctor
  const docProductShares: { [name: string]: number } = {};
  doctorVisits.forEach((v) => {
    v.samples.forEach((s) => {
      docProductShares[s.sampleName] = (docProductShares[s.sampleName] || 0) + s.quantityDistributed;
    });
  });

  // Algorithmic analysis of visit intervals
  let avgIntervalDays = 0;
  let isConsistent = true;
  if (doctorVisits.length > 1) {
    let diffSum = 0;
    for (let i = 0; i < doctorVisits.length - 1; i++) {
      const d1 = new Date(doctorVisits[i].visitDate).getTime();
      const d2 = new Date(doctorVisits[i + 1].visitDate).getTime();
      const dayDiff = (d2 - d1) / (1000 * 60 * 60 * 24);
      diffSum += dayDiff;
      if (dayDiff > 15) isConsistent = false;
    }
    avgIntervalDays = Math.round(diffSum / (doctorVisits.length - 1));
  } else {
    // If only one visit, gap is from that visit date to today
    const mockToday = new Date('2026-06-02').getTime();
    if (doctorVisits.length === 1) {
      const d = new Date(doctorVisits[0].visitDate).getTime();
      avgIntervalDays = Math.round((mockToday - d) / (1000 * 60 * 60 * 24));
      if (avgIntervalDays > 15) isConsistent = false;
    }
  }

  // Trigger server-side AI evaluation utilizing modern Gemini-3.5-flash
  const fetchAiDoctorAnalysis = async () => {
    setIsAiLoading(true);
    setAiAnalysisText(null);

    try {
      const response = await fetch('/api/ai/doctor-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctorName: selectedDoctor,
          visitsSorted: doctorVisits.map((v) => ({
            date: v.visitDate,
            workplace: v.workplaceName,
            samples: v.samples.map((s) => ({ name: s.sampleName, qty: s.quantityDistributed })),
            notes: v.notes,
          })),
        }),
      });

      const result = await response.json();
      if (result.success) {
        setAiAnalysisText(result.analysis);
      } else {
        setAiAnalysisText('خطأ في الاتصال بالذكاء الاصطناعي. يرجى تكرار المحاولة ثانية.');
      }
    } catch (e) {
      console.error(e);
      setAiAnalysisText('عذراً، تعذر الوصول لمشغلات الذكاء المباشرة المرفقة بالبرنامج الميداني.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // HTML Export mechanism for /Med Rep/DOWNLOAD/
  const exportGeneratedReport = () => {
    let exportHtml = '';
    let fileName = '';
    const logoBase64 = localStorage.getItem('corporate_logo');
    
    // Stamped image tag based on direction
    const logoImgTag = logoBase64 
      ? `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid ${reportType === 'sample' ? '#3b82f6' : '#8b5cf6'}; padding-bottom: 12px; margin-bottom: 20px;">
           <div style="flex-grow: 1;"></div>
           <div>
             <img src="${logoBase64}" style="max-height: 55px; max-width: 150px; object-fit: contain;" alt="Corporate Logo" />
           </div>
         </div>`
      : '';

    if (reportType === 'sample') {
      fileName = `report_sample_${selectedSample.replace(/\s+/g, '_')}.html`;
      exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>تقرير تفريغ عينة - ${selectedSample}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; background: #fafafa; }
    h1 { color: #0f172a; margin-top: 0; padding-bottom: 10px; font-size: 20px; }
    table { width: 100%; border-collapse: collapse; background: #fff; margin-top: 15px; }
    th { background: #3b82f6; color: white; padding: 12px; font-size: 13px; text-align: right; }
    td { padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  ${logoImgTag}
  <h1>تقرير تفريغ صنف [ ${selectedSample} ] من تاريخ ${dateFrom} إلى ${dateTo}</h1>
  <table>
    <thead>
      <tr>
        <th>تاريخ الزيارة</th>
        <th>اسم الطبيب</th>
        <th>عدد العينات المصروفة</th>
        <th>مكان العمل</th>
        <th>ملاحظات</th>
      </tr>
    </thead>
    <tbody>
      ${filteredVisitsForSample.map(v => {
        const sInfo = v.samples.find(s => s.sampleName === selectedSample);
        return `
          <tr>
            <td>${v.visitDate}</td>
            <td>${v.doctorName || 'عميل خارجي'}</td>
            <td>${sInfo?.quantityDistributed || 0} وحدة</td>
            <td>${v.workplaceName}</td>
            <td>${v.notes}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
</body>
</html>
      `;
    } else {
      fileName = `report_doctor_${selectedDoctor.replace(/\s+/g, '_')}.html`;
      exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>تقرير الطبيب التفصيلي - ${selectedDoctor}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; }
    h1 { margin-top: 0; padding-bottom: 10px; }
    .stat-box { background: #f3e8ff; border: 1px solid #d8b4fe; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #8b5cf6; color: white; padding: 12px; }
    td { padding: 12px; border: 1px solid #ddd; }
  </style>
</head>
<body>
  ${logoImgTag}
  <h1>خط السير التفصيلي للطبيب: ${selectedDoctor}</h1>
  <div class="stat-box">
    <strong>إجمالي الزيارات:</strong> ${doctorVisits.length} زيارات في الفترة المحددة.<br>
    <strong>العينات المصروفة مسبقاً:</strong> ${Object.entries(docProductShares).map(([k,v]) => `${k} (${v} وحدات)`).join(' ، ')}
  </div>
  <table>
    <thead>
      <tr>
        <th>التاريخ</th>
        <th>الذروة والنشاط الموثق</th>
        <th>مذكرات وملاحظات الزيارة</th>
      </tr>
    </thead>
    <tbody>
      ${doctorVisits.map(v => `
        <tr>
          <td>${v.visitDate}</td>
          <td>${v.workplaceName}</td>
          <td>${v.notes}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
      `;
    }

    saveVirtualFile({
      name: fileName,
      size: `${(exportHtml.length / 1024).toFixed(1)} KB`,
      dateModified: new Date().toISOString().replace('T', ' ').substring(0, 16),
      folder: 'DOWNLOAD',
      content: exportHtml,
      type: 'html',
    });

    alert(t.exportSuccess);
  };

  return (
    <div className="space-y-6 fade-in text-slate-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Title block */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.title}</h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar' 
                ? 'استخرج تقارير جاهزة للطباعة مع تحليلات فترات زيارات الطبيب وتفريغ الدفعات.' 
                : 'Generate static medical audits, chronological release statistics, and analytical reviews.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={exportGeneratedReport}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4" />
          {t.generateHtml}
        </button>
      </div>

      {/* Tabs of Reports */}
      <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm w-full border border-slate-200">
        <button
          type="button"
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            reportType === 'sample' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => {
            setReportType('sample');
            setAiAnalysisText(null);
          }}
        >
          {lang === 'ar' ? 'تفريغ العينات' : 'Sample Ledger'}
        </button>
        <button
          type="button"
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            reportType === 'doctor' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => {
            setReportType('doctor');
            setAiAnalysisText(null);
          }}
        >
          {lang === 'ar' ? 'تقرير الطبيب' : 'Doctor Chrono'}
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">{t.dateFromLabel}</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-mono font-medium"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setAiAnalysisText(null);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">{t.dateToLabel}</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-mono font-medium"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setAiAnalysisText(null);
              }}
            />
          </div>

          {reportType === 'sample' ? (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600">{t.sampleLabel}</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-semibold text-slate-800"
                value={selectedSample}
                onChange={(e) => setSelectedSample(e.target.value)}
              >
                {getUniqueSamples().map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[11px] font-bold text-slate-600">{t.doctorLabel}</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none font-semibold text-slate-800"
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(e.target.value);
                  setAiAnalysisText(null);
                }}
              >
                {db.doctors.map((d) => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Render Outputs in real-time */}
      <AnimatePresence mode="wait">
        {reportType === 'sample' ? (
          <motion.div 
            key="sample-report"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm">
                {lang === 'ar' 
                  ? `تقرير تفريغ صنف [ ${selectedSample || 'الكل'} ]` 
                  : `Sample Distribution Table for [ ${selectedSample} ]`}
              </h3>
            </div>

            {filteredVisitsForSample.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 capitalize">
                {t.noData}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                      <th className="px-4 py-3">{t.visitDate}</th>
                      <th className="px-4 py-3">{t.docName}</th>
                      <th className="px-4 py-3 text-center">{t.qtyDistributed}</th>
                      <th className="px-4 py-3">{t.workplace}</th>
                      <th className="px-4 py-3">{t.notes}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredVisitsForSample.map((v) => {
                      const distribution = v.samples.find((s) => s.sampleName === selectedSample);
                      return (
                        <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono font-medium">{v.visitDate}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{v.doctorName || 'عميل'}</td>
                          <td className="px-4 py-3 text-center text-blue-600 font-extrabold font-mono">
                            {distribution?.quantityDistributed} وحدات
                          </td>
                          <td className="px-4 py-3 font-medium">{v.workplaceName}</td>
                          <td className="px-4 py-3 text-slate-400 font-light truncate max-w-sm" title={v.notes}>
                            {v.notes || '---'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="doctor-report"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {lang === 'ar' ? `خط السير المطول للطبيب: ${selectedDoctor}` : `Interaction Ledger with: ${selectedDoctor}`}
                </h3>
              </div>

              {doctorVisits.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {t.noData}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Aggregated Quick KPIs statistics */}
                  <div className="p-4 bg-purple-50/50 border border-purple-100/50 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold">{t.doctorStatsTitle}</div>
                      <div className="text-xs text-slate-700 font-medium flex justify-between">
                        <span>{t.totalVisits}</span>
                        <strong className="text-purple-700 font-mono text-sm">{doctorVisits.length}</strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-transparentselect uppercase">.</div>
                      <div className="text-xs text-slate-700 font-medium flex justify-between">
                        <span>{t.totalDiscussions}</span>
                        <div className="space-y-0.5 text-left md:text-right font-mono text-[11px] font-bold text-slate-900">
                          {Object.entries(docProductShares).map(([k, v]) => (
                            <div key={k}>{k}: <span className="text-purple-600 font-extrabold">{v} وحدة</span></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Frequency Interval Gap analysis */}
                  <div className="border border-slate-100 rounded-xl p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                      {t.frequencyAnalysisTitle}
                    </h4>

                    <div className="text-xs space-y-2 text-slate-700">
                      <div className="flex justify-between">
                        <span>{t.avgInterval}</span>
                        <span className="font-extrabold font-mono text-purple-600 text-sm">{avgIntervalDays} يوماً</span>
                      </div>

                      <div className="flex justify-between items-center">
                        <span>{t.consistency}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isConsistent ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {isConsistent ? t.regularPattern : t.irregularPattern}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-100">
                        {isConsistent ? t.stableMsg : t.warningMsg}
                      </p>
                    </div>
                  </div>

                  {/* Visit Log records list */}
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-600 font-bold">
                          <th className="px-4 py-3">{t.visitDate}</th>
                          <th className="px-4 py-3">{t.workplace}</th>
                          <th className="px-4 py-3">{t.notes}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {doctorVisits.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50/40">
                            <td className="px-4 py-3 font-mono font-medium">{v.visitDate}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{v.workplaceName}</td>
                            <td className="px-4 py-3 text-slate-500 font-light max-w-md antialiased">{v.notes || '---'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* AI Interactive SFA report recommendation solver */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-950 text-white rounded-2xl p-5 shadow-sm space-y-4 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-12 -mt-12"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
                    <h4 className="font-extrabold text-sm text-indigo-100">{t.aiRecommendations}</h4>
                  </div>

                  <button
                    type="button"
                    onClick={fetchAiDoctorAnalysis}
                    disabled={isAiLoading || doctorVisits.length === 0}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/15 cursor-pointer"
                  >
                    {isAiLoading ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        {t.fetchingAi}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        {lang === 'ar' ? 'حلل السجل الحركي الآن' : 'Fetch AI Detailing Counsel'}
                      </>
                    )}
                  </button>
                </div>

                {/* Response render markdown container */}
                {aiAnalysisText && (
                  <motion.div 
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2 text-xs leading-relaxed text-slate-100 font-sans"
                  >
                    {/* Source label */}
                    <div className="text-[10px] text-indigo-300 font-mono flex items-center justify-end gap-1 mb-1">
                      {aiAnalysisText.includes('تلافي الخروج الجغرافي') ? t.aiSourcesim : t.aiSourcegemini}
                    </div>

                    <div className="whitespace-pre-line text-slate-200">
                      {aiAnalysisText}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
