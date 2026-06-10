/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, saveVirtualFile, updateDoctor, addClient, updateClient, getClients } from '../utils/db';
import { Doctor, Client, ClientCategory } from '../types';
import { FileText, Search, TrendingUp, Sparkles, Download, Printer, Calendar, Loader, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';

interface ReportsViewProps {
  lang: 'ar' | 'en';
}

export default function ReportsView({ lang }: ReportsViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [reportType, setReportType] = useState<'sample' | 'doctor' | 'visitslog' | 'doctorsList' | 'clientsList'>('sample');

  // Input Filters
  const [dateFrom, setDateFrom] = useState('2026-05-01');
  const [dateTo, setDateTo] = useState('2026-06-30');
  const [selectedSample, setSelectedSample] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [doctorInputFocused, setDoctorInputFocused] = useState(false);
  const [doctorListClassFilter, setDoctorListClassFilter] = useState('');
  const [doctorListSpecFilter, setDoctorListSpecFilter] = useState('');
  const [doctorListNameFilter, setDoctorListNameFilter] = useState('');

  // AI Analysis states
  const [aiAnalysisText, setAiAnalysisText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Edit doctor modal
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [editDocFields, setEditDocFields] = useState<Partial<Doctor>>({});

  // Client modal
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editClientFields, setEditClientFields] = useState<Partial<Client>>({});
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);

  useEffect(() => {
    setDb(getInitialState());
    setClientsData(getClients());
    
    // Auto-populate default filters which are guaranteed to have data
    const activeSamples = getUniqueSamples();
    if (activeSamples.length > 0) setSelectedSample(activeSamples[0]);

    const activeDocs = getInitialState().doctors;
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
      doctorsListType: 'قائمة الأطباء',
      clientsListType: 'قائمة العملاء (المستشفيات، العيادات، الصيدليات)',
      addNewClient: 'إضافة عميل جديد',
      clientTypeLabel: 'نوع العميل',
      clientName: 'اسم العميل',
      clientAddress: 'عنوان العميل',
      gpsCoordinates: 'إحداثيات الـ GPS الجغرافية',
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
      doctorsListType: 'Doctors List Report',
      clientsListType: 'Clients List (Hospitals, Clinics, Pharmacies)',
      addNewClient: 'Add New Client',
      clientTypeLabel: 'Client Type',
      clientName: 'Client Name',
      clientAddress: 'Client Address',
      gpsCoordinates: 'Geographical GPS Coordinates',
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

  // 3. Visits Log data calculations
  const filteredVisitsLog = db.visits.filter((v) => {
    if (reportSearchQuery.trim()) {
      const q = reportSearchQuery.toLowerCase().trim();
      const matchName = 
        (v.doctorName || '').toLowerCase().includes(q) || 
        (v.workplaceName || '').toLowerCase().includes(q) ||
        (v.doctorSpeciality || '').toLowerCase().includes(q);
      if (!matchName) return false;
    }
    if (dateFrom && new Date(v.visitDate) < new Date(dateFrom)) return false;
    if (dateTo && new Date(v.visitDate) > new Date(dateTo)) return false;
    return true;
  });

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
    const mockToday = new Date().getTime();
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

  // HTML, PDF, and Print/Save PDF multi-format exporter
  const exportGeneratedReport = (format: 'html' | 'pdf' | 'print') => {
    let exportHtml = '';
    let docTitle = '';
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
      docTitle = `report_sample_${selectedSample.replace(/\s+/g, '_')}`;
      exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>تقرير تفريغ عينة - ${selectedSample}</title>
  <style>
    body { font-family: 'Arial', sans-serif; padding: 25px; color: #1e293b; background: #fff; }
    h1 { color: #1e3a8a; margin-top: 0; padding-bottom: 10px; font-size: 20px; border-bottom: 2px solid #3b82f6; }
    .stat-badge { background: #eff6ff; border: 1px solid #bfdbfe; padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 12px; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #3b82f6; color: white; padding: 10px; font-size: 12px; text-align: ${lang === 'ar' ? 'right' : 'left'}; }
    td { padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) { background: #f8fafc; }
  </style>
</head>
<body>
  ${logoImgTag}
  <h1>${lang === 'ar' ? `تقرير تفريغ صنف [ ${selectedSample} ]` : `Sample Ledger [ ${selectedSample} ]`}</h1>
  <div class="stat-badge">
    <strong>${lang === 'ar' ? 'الصنف الترويجي:' : 'Sample Item:'}</strong> ${selectedSample}<br/>
    <strong>${lang === 'ar' ? 'الفترة الزمنية للتقرير:' : 'Time Interval:'}</strong> ${lang === 'ar' ? 'من' : 'From'} ${dateFrom} ${lang === 'ar' ? 'إلى' : 'To'} ${dateTo}
  </div>
  <table>
    <thead>
      <tr>
        <th>${lang === 'ar' ? 'تاريخ الزيارة' : 'Visit Date'}</th>
        <th>${lang === 'ar' ? 'اسم الطبيب' : 'Doctor Name'}</th>
        <th>${lang === 'ar' ? 'عدد العينات المصروفة' : 'Qty Distributed'}</th>
        <th>${lang === 'ar' ? 'مكان العمل والعيادة' : 'Workplace'}</th>
        <th>${lang === 'ar' ? 'ملاحظات' : 'Notes'}</th>
      </tr>
    </thead>
    <tbody>
      ${filteredVisitsForSample.length > 0 ? filteredVisitsForSample.map(v => {
        const sInfo = v.samples.find(s => s.sampleName === selectedSample);
        return `
          <tr>
            <td>${v.visitDate}</td>
            <td>${v.doctorName || (lang === 'ar' ? 'عميل خارجي' : 'External client')}</td>
            <td style="font-weight: bold; color: #16a34a;">${sInfo?.quantityDistributed || 0} ${lang === 'ar' ? 'وحدة' : 'Units'}</td>
            <td>${v.workplaceName}</td>
            <td>${v.notes || '-'}</td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="5" style="text-align: center; color: #94a3b8;">${lang === 'ar' ? 'لا توجد بيانات متاحة لهذا الصنف' : 'No entries available.'}</td></tr>`}
    </tbody>
  </table>
</body>
</html>
      `;
    } else if (reportType === 'doctor') {
      docTitle = `report_doctor_${selectedDoctor.replace(/\s+/g, '_')}`;
      exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>تقرير الطبيب التفصيلي - ${selectedDoctor}</title>
  <style>
    body { font-family: 'Arial', sans-serif; padding: 25px; color: #1e293b; background: #fff; }
    h1 { color: #5b21b6; margin-top: 0; padding-bottom: 10px; font-size: 20px; border-bottom: 2px solid #8b5cf6; }
    .stat-box { background: #faf5ff; border: 1px solid #e9d5ff; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 12px; color: #5b21b6; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #8b5cf6; color: white; padding: 10px; font-size: 12px; text-align: ${lang === 'ar' ? 'right' : 'left'}; }
    td { padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) { background: #fdfeff; }
  </style>
</head>
<body>
  ${logoImgTag}
  <h1>${lang === 'ar' ? `خط السير التفصيلي والمؤشر الميداني للطبيب: ${selectedDoctor}` : `Detailed SFA Report for Doctor: ${selectedDoctor}`}</h1>
  <div class="stat-box">
    <strong>${lang === 'ar' ? 'إجمالي المتابعات الميدانية:' : 'Total Completed Field Visits:'}</strong> ${doctorVisits.length} ${lang === 'ar' ? 'زيارة ناجحة.' : 'visits.'}<br>
    <strong>${lang === 'ar' ? 'إجمالي الدفعات الترويجية والدوائية المصروفة للطبيب:' : 'Medicine Sample Packages Provided:'}</strong> ${Object.entries(docProductShares).map(([k,v]) => `${k} (${v} ${lang === 'ar' ? 'وحدات' : 'units'})`).join(' ، ') || (lang === 'ar' ? 'نظيفة تماماً' : 'None')}
  </div>
  <table>
    <thead>
      <tr>
        <th>${lang === 'ar' ? 'التاريخ الفعلي' : 'Date'}</th>
        <th>${lang === 'ar' ? 'العيادة والمنشأة الطبية المعينة' : 'Visited Workplace'}</th>
        <th>${lang === 'ar' ? 'ملاحظات والتزامات المتابعة' : 'Detailing and Scientific Notes'}</th>
      </tr>
    </thead>
    <tbody>
      ${doctorVisits.length > 0 ? doctorVisits.map(v => `
        <tr>
          <td>${v.visitDate}</td>
          <td>${v.workplaceName}</td>
          <td>${v.notes || '-'}</td>
        </tr>
      `).join('') : `<tr><td colspan="3" style="text-align: center; color: #94a3b8;">${lang === 'ar' ? 'لم يسجل زيارات في هذه الفترة' : 'No records.'}</td></tr>`}
    </tbody>
  </table>
</body>
</html>
      `;
    } else if (reportType === 'visitsLog') {
      docTitle = `report_visits_log_${dateFrom}_${dateTo}`;
      exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${lang === 'ar' ? 'سجل الزيارات الموثق' : 'Audited Visits Ledger'}</title>
  <style>
    body { font-family: 'Arial', sans-serif; padding: 25px; color: #1e293b; background: #fff; }
    h1 { color: #0f766e; margin-top: 0; padding-bottom: 10px; font-size: 20px; border-bottom: 2px solid #14b8a6; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #14b8a6; color: white; padding: 10px; font-size: 12px; text-align: ${lang === 'ar' ? 'right' : 'left'}; }
    td { padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) { background: #f0fdfa; }
  </style>
</head>
<body>
  ${logoImgTag}
  <h1>${lang === 'ar' ? 'سجل الزيارات الموثق' : 'Audited Visits Ledger'}</h1>
  <p style="font-size: 12px; color: #64748b;">${lang === 'ar' ? 'الفترة:' : 'Period:'} ${dateFrom} - ${dateTo}</p>
  <table>
    <thead>
      <tr>
        <th>${lang === 'ar' ? 'العميل' : 'Client'}</th>
        <th>${lang === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</th>
        <th>${lang === 'ar' ? 'مكان العمل' : 'Workplace'}</th>
        <th>${lang === 'ar' ? 'العينات المصروفة' : 'Samples'}</th>
      </tr>
    </thead>
    <tbody>
      ${filteredVisitsLog.map(v => `
        <tr>
          <td><strong>${v.doctorName || 'External'}</strong><br><span style="color:#64748b; font-size:10px;">${v.clientType}</span></td>
          <td>${v.visitDate} ${v.checkInTime ? ' ' + v.checkInTime.substring(11, 16) : ''}</td>
          <td>${v.workplaceName}</td>
          <td>
             ${v.samples.length > 0 ? v.samples.map(s => `${s.sampleName} (${s.quantityDistributed})`).join('<br>') : '-'}
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
      `;
    } else if (reportType === 'doctorsList' as any) {
      docTitle = `report_doctors_list`;
      const docsToPrint = db.doctors
        .filter((d) => !doctorListClassFilter || d.classRating === doctorListClassFilter)
        .filter((d) => !doctorListSpecFilter || d.speciality?.toLowerCase().includes(doctorListSpecFilter.toLowerCase()))
        .filter((d) => {
          if (!doctorListNameFilter) return true;
          const q = doctorListNameFilter.toLowerCase();
          return (d.name.toLowerCase().includes(q));
        });
      exportHtml = `
<!DOCTYPE html>
<html dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}">
<head>
  <meta charset="UTF-8">
  <title>${lang === 'ar' ? 'قائمة الأطباء' : 'Doctors List'}</title>
  <style>
    body { font-family: 'Arial', sans-serif; padding: 25px; color: #1e293b; background: #fff; }
    h1 { color: #be185d; margin-top: 0; padding-bottom: 10px; font-size: 20px; border-bottom: 2px solid #f43f5e; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th { background: #f43f5e; color: white; padding: 10px; font-size: 12px; text-align: ${lang === 'ar' ? 'right' : 'left'}; }
    td { padding: 10px; border: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) { background: #fff1f2; }
  </style>
</head>
<body>
  ${logoImgTag}
  <h1>${lang === 'ar' ? 'قائمة الأطباء المعتمدة' : 'Approved Doctors List'}</h1>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${lang === 'ar' ? 'الاسم' : 'Name'}</th>
        <th>${lang === 'ar' ? 'التخصص' : 'Specialization'}</th>
        <th>Class</th>
        <th>${lang === 'ar' ? 'مكان العمل 1' : 'Workplace 1'}</th>
        <th>${lang === 'ar' ? 'مكان العمل 2' : 'Workplace 2'}</th>
      </tr>
    </thead>
    <tbody>
      ${docsToPrint.map((d, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${d.name}</strong></td>
          <td>${d.speciality}</td>
          <td>${d.classRating}</td>
          <td>${d.workplace1 || '-'}</td>
          <td>${d.workplace2 || '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>
      `;
    }

    if (format === 'html') {
      saveVirtualFile({
        name: `${docTitle}.html`,
        size: `${(exportHtml.length / 1024).toFixed(1)} KB`,
        dateModified: new Date().toISOString().replace('T', ' ').substring(0, 16),
        folder: 'DOWNLOAD',
        content: exportHtml,
        type: 'html',
      });
      alert(t.exportSuccess);
    } else if (format === 'print') {
      // High-Fidelity Printable popup which lets user Save directly to PDF with colors and fonts
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${docTitle}</title>
              <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
              <style>
                body { margin: 0; padding: 25px; font-family: 'Cairo', sans-serif; background-color: #ffffff; }
                @media print {
                  body { padding: 0; }
                  .no-print-btn { display: none !important; }
                }
              </style>
            </head>
            <body>
              <div style="max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;" class="no-print-btn">
                  <button onclick="window.print();" style="background: #2563eb; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-family: 'Cairo', sans-serif; font-size: 13px;">
                    ${lang === 'ar' ? '🖨️ ابدأ الطباعة الملونة / حفظ كـ PDF فوري' : '🖨️ Direct Print / Save to PDF'}
                  </button>
                  <span style="font-size: 11px; color: #94a3b8; font-family: monospace;">Med Rep Diagnostic Engine</span>
                </div>
                ${exportHtml}
              </div>
              <script>
                window.onload = function() {
                  setTimeout(function() { window.print(); }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else if (format === 'pdf') {
      // Real binary pdf using downloaded jsPDF bundle library
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Page styling borders
      pdf.setDrawColor(200, 220, 255);
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(6, 6, 198, 285, 3, 3, 'FD');
      
      // Header Text Draw
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(14);
      pdf.text(reportType === 'sample' ? 'SFA PRODUCT LEDGER COMPILATION' : 'COMPREHENSIVE TARGET PHYSICIAN LOG', 15, 20);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(9);
      pdf.text(`Generated Date: ${new Date().toISOString().replace('T', ' ').substring(0, 16)}`, 15, 26);
      pdf.text(`Interval constraint: ${dateFrom} - ${dateTo}`, 15, 31);

      // Report Specific lines drawing
      pdf.setDrawColor(226, 232, 240);
      pdf.line(15, 35, 195, 35);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(79, 70, 229);
      pdf.setFontSize(11);
      if (reportType === 'sample') {
        pdf.text(`Medicine Target Class: ${selectedSample}`, 15, 42);
        
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text('Date', 15, 52);
        pdf.text('Attending SFA Physician', 40, 52);
        pdf.text('Assigned Target Workplace', 105, 52);
        pdf.text('Distributed Qty', 170, 52);
        pdf.line(15, 55, 195, 55);

        let rowY = 62;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);
        
        filteredVisitsForSample.forEach((v) => {
          if (rowY > 270) {
            pdf.addPage();
            // redraw page styling border on next page
            pdf.setDrawColor(200, 220, 255);
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(6, 6, 198, 285, 3, 3, 'FD');
            rowY = 20;
          }
          const sInfo = v.samples.find(s => s.sampleName === selectedSample);
          pdf.text(String(v.visitDate), 15, rowY);
          pdf.text(String(v.doctorName || 'External Doctor'), 40, rowY);
          pdf.text(String(v.workplaceName).substring(0, 32), 105, rowY);
          pdf.text(`${sInfo?.quantityDistributed || 0} Units`, 170, rowY);
          rowY += 9;
        });
      } else if (reportType === 'doctor') {
        pdf.text(`Physician Record Subject: ${selectedDoctor}`, 15, 42);
        
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text('Date', 15, 52);
        pdf.text('Visited Workplace Hub', 40, 52);
        pdf.text('Clinical and Representative Notes', 110, 52);
        pdf.line(15, 55, 195, 55);

        let rowY = 62;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);

        doctorVisits.forEach((v) => {
          if (rowY > 270) {
            pdf.addPage();
            pdf.setDrawColor(200, 220, 255);
            pdf.setFillColor(255, 255, 255);
            pdf.roundedRect(6, 6, 198, 285, 3, 3, 'FD');
            rowY = 20;
          }
          pdf.text(String(v.visitDate), 15, rowY);
          pdf.text(String(v.workplaceName).substring(0, 32), 40, rowY);
          pdf.text(String(v.notes || 'No notes').substring(0, 48), 110, rowY);
          rowY += 9;
        });
      } else if (reportType === 'doctorsList' as any) {
        pdf.text(`Targeted Doctors Master List`, 15, 42);
        
        pdf.setFontSize(9);
        pdf.setTextColor(15, 23, 42);
        pdf.text('Name', 15, 52);
        pdf.text('Spec.', 70, 52);
        pdf.text('Class', 100, 52);
        pdf.text('Workplace 1', 120, 52);
        pdf.text('Workplace 2', 160, 52);
        pdf.line(15, 55, 195, 55);

        let rowY = 62;
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(71, 85, 105);

        db.doctors
          .filter((d) => !doctorListClassFilter || d.classRating === doctorListClassFilter)
          .filter((d) => !doctorListSpecFilter || d.speciality?.toLowerCase().includes(doctorListSpecFilter.toLowerCase()))
          .filter((d) => {
            if (!doctorListNameFilter) return true;
            const q = doctorListNameFilter.toLowerCase();
            return (d.name.toLowerCase().includes(q));
          })
          .forEach((d) => {
            if (rowY > 270) {
              pdf.addPage();
              pdf.setDrawColor(200, 220, 255);
              pdf.setFillColor(255, 255, 255);
              pdf.roundedRect(6, 6, 198, 285, 3, 3, 'FD');
              rowY = 20;
            }
            pdf.text(String(d.name).substring(0, 25), 15, rowY);
            pdf.text(String(d.speciality).substring(0, 15), 70, rowY);
            pdf.text(String(d.classRating || 'C'), 100, rowY);
            pdf.text(String(d.workplace1 || 'N/A').substring(0, 20), 120, rowY);
            pdf.text(String(d.workplace2 || '------').substring(0, 20), 160, rowY);
            rowY += 9;
          });
      }

      pdf.save(`${docTitle}.pdf`);
    }
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportGeneratedReport('html')}
            className="px-3.5 py-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="حفظ بصيغة HTML في أرشيف المستندات"
          >
            <Download className="w-4 h-4" />
            {lang === 'ar' ? 'تصدير كمستند HTML' : 'Save to Archive HTML'}
          </button>
          
          <button
            type="button"
            onClick={() => exportGeneratedReport('pdf')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-indigo-600/10"
            title="تحميل ملف PDF فوري"
          >
            <FileText className="w-4 h-4" />
            {lang === 'ar' ? 'تحميل PDF رسمي' : 'Download PDF Binary'}
          </button>

          <button
            type="button"
            onClick={() => exportGeneratedReport('print')}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-emerald-600/10"
            title="طباعة التقرير بالكامل"
          >
            <Printer className="w-4 h-4" />
            {lang === 'ar' ? 'طباعة وحفظ PDF ملون' : 'Print / Save PDF Preview'}
          </button>
        </div>
      </div>

      {/* Tabs of Reports */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-full border border-slate-200">
        <button
          type="button"
          className={`flex-1 text-center py-3 text-xs md:text-sm font-bold rounded-lg transition-all cursor-pointer ${
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
          className={`flex-1 text-center py-3 text-xs md:text-sm font-bold rounded-lg transition-all cursor-pointer ${
            reportType === 'doctor' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => {
            setReportType('doctor');
            setAiAnalysisText(null);
          }}
        >
          {lang === 'ar' ? 'تقرير الطبيب' : 'Doctor Chrono'}
        </button>
        <button
          type="button"
          className={`flex-1 text-center py-3 text-xs md:text-sm font-bold rounded-lg transition-all cursor-pointer ${
            reportType === 'visitslog' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => {
            setReportType('visitslog');
            setAiAnalysisText(null);
          }}
        >
          {lang === 'ar' ? 'سجل الزيارات الموثق' : 'Audited Visits Ledger'}
        </button>
        <button
          type="button"
          className={`flex-1 text-center py-3 text-xs md:text-sm font-bold rounded-lg transition-all cursor-pointer ${
            reportType === 'doctorsList' as any ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => {
            setReportType('doctorsList' as any);
            setAiAnalysisText(null);
          }}
        >
          {t.doctorsListType}
        </button>
        <button
          type="button"
          className={`flex-1 text-center py-3 text-[10px] md:text-xs font-bold rounded-lg transition-all cursor-pointer ${
            reportType === 'clientsList' as any ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => {
            setReportType('clientsList' as any);
            setAiAnalysisText(null);
          }}
        >
          {t.clientsListType}
        </button>
      </div>

      {/* Filter panel */}
      <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block mb-1">{t.dateFromLabel}</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-mono font-medium focus:border-indigo-400 focus:bg-white transition-colors"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setAiAnalysisText(null);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 block mb-1">{t.dateToLabel}</label>
            <input
              type="date"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-mono font-medium focus:border-indigo-400 focus:bg-white transition-colors"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setAiAnalysisText(null);
              }}
            />
          </div>

          {reportType === 'sample' ? (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">{t.sampleLabel}</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-semibold text-slate-800 focus:border-indigo-400 focus:bg-white transition-colors min-h-[44px]"
                value={selectedSample}
                onChange={(e) => setSelectedSample(e.target.value)}
              >
                {getUniqueSamples().map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          ) : reportType === 'doctor' ? (
            <div className="space-y-1.5 md:col-span-2 relative">
              <label className="text-xs font-bold text-slate-600 block mb-1">{t.doctorLabel}</label>
              <input
                type="text"
                placeholder={lang === 'ar' ? 'ابحث باسم الطبيب (اكتب 3 أحرف)...' : 'Search doctor (min 3 chars)...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-semibold text-slate-800 focus:border-indigo-400 focus:bg-white transition-colors min-h-[44px]"
                value={selectedDoctor}
                onChange={(e) => {
                  setSelectedDoctor(e.target.value);
                  setAiAnalysisText(null);
                }}
                onFocus={() => setDoctorInputFocused(true)}
                onBlur={() => setTimeout(() => setDoctorInputFocused(false), 200)}
              />
              
              {doctorInputFocused && selectedDoctor.length >= 3 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                  {db.doctors
                    .filter(d => d.name.toLowerCase().includes(selectedDoctor.toLowerCase()))
                    .map(d => (
                      <div
                        key={d.id}
                        className="px-4 py-2 hover:bg-indigo-50 border-b border-slate-50 last:border-0 cursor-pointer text-sm font-semibold text-slate-800 transition-colors"
                        onClick={() => {
                          setSelectedDoctor(d.name);
                          setAiAnalysisText(null);
                        }}
                      >
                        {d.name} <span className="text-[10px] text-slate-400 block font-normal">{d.speciality} • {d.workplace}</span>
                      </div>
                    ))}
                  
                  {db.doctors.filter(d => d.name.toLowerCase().includes(selectedDoctor.toLowerCase())).length === 0 && (
                    <div className="px-4 py-3 text-xs text-slate-500 text-center">
                      {lang === 'ar' ? 'لا يوجد طبيب بهذا الاسم.' : 'No doctors found.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : reportType === 'doctorsList' ? (
            <>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {lang === 'ar' ? 'تصنيف الطبيب (Class)' : 'Doctor Class'}
                </label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-semibold text-slate-800 focus:border-indigo-400 focus:bg-white transition-colors"
                  value={doctorListClassFilter}
                  onChange={(e) => setDoctorListClassFilter(e.target.value)}
                >
                  <option value="">{lang === 'ar' ? 'الكل' : 'All Classes'}</option>
                  <option value="A">Class A</option>
                  <option value="B">Class B</option>
                  <option value="C">Class C</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {lang === 'ar' ? 'التخصص' : 'Specialization'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'تصفية بالتخصص...' : 'Filter by specialty...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-medium text-slate-800 focus:border-indigo-400 focus:bg-white transition-colors"
                  value={doctorListSpecFilter}
                  onChange={(e) => setDoctorListSpecFilter(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  {lang === 'ar' ? 'اسم الطبيب' : 'Doctor Name'}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'ابحث عن اسم الطبيب...' : 'Search doctor name...'}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-medium text-slate-800 focus:border-indigo-400 focus:bg-white transition-colors"
                  value={doctorListNameFilter}
                  onChange={(e) => setDoctorListNameFilter(e.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-slate-600 block mb-1">
                {lang === 'ar' ? 'البحث باسم الطبيب أو المستشفى' : 'Search Physician or Workplace'}
              </label>
              <input
                type="text"
                placeholder={lang === 'ar' ? 'بحث...' : 'Search...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-3 text-base outline-none font-medium text-slate-800 focus:border-indigo-400 focus:bg-white transition-colors min-h-[44px]"
                value={reportSearchQuery}
                onChange={(e) => setReportSearchQuery(e.target.value)}
              />
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
        ) : reportType === 'doctor' ? (
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
        ) : reportType === 'visitslog' ? (
          <motion.div
            key="visitslog-report"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === 'ar' ? 'سجل الزيارات الموثق والرقابي للـ FIFO والـ SFA' : 'Audited Visits Ledger (With FIFO Rollback)'}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {lang === 'ar' 
                  ? 'عرض وقراءة سجل الزيارات الميدانية. للحذف والتعديل المرجو استخدام أدوات النظام.' 
                  : 'View historical field logs and assigned FIFO stocks.'}
              </p>
            </div>

            {/* Ledger Table Container */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
              <table className="w-full text-right border-collapse text-[11px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3 text-right">{lang === 'ar' ? 'بيانات الزيارة والعميل' : 'Physician & Client Profile'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'التاريخ والوقت' : 'Field Schedule'}</th>
                    <th className="p-3 text-right">{lang === 'ar' ? 'العينات والكميات المصروفة (FIFO)' : 'Dispensed Samples'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredVisitsLog.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 max-w-[200px]">
                          <div className="font-bold text-slate-900 text-xs text-right">
                            {v.clientType === 'Doctor' ? v.doctorName : v.workplaceName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {v.clientType === 'Doctor' 
                              ? `${v.workplaceName} • Class ${v.doctorClass || 'B'}` 
                              : (lang === 'ar' ? 'عميل صيدلية طبيعية' : 'Clinical Pharmacy Customer')}
                          </div>
                          {v.notes && (
                            <div className="text-[9px] text-slate-500 bg-slate-50/90 py-1 px-2 rounded mt-1 italic border-r border-purple-300 max-w-xs truncate">
                              "{v.notes}"
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <div className="font-mono text-slate-600 font-bold text-xs">{v.visitDate}</div>
                        </td>

                        <td className="p-3">
                          {v.samples && v.samples.length > 0 ? (
                            <div className="flex flex-col gap-2 max-w-[200px]">
                              {v.samples.map((s, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 bg-purple-50/70 border border-purple-100/30 px-3 py-1.5 rounded-lg text-xs">
                                  <span className="font-medium text-slate-700 truncate font-sans">{s.sampleName}</span>
                                  <span className="bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.5 rounded font-mono text-sm leading-none">
                                    {s.quantityDistributed}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">{lang === 'ar' ? 'بدون عينات صرف' : 'Zero distribution'}</span>
                          )}
                        </td>
                      </tr>
                  ))}

                  {filteredVisitsLog.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-12 text-center text-slate-400 font-medium bg-slate-50/30">
                        {lang === 'ar' ? 'لا توجد أي سجلات زيارات مطابقة للتصفية حالياً.' : 'No matching visit logs found.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : reportType === 'doctorsList' ? (
          <motion.div 
            key="doctorslist-report"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4"
          >
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'ar' ? 'قائمة الأطباء المستهدفين' : 'Targeted Doctors List'}
                </h4>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
              <table className="w-full text-right border-collapse text-[11px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3">#</th>
                    <th className="p-3 text-right">{lang === 'ar' ? 'اسم الطبيب' : 'Doctor Name'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'التخصص' : 'Specialization'}</th>
                    <th className="p-3 text-center">Class</th>
                    <th className="p-3 text-right">{lang === 'ar' ? 'مكان العمل الأول' : 'Workplace 1'}</th>
                    <th className="p-3 text-right">{lang === 'ar' ? 'مكان العمل الثاني' : 'Workplace 2'}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {db.doctors
                    .filter((d) => !doctorListClassFilter || d.classRating === doctorListClassFilter)
                    .filter((d) => !doctorListSpecFilter || d.speciality?.toLowerCase().includes(doctorListSpecFilter.toLowerCase()))
                    .filter((d) => {
                      if (!doctorListNameFilter) return true;
                      const q = doctorListNameFilter.toLowerCase();
                      return (d.name.toLowerCase().includes(q));
                    })
                    .map((d, index) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 w-8 text-slate-400 font-mono text-center">{index + 1}</td>
                        <td className="p-3 font-bold text-slate-900 text-xs">{d.name}</td>
                        <td className="p-3 text-center text-slate-600">{d.speciality}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono ${
                            d.classRating === 'A' ? 'bg-indigo-100 text-indigo-700' :
                            d.classRating === 'B' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {d.classRating || 'C'}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 font-medium">{d.workplace1 || 'غير محدد'}</td>
                        <td className="p-3 text-slate-700 font-medium">{d.workplace2 || '------'}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => {
                              setEditingDoctor(d);
                              setEditDocFields({
                                name: d.name,
                                speciality: d.speciality,
                                classRating: d.classRating,
                                workplace1: d.workplace1,
                                workplace2: d.workplace2,
                                locationLatitude: d.locationLatitude,
                                locationLongitude: d.locationLongitude
                              });
                            }}
                            className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-[10px] font-bold"
                          >
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                  ))}
                  {db.doctors.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        {lang === 'ar' ? 'لا توجد بيانات للأطباء' : 'No doctors found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : reportType === 'clientsList' as any ? (
          <motion.div 
            key="clientslist-report"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm p-6 space-y-4"
          >
            <div className="flex justify-between items-center bg-slate-50 border border-slate-100 p-4 rounded-xl">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {t.clientsListType}
                </h4>
              </div>
              <button
                onClick={() => {
                  setEditingClient(null);
                  setEditClientFields({});
                  setIsClientModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {t.addNewClient}
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
              <table className="w-full text-right border-collapse text-[11px] leading-tight">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                    <th className="p-3">#</th>
                    <th className="p-3 text-right">{t.clientName}</th>
                    <th className="p-3 text-center">{t.clientTypeLabel}</th>
                    <th className="p-3 text-right">{t.clientAddress}</th>
                    <th className="p-3 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {clientsData.map((client, index) => (
                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 w-8 text-slate-400 font-mono text-center">{index + 1}</td>
                      <td className="p-3 font-bold text-slate-900 text-xs">{client.name}</td>
                      <td className="p-3 text-center text-slate-600 font-medium">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">{client.type}</span>
                      </td>
                      <td className="p-3 text-slate-700">{client.address || '------'}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setEditingClient(client);
                            setEditClientFields({
                              name: client.name,
                              category: client.type,
                              address: client.address,
                              latitude: client.locationLatitude,
                              longitude: client.locationLongitude
                            });
                            setIsClientModalOpen(true);
                          }}
                          className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-[10px] font-bold"
                        >
                          {lang === 'ar' ? 'تعديل' : 'Edit'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {clientsData.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        {lang === 'ar' ? 'لا توجد بيانات للعملاء' : 'No clients found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Edit Doctor Modal ... */}
      <AnimatePresence>
        {editingDoctor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-xl space-y-4"
            >
              <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
                {lang === 'ar' ? 'تعديل بيانات الطبيب' : 'Edit Doctor Details'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">{lang === 'ar' ? 'اسم الطبيب' : 'Doctor Name'}</label>
                  <input
                    type="text"
                    value={editDocFields.name || ''}
                    onChange={(e) => setEditDocFields({...editDocFields, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">{lang === 'ar' ? 'التخصص' : 'Specialization'}</label>
                  <input
                    type="text"
                    value={editDocFields.speciality || ''}
                    onChange={(e) => setEditDocFields({...editDocFields, speciality: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">{lang === 'ar' ? 'الكلاس' : 'Class Rating'}</label>
                  <select
                    value={editDocFields.classRating || 'C'}
                    onChange={(e) => setEditDocFields({...editDocFields, classRating: e.target.value as 'A'|'B'|'C'})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="A">Class A</option>
                    <option value="B">Class B</option>
                    <option value="C">Class C</option>
                  </select>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-600">
                      {lang === 'ar' ? 'بيانات الـ GPS للموقع المستهدف' : 'Target GPS Location'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setEditDocFields({
                                ...editDocFields,
                                locationLatitude: pos.coords.latitude,
                                locationLongitude: pos.coords.longitude
                              });
                            },
                            (err) => {
                              alert(lang === 'ar' ? 'تعذر جلب الموقع. يرجى تفعيل الـ GPS.' : 'Cannot detech location. Enable GPS.');
                            },
                            { enableHighAccuracy: true }
                          );
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {lang === 'ar' ? 'تحديث الموقع الجغرافي الآن' : 'Update Physical Geo-Location'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Latitude (خط العرض)</label>
                      <input
                        type="number"
                        step="any"
                        value={editDocFields.locationLatitude || ''}
                        readOnly
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Longitude (خط الطول)</label>
                      <input
                        type="number"
                        step="any"
                        value={editDocFields.locationLongitude || ''}
                        readOnly
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDoctor(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingDoctor && editDocFields.name?.trim()) {
                      updateDoctor(editingDoctor.id, editDocFields);
                      setDb(getInitialState());
                      setEditingDoctor(null);
                      alert(lang === 'ar' ? 'تم حفظ التعديلات بنجاح وتم تحديث السجلات المتعلقة.' : 'Changes saved successfully and related logs updated.');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit/Add Client Modal */}
      <AnimatePresence>
        {isClientModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-xl space-y-4"
            >
              <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-2">
                {editingClient ? (lang === 'ar' ? 'تعديل بيانات العميل' : 'Edit Client Details') : t.addNewClient}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">{t.clientTypeLabel}</label>
                  <select
                    value={editClientFields.category || 'مستشفى'}
                    onChange={(e) => setEditClientFields({...editClientFields, category: e.target.value as ClientCategory})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="مستشفى">مستشفى</option>
                    <option value="مركز طبي">مركز طبي</option>
                    <option value="عيادة خاصة">عيادة خاصة</option>
                    <option value="صيدلية">صيدلية</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">{t.clientName}</label>
                  <input
                    type="text"
                    value={editClientFields.name || ''}
                    onChange={(e) => setEditClientFields({...editClientFields, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">{t.clientAddress}</label>
                  <input
                    type="text"
                    value={editClientFields.address || ''}
                    onChange={(e) => setEditClientFields({...editClientFields, address: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-slate-600">
                      {t.gpsCoordinates}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setEditClientFields({
                                ...editClientFields,
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude
                              });
                            },
                            (err) => {
                              alert(lang === 'ar' ? 'تعذر جلب الموقع. يرجى تفعيل الـ GPS.' : 'Cannot detech location. Enable GPS.');
                            },
                            { enableHighAccuracy: true }
                          );
                        }
                      }}
                      className="text-[10px] font-bold px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {lang === 'ar' ? 'تحديث الموقع الجغرافي' : 'Update Geo-Location'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-1/2">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Latitude (خط العرض)</label>
                      <input
                        type="number"
                        step="any"
                        value={editClientFields.latitude || ''}
                        readOnly
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="text-[10px] text-slate-500 block mb-0.5">Longitude (خط الطول)</label>
                      <input
                        type="number"
                        step="any"
                        value={editClientFields.longitude || ''}
                        readOnly
                        className="w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editClientFields.name?.trim()) {
                      if (editingClient) {
                        updateClient(editingClient.id, {
                          name: editClientFields.name,
                          type: editClientFields.category || 'مستشفى',
                          address: editClientFields.address || '',
                          locationLatitude: editClientFields.latitude || undefined,
                          locationLongitude: editClientFields.longitude || undefined
                        });
                      } else {
                        addClient({
                          name: editClientFields.name,
                          type: editClientFields.category || 'مستشفى',
                          address: editClientFields.address || '',
                          locationLatitude: editClientFields.latitude || undefined,
                          locationLongitude: editClientFields.longitude || undefined
                        });
                      }
                      setDb(getInitialState());
                      setClientsData(getClients());
                      setIsClientModalOpen(false);
                      setEditingClient(null);
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  {lang === 'ar' ? 'حفظ' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
