/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, saveState, saveVirtualFile } from '../utils/db';
import { WeeklyCycle, DailyCyclePlan } from '../types';
import { Calendar, Building, Plus, Trash, Check, Download, FileText, ArrowLeftRight, Printer, Sun, Moon, MapPin, Sparkles } from 'lucide-react';

interface CyclePlanViewProps {
  lang: 'ar' | 'en';
}

const DAYS_OF_WEEK = {
  ar: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
  daysAr: {
    'Saturday': 'السبت',
    'Sunday': 'الأحد',
    'Monday': 'الإثنين',
    'Tuesday': 'الثلاثاء',
    'Wednesday': 'الأربعاء',
    'Thursday': 'الخميس'
  }
};

export default function CyclePlanView({ lang }: CyclePlanViewProps) {
  const [db, setDb] = useState(getInitialState());

  const [dateFrom, setDateFrom] = useState('2026-05-30');
  const [dateTo, setDateTo] = useState('2026-06-04');
  const [companyName, setCompanyName] = useState('فايزر العالمية (Pfizer Global)');
  const [repName, setRepName] = useState('وليد فريد (Waleed Fareed)');

  // Grid Plan State
  const [plans, setPlans] = useState<DailyCyclePlan[]>([
    { day: 'Saturday', morning: { workplaces: [] }, evening: { workplaces: [] } },
    { day: 'Sunday', morning: { workplaces: [] }, evening: { workplaces: [] } },
    { day: 'Monday', morning: { workplaces: [] }, evening: { workplaces: [] } },
    { day: 'Tuesday', morning: { workplaces: [] }, evening: { workplaces: [] } },
    { day: 'Wednesday', morning: { workplaces: [] }, evening: { workplaces: [] } },
    { day: 'Thursday', morning: { workplaces: [] }, evening: { workplaces: [] } },
  ]);

  // Inline workplace add state
  const [inputMap, setInputMap] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const currentState = getInitialState();
    setDb(currentState);
    if (currentState.weeklyCycles.length > 0) {
      const active = currentState.weeklyCycles[0];
      setDateFrom(active.dateFrom);
      setDateTo(active.dateTo);
      setCompanyName(active.companyName);
      setRepName(active.repName);
      setPlans(active.plans);
    }
  }, []);

  const t = {
    ar: {
      title: 'جدولة الخطة الميدانية الأسبوعية (Cycle Plan)',
      metaTitle: 'المعلومات القيادية للمندوب والشركة',
      compName: 'اسم الشركة الراعية',
      repNameName: 'اسم مندوب الدعاية الطبية',
      dateRange: 'فترة الخطة (من / إلى)',
      dayCol: 'اليوم الميداني',
      morningShift: 'النوبة الصباحية (Morning Shift)',
      eveningShift: 'النوبة المسائية (Evening Shift)',
      addPlaceholder: 'أدخل مستشفى/عيادة...',
      addBtn: 'إضافة لخط السير',
      savePlan: 'حفظ هيكل الخطة',
      exportPlan: 'تصدير المستند المعتمد للتحميل',
      exportSuccess: 'تم تصدير الخطة المعتمدة وكتابتها بنجاح داخل مجلد التحميلات الخاص بك: /Med Rep/DOWNLOAD/',
      saveSuccess: 'تم تسوية وتوثيق خطة السير الحالية في الذاكرة المحلية بنجاح!',
      workplacesList: 'العيادات المستهدفة:',
      emptyShift: 'خفيفة / بدون زيارات مجدولة',
    },
    en: {
      title: 'Weekly Cycle Plan Layout',
      metaTitle: 'Representative & Corporate Metadata',
      compName: 'Sponsoring Company Name',
      repNameName: 'Representative Full Name',
      dateRange: 'Cycle Date Boundary (From / To)',
      dayCol: 'Field Day',
      morningShift: 'Morning Shift',
      eveningShift: 'Evening Shift',
      addPlaceholder: 'Add clinic/workplace...',
      addBtn: 'Add to path',
      savePlan: 'Save Plan Outline',
      exportPlan: 'Export Approved Document',
      exportSuccess: 'Approved SFA plan written to storage successfully: /Med Rep/DOWNLOAD/',
      saveSuccess: 'Weekly flight plan logged in local SFA modules!',
      workplacesList: 'Targeted Workplaces:',
      emptyShift: 'Light cycle / No clinic visits scheduled',
    },
  }[lang];

  const handleAddWorkplace = (day: string, shift: 'morning' | 'evening') => {
    const key = `${day}-${shift}`;
    const name = inputMap[key];
    if (!name || !name.trim()) return;

    const updated = plans.map(p => {
      if (p.day === day) {
        return {
          ...p,
          [shift]: {
            workplaces: [...p[shift].workplaces, name.trim()]
          }
        };
      }
      return p;
    });

    setPlans(updated);
    setInputMap({
      ...inputMap,
      [key]: ''
    });
  };

  const handleRemoveWorkplace = (day: string, shift: 'morning' | 'evening', idx: number) => {
    const updated = plans.map(p => {
      if (p.day === day) {
        return {
          ...p,
          [shift]: {
            workplaces: p[shift].workplaces.filter((_, i) => i !== idx)
          }
        };
      }
      return p;
    });
    setPlans(updated);
  };

  const handleSavePlanLayout = () => {
    const state = getInitialState();
    const cycle: WeeklyCycle = {
      id: state.weeklyCycles[0]?.id || `cycle-${Date.now()}`,
      dateFrom,
      dateTo,
      companyName,
      repName,
      plans,
    };

    // overwrite or push
    state.weeklyCycles = [cycle];
    saveState(state);
    setDb(state);
    alert(t.saveSuccess);
  };

  // Writing full export simulation payload reports to download directories
  const handleExportPlanDocument = (format: 'html' | 'print') => {
    // Generate styled HTML structure for offline share
    const exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>الخطة الاسبوعية - ${repName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 5mm;
    }
    body {
      font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 0;
      margin: 0;
      color: #1e293b;
      background-color: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 10px;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 8px;
      text-align: center;
      margin-bottom: 8px;
      box-shadow: 0 2px 4px rgba(79, 70, 229, 0.1);
    }
    .header h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 800;
    }
    .metadata-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 8px;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .metadata-table td {
      padding: 4px 8px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
      color: #334155;
      font-weight: 600;
    }
    .metadata-table td.label {
      font-weight: 700;
      background: #f8fafc;
      width: 15%;
      color: #475569;
      border-left: 1px solid #e2e8f0;
    }
    .plan-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .plan-grid th {
      padding: 6px 8px;
      background: #f8fafc;
      color: #1e293b;
      text-align: right;
      font-size: 12px;
      font-weight: 800;
      border-bottom: 2px solid #e2e8f0;
    }
    .plan-grid td {
      padding: 6px 8px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
      font-size: 10px;
    }
    .plan-grid td.day {
      font-weight: 800;
      background: #f8fafc;
      text-align: center;
      width: 90px;
      border-left: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .day-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .day-name {
      background: #ffffff;
      padding: 2px 6px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      color: #0f172a;
      font-weight: 700;
      font-size: 11px;
      display: inline-block;
      text-align: center;
    }
    .day-sub {
      font-size: 8px;
      color: #94a3b8;
      font-weight: 700;
    }
    .workplace-pill {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      border: 1px solid #cbd5e1;
      padding: 2px 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 2px;
      margin: 2px;
      font-size: 10px;
      font-weight: 700;
      color: #1e293b;
    }
    .empty-state {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #94a3b8;
      font-style: italic;
      font-weight: 600;
      font-size: 10px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      padding: 4px 8px;
      border-radius: 6px;
      width: 100%;
      box-sizing: border-box;
    }
    .icon {
      display: none;
    }
    .header-icon {
      width: 14px;
      height: 14px;
      vertical-align: middle;
      display: inline-block;
    }
    .header-content {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    @media print {
      body { padding: 0; background-color: #ffffff; }
      .header { box-shadow: none; background: #6366f1 !important; color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .plan-grid { box-shadow: none; }
      .metadata-table { box-shadow: none; }
      .workplace-pill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 15px; display: flex; justify-content: flex-end;">
    <button onclick="window.print();" style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border: none; padding: 8px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Cairo', sans-serif; font-size: 13px; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
      <span>🖨️ طباعة وحفظ PDF ملون</span>
    </button>
  </div>

  <div class="header">
    <h1>الخطة الاسبوعية</h1>
  </div>

  <table class="metadata-table">
    <tr>
      <td class="label">اسم المندوب:</td>
      <td>${repName}</td>
      <td class="label">التاريخ:</td>
      <td>من ${dateFrom} إلى ${dateTo}</td>
    </tr>
    <tr>
      <td class="label">الشركة:</td>
      <td colspan="3">${companyName}</td>
    </tr>
  </table>

  <table class="plan-grid">
    <thead>
      <tr>
        <th>اليوم</th>
        <th>
          <div class="header-content">
            <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            الفترة الصباحية
          </div>
        </th>
        <th>
          <div class="header-content">
            <svg class="header-icon" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 4px;"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
            الفترة المسائية
          </div>
        </th>
      </tr>
    </thead>
    <tbody>
      ${plans.map((p, idxDay) => `
        <tr>
          <td class="day">
            <div class="day-wrapper">
              <span class="day-name">${DAYS_OF_WEEK.daysAr[p.day as keyof typeof DAYS_OF_WEEK.daysAr] || p.day}</span>
              <span class="day-sub">${p.day.substring(0, 3).toUpperCase()} • اليوم ${idxDay + 1}</span>
            </div>
          </td>
          <td>
            ${p.morning.workplaces.length === 0 ? `
              <div class="empty-state">نوبة خفيفة / صفر</div>
            ` : p.morning.workplaces.map(w => `
              <span class="workplace-pill">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1; margin-left: 4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                ${w}
              </span>
            `).join('')}
          </td>
          <td>
            ${p.evening.workplaces.length === 0 ? `
              <div class="empty-state">نوبة خفيفة / صفر</div>
            ` : p.evening.workplaces.map(w => `
              <span class="workplace-pill">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #6366f1; margin-left: 4px;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                ${w}
              </span>
            `).join('')}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
`;

    if (format === 'html') {
      const fileName = `weekly_cycle_${dateFrom}_to_${dateTo}.html`;
      saveVirtualFile({
        name: fileName,
        size: `${(exportHtml.length / 1024).toFixed(1)} KB`,
        dateModified: new Date().toISOString().replace('T', ' ').substring(0, 16),
        folder: 'DOWNLOAD',
        content: exportHtml,
        type: 'html'
      });
      alert(t.exportSuccess);
    } else if (format === 'print') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Embed auto-print trigger cleanly at the end of the premium HTML page
        const printablePayload = exportHtml.replace('</body>', `
          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            }
          <\/script>
        </body>`);
        printWindow.document.write(printablePayload);
        printWindow.document.close();
      }
    }
  };

  return (
    <div className="space-y-6 fade-in text-slate-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Title Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.title}</h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar' 
                ? 'تحقق من صيانة دورات السير اليومية وتعديل حصص التواجد حسب العيادات المستهدفة.' 
                : 'Structure and maintain target clinics across business morning/evening sessions.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSavePlanLayout}
            className="px-4 py-2 bg-slate-850 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {t.savePlan}
          </button>
          <button
            type="button"
            onClick={() => handleExportPlanDocument('html')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-500/10 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {t.exportPlan}
          </button>
          <button
            type="button"
            onClick={() => handleExportPlanDocument('print')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {lang === 'ar' ? 'طباعة وحفظ PDF ملون' : 'Print / Save PDF'}
          </button>
        </div>
      </div>

      {/* Metadata Configuration */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-950 text-xs flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          {t.metaTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">{t.compName}</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none font-medium"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600">{t.repNameName}</label>
            <input
              type="text"
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg px-3 py-2 text-xs outline-none font-medium"
              value={repName}
              onChange={(e) => setRepName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">من تاريخ</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 text-center rounded-lg px-2.5 py-2 text-[10px] outline-none font-mono"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">إلى تاريخ</label>
              <input
                type="date"
                className="w-full bg-slate-50 border border-slate-200 text-center rounded-lg px-2.5 py-2 text-[10px] outline-none font-mono"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Grid System */}
      <div className="bg-white border border-slate-100/90 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right md:text-right">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <th className="px-6 py-5 text-xs font-bold text-slate-500 w-44 text-center border-l border-slate-100/80 bg-slate-50/50">
                  <div className="flex items-center justify-center gap-1.5 font-bold">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <span>{t.dayCol}</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500 border-l border-slate-100/60">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                    <span className="text-slate-800 font-extrabold text-sm">{lang === 'ar' ? 'الفترة الصباحية' : 'Morning Period'}</span>
                  </div>
                </th>
                <th className="px-6 py-5 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-2">
                    <Moon className="w-5 h-5 text-indigo-500" />
                    <span className="text-slate-800 font-extrabold text-sm">{lang === 'ar' ? 'الفترة المسائية' : 'Evening Period'}</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p, idxDay) => (
                <tr key={p.day} className="hover:bg-slate-50/30 transition-colors">
                  {/* Day cell with clean numbers */}
                  <td className="px-6 py-6 font-bold text-slate-950 text-xs text-center bg-slate-50/25 border-l border-slate-100/80 min-w-[140px]">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <span className="bg-white px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm text-slate-800 font-bold text-sm tracking-tight w-28 block text-center">
                        {lang === 'ar' ? DAYS_OF_WEEK.daysAr[p.day as keyof typeof DAYS_OF_WEEK.daysAr] : p.day}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 font-mono tracking-wider">
                        <span>{p.day.substring(0, 3).toUpperCase()}</span>
                        <span>•</span>
                        <span>{lang === 'ar' ? `اليوم ${idxDay + 1}` : `Day ${idxDay + 1}`}</span>
                      </div>
                    </div>
                  </td>

                  {/* Morning Shift input & list */}
                  <td className="px-6 py-6 vertical-align-top space-y-4 border-l border-slate-100/60">
                    {/* Inline add workspace */}
                    <div className="flex gap-2 max-w-md items-center">
                      <input
                        type="text"
                        placeholder={t.addPlaceholder}
                        className="flex-1 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs outline-none font-medium text-slate-800 transition-all shadow-inner"
                        value={inputMap[`${p.day}-morning`] || ''}
                        onChange={(e) => setInputMap({ ...inputMap, [`${p.day}-morning`]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddWorkplace(p.day, 'morning')}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddWorkplace(p.day, 'morning')}
                        className="p-2 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl border border-indigo-100 transition-all cursor-pointer flex items-center justify-center shadow-sm font-bold"
                        title={t.addBtn}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Workplaces display list */}
                    <div className="space-y-1.5">
                      {p.morning.workplaces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-5 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/30 text-center select-none text-slate-400/80 max-w-md">
                          <Sparkles className="w-4 h-4 text-slate-300 mb-1" />
                          <span className="text-[10px] font-semibold leading-normal">{t.emptyShift}</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-w-md">
                          {p.morning.workplaces.map((work, idx) => (
                            <div 
                              key={idx} 
                              className="group/pill inline-flex items-center gap-1.5 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-white hover:to-white border border-slate-250 hover:border-indigo-400 hover:shadow-sm transition-all duration-200 px-3 py-1.5 rounded-xl select-none"
                            >
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-slate-800 text-xs font-bold">{work}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkplace(p.day, 'morning', idx)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-0.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center font-bold text-sm w-4 h-4 ml-0.5"
                                title={lang === 'ar' ? 'حذف من خط السير' : 'Remove workplace'}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Evening Shift input & list */}
                  <td className="px-6 py-6 vertical-align-top space-y-4">
                    <div className="flex gap-2 max-w-md items-center">
                      <input
                        type="text"
                        placeholder={t.addPlaceholder}
                        className="flex-1 bg-slate-50/50 hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs outline-none font-medium text-slate-800 transition-all shadow-inner"
                        value={inputMap[`${p.day}-evening`] || ''}
                        onChange={(e) => setInputMap({ ...inputMap, [`${p.day}-evening`]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddWorkplace(p.day, 'evening')}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddWorkplace(p.day, 'evening')}
                        className="p-2 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-xl border border-indigo-100 transition-all cursor-pointer flex items-center justify-center shadow-sm font-bold"
                        title={t.addBtn}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {p.evening.workplaces.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-5 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/30 text-center select-none text-slate-400/80 max-w-md">
                          <Sparkles className="w-4 h-4 text-slate-300 mb-1" />
                          <span className="text-[10px] font-semibold leading-normal">{t.emptyShift}</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2 max-w-md">
                          {p.evening.workplaces.map((work, idx) => (
                            <div 
                              key={idx} 
                              className="group/pill inline-flex items-center gap-1.5 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-white hover:to-white border border-slate-250 hover:border-indigo-400 hover:shadow-sm transition-all duration-200 px-3 py-1.5 rounded-xl select-none"
                            >
                              <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="text-slate-800 text-xs font-bold">{work}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkplace(p.day, 'evening', idx)}
                                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-0.5 rounded-lg transition-all cursor-pointer inline-flex items-center justify-center font-bold text-sm w-4 h-4 ml-0.5"
                                title={lang === 'ar' ? 'حذف من خط السير' : 'Remove workplace'}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
