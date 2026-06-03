/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, saveState, saveVirtualFile } from '../utils/db';
import { WeeklyCycle, DailyCyclePlan } from '../types';
import { Calendar, Building, Plus, Trash, Check, Download, FileText, ArrowLeftRight } from 'lucide-react';

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
  const handleExportPlanDocument = () => {
    // Generate styled HTML structure for offline share
    const exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>خطة السير الأسبوعية المعتمدة - ${repName}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #1e293b; background: #f8fafc; }
    .header { text-align: center; margin-bottom: 25px; border-bottom: 3px double #e2e8f0; padding-bottom: 15px; }
    .header h1 { margin: 0; color: #0f172a; font-size: 24px; }
    .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
    .metadata-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .metadata-table td { padding: 12px; border: 1px solid #e2e8f0; font-size: 13px; }
    .metadata-table td.label { font-weight: bold; background: #f1f5f9; width: 25%; }
    .plan-grid { width: 100%; border-collapse: collapse; background: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .plan-grid th { padding: 14px; background: #1e293b; color: #ffffff; text-align: right; border: 1px solid #334155; font-size: 14px; }
    .plan-grid td { padding: 14px; border: 1px solid #e2e8f0; vertical-align: top; font-size: 13px; }
    .plan-grid td.day { font-weight: bold; background: #f8fafc; text-align: center; width: 120px; }
    .workplace-pill { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; display: inline-block; margin: 3px; font-size: 12px; }
    .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="header">
    <h1>خطة السير الأسبوعية المعتمدة (SFA Cycle Plan)</h1>
    <p>تم استخراج المستند آلياً من نظام Med Rep لمندوبي الدعاية الميدانية</p>
  </div>

  <table class="metadata-table">
    <tr>
      <td class="label">اسم المندوب:</td>
      <td>${repName}</td>
      <td class="label">تاريخ خط السير:</td>
      <td>من ${dateFrom} إلى ${dateTo}</td>
    </tr>
    <tr>
      <td class="label">الشركة الراعية:</td>
      <td colspan="3">${companyName}</td>
    </tr>
  </table>

  <table class="plan-grid">
    <thead>
      <tr>
        <th>اليوم الميداني</th>
        <th>النوبة الصباحية (Morning Shift)</th>
        <th>النوبة المسائية (Evening Shift)</th>
      </tr>
    </thead>
    <tbody>
      ${plans.map(p => `
        <tr>
          <td class="day">${DAYS_OF_WEEK.daysAr[p.day as keyof typeof DAYS_OF_WEEK.daysAr] || p.day}</td>
          <td>
            ${p.morning.workplaces.length === 0 ? '<i>نوبة خفيفة / مكتبية</i>' : p.morning.workplaces.map(w => `<span class="workplace-pill">${w}</span>`).join('')}
          </td>
          <td>
            ${p.evening.workplaces.length === 0 ? '<i>نوبة خفيفة / مكتبية</i>' : p.evening.workplaces.map(w => `<span class="workplace-pill">${w}</span>`).join('')}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    Med Rep SFA Engine Pro Version 1.0 (Offline-First CRM Systems)
  </div>
</body>
</html>
`;

    // Save as dynamic virtual file
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
            onClick={handleExportPlanDocument}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-indigo-500/10 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {t.exportPlan}
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
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-right md:text-right">
            <thead>
              <tr className="bg-slate-900 text-white border-b border-slate-800">
                <th className="px-5 py-4 text-xs font-bold text-slate-200 w-32 border-l border-slate-800 text-center">{t.dayCol}</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-200">{t.morningShift}</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-200">{t.eveningShift}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map((p) => (
                <tr key={p.day} className="hover:bg-slate-50/40 transition-colors">
                  {/* Day cell */}
                  <td className="px-5 py-5 font-bold text-slate-950 text-xs text-center bg-slate-50/50 border-l border-slate-100 divide-y-5 flex flex-col justify-center items-center gap-1.5 min-h-[140px]">
                    <span className="text-slate-800 text-sm">
                      {lang === 'ar' ? DAYS_OF_WEEK.daysAr[p.day as keyof typeof DAYS_OF_WEEK.daysAr] : p.day}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono tracking-wide">{p.day.substring(0, 3).toUpperCase()}</span>
                  </td>

                  {/* Morning Shift input & list */}
                  <td className="px-5 py-5 vertical-align-top space-y-4">
                    {/* Inline add workspace */}
                    <div className="flex gap-1.5 max-w-sm">
                      <input
                        type="text"
                        placeholder={t.addPlaceholder}
                        className="flex-1 bg-slate-50 focus:bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs outline-none font-medium text-slate-800"
                        value={inputMap[`${p.day}-morning`] || ''}
                        onChange={(e) => setInputMap({ ...inputMap, [`${p.day}-morning`]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddWorkplace(p.day, 'morning')}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddWorkplace(p.day, 'morning')}
                        className="px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Workplaces display list */}
                    <div className="space-y-1.5">
                      {p.morning.workplaces.length === 0 ? (
                        <div className="text-[10px] text-slate-400 italic font-medium">{t.emptyShift}</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {p.morning.workplaces.map((work, idx) => (
                            <div key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <span>{work}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkplace(p.day, 'morning', idx)}
                                className="text-slate-400 hover:text-red-500 rounded-sm cursor-pointer"
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
                  <td className="px-5 py-5 vertical-align-top space-y-4">
                    <div className="flex gap-1.5 max-w-sm">
                      <input
                        type="text"
                        placeholder={t.addPlaceholder}
                        className="flex-1 bg-slate-50 focus:bg-white border border-slate-250 focus:border-indigo-500 rounded-lg px-2.5 py-1.5 text-xs outline-none font-medium text-slate-800"
                        value={inputMap[`${p.day}-evening`] || ''}
                        onChange={(e) => setInputMap({ ...inputMap, [`${p.day}-evening`]: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddWorkplace(p.day, 'evening')}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddWorkplace(p.day, 'evening')}
                        className="px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {p.evening.workplaces.length === 0 ? (
                        <div className="text-[10px] text-slate-400 italic font-medium">{t.emptyShift}</div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {p.evening.workplaces.map((work, idx) => (
                            <div key={idx} className="bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                              <span>{work}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveWorkplace(p.day, 'evening', idx)}
                                className="text-slate-400 hover:text-red-500 rounded-sm cursor-pointer"
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
