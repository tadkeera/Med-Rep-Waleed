import React, { useState, useEffect } from 'react';
import { 
  getInitialState, 
  deleteVisitLog, 
  updateFullVisitLog, 
  getSampleStockBalanceForDate, 
  searchAutocomplete, 
  standardizeSampleName 
} from '../utils/db';
import { VisitLog, VisitSample } from '../types';
import { 
  Calendar, 
  MapPin, 
  Trash, 
  Edit3, 
  Search, 
  Plus, 
  AlertCircle, 
  Database, 
  Clock, 
  ArrowLeftRight 
} from 'lucide-react';
import VisitsLogMap from './VisitsLogMap';

interface VisitsLogViewProps {
  lang: 'ar' | 'en';
}

export default function VisitsLogView({ lang }: VisitsLogViewProps) {
  // Sync states
  const [db, setDb] = useState(getInitialState());
  const [reportSearchDoctor, setReportSearchDoctor] = useState('');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  // Mobile layout switch state
  const [visibleMobileTab, setVisibleMobileTab] = useState<'map' | 'ledger'>('ledger');

  // Deletion state
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);

  // Full Editor States
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const [fullEditVisitId, setFullEditVisitId] = useState<string | null>(null);
  const [fullEditWorkplace, setFullEditWorkplace] = useState('');
  const [fullEditWorkplace2, setFullEditWorkplace2] = useState('');
  const [showSecondWorkplaceInput, setShowSecondWorkplaceInput] = useState(false);
  const [fullEditDocClass, setFullEditDocClass] = useState<'A' | 'B' | 'C'>('C');
  const [fullEditNotes, setFullEditNotes] = useState('');
  const [fullEditSamples, setFullEditSamples] = useState<{ sampleName: string; quantityDistributed: number }[]>([]);
  const [fullEditError, setFullEditError] = useState<string | null>(null);
  const [fullEditNewSampleName, setFullEditNewSampleName] = useState('');
  const [fullEditNewSampleQty, setFullEditNewSampleQty] = useState('1');
  const [fullEditSearchFocused, setFullEditSearchFocused] = useState(false);
  const [fullEditAutocompleteResults, setFullEditAutocompleteResults] = useState<string[]>([]);

  const reloadDb = () => {
    setDb(getInitialState());
  };

  useEffect(() => {
    reloadDb();
  }, []);

  // Filtered visits based on global search & date range
  const filteredVisits = db.visits.filter((v) => {
    if (reportSearchDoctor.trim()) {
      const q = reportSearchDoctor.toLowerCase().trim();
      const matchName = 
        (v.doctorName || '').toLowerCase().includes(q) || 
        (v.workplaceName || '').toLowerCase().includes(q) ||
        (v.doctorSpeciality || '').toLowerCase().includes(q);
      if (!matchName) return false;
    }
    if (reportDateFrom && new Date(v.visitDate) < new Date(reportDateFrom)) return false;
    if (reportDateTo && new Date(v.visitDate) > new Date(reportDateTo)) return false;
    return true;
  });

  // Log Deletion cascading
  const handleDeleteVisit = (id: string) => {
    setDeletingVisitId(id);
  };

  const executeDeleteVisit = () => {
    if (!deletingVisitId) return;
    deleteVisitLog(deletingVisitId);
    reloadDb();
    setDeletingVisitId(null);
  };

  // Full visit transactional editor mechanics
  const handleOpenFullEditModal = (v: VisitLog) => {
    setFullEditVisitId(v.id);
    
    // Split combined workplace names if they exist (e.g. from previous edit)
    const wpParts = (v.workplaceName || '').split(' و ');
    setFullEditWorkplace(wpParts[0] || '');
    setFullEditWorkplace2(wpParts[1] || '');
    setShowSecondWorkplaceInput(!!wpParts[1]);

    setFullEditDocClass(v.doctorClass || 'C');
    setFullEditNotes(v.notes || '');
    setFullEditSamples(v.samples.map(s => ({
      sampleName: s.sampleName,
      quantityDistributed: s.quantityDistributed
    })));
    setFullEditError(null);
    setFullEditNewSampleName('');
    setFullEditNewSampleQty('1');
    setFullEditSearchFocused(false);
    setFullEditAutocompleteResults([]);
    setIsFullEditModalOpen(true);
  };

  const handleFullEditAddSample = () => {
    if (!fullEditNewSampleName.trim()) {
      setFullEditError(lang === 'ar' ? 'يرجى إدخال اسم عينة دواء صحيحة' : 'Please specify a proper medicine name');
      return;
    }
    const qtyNum = Number(fullEditNewSampleQty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setFullEditError(lang === 'ar' ? 'الكمية يجب أن تكون رقماً أكبر من الصفر' : 'Quantity must be greater than zero');
      return;
    }

    const nameNormalized = fullEditNewSampleName.trim();
    const existingIdx = fullEditSamples.findIndex(s => s.sampleName.toLowerCase() === nameNormalized.toLowerCase());
    
    if (existingIdx !== -1) {
      setFullEditSamples(prev => prev.map((s, idx) => idx === existingIdx 
        ? { ...s, quantityDistributed: s.quantityDistributed + qtyNum } 
        : s
      ));
    } else {
      setFullEditSamples(prev => [...prev, { sampleName: nameNormalized, quantityDistributed: qtyNum }]);
    }

    setFullEditNewSampleName('');
    setFullEditNewSampleQty('1');
    setFullEditError(null);
  };

  const handleFullEditRemoveSample = (sampleName: string) => {
    setFullEditSamples(prev => prev.filter(s => s.sampleName.toLowerCase() !== sampleName.toLowerCase()));
  };

  const handleFullEditQtyChange = (sampleName: string, newQty: number) => {
    setFullEditSamples(prev => prev.map(s => s.sampleName.toLowerCase() === sampleName.toLowerCase() 
      ? { ...s, quantityDistributed: Math.max(0, newQty) } 
      : s
    ));
  };

  const handleSaveFullEdit = () => {
    if (!fullEditVisitId) return;
    try {
      // Validate sample inputs
      const validated = fullEditSamples.map(s => {
        const q = Number(s.quantityDistributed);
        if (isNaN(q) || q < 0) {
          throw new Error(lang === 'ar' ? `العدد المدخل للصنف "${s.sampleName}" غير صحيح.` : `Invalid amount for "${s.sampleName}"`);
        }
        return {
          sampleName: standardizeSampleName(s.sampleName),
          quantityDistributed: q
        };
      }).filter(s => s.quantityDistributed > 0);

      // Perform transaction
      updateFullVisitLog(fullEditVisitId, {
        workplaceName: fullEditWorkplace,
        workplace2Name: showSecondWorkplaceInput ? fullEditWorkplace2 : undefined,
        doctorClass: fullEditDocClass,
        notes: fullEditNotes,
        samples: validated
      });

      setIsFullEditModalOpen(false);
      setFullEditVisitId(null);
      setFullEditError(null);
      reloadDb();
    } catch (err: any) {
      setFullEditError(err?.message || (lang === 'ar' ? 'تعذر حفظ ومطابقة المخزون المتاح.' : 'Could not validate inventory stock levels.'));
    }
  };

  return (
    <div className="space-y-6">
      {/* View Title */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shadow-xs">
          <Database className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {lang === 'ar' ? 'سجل الزيارات والتبع الميداني التفاعلي' : 'Field Visits Ledger & GPS Tracker'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'ar' 
              ? 'تتبع احداثيات المندوبين ومطابقتهم الميدانية ومطابقة الرصيد الدوائي الحقيقي بنظام FIFO.' 
              : 'Audit active field coordinates compliance, synchronize distributed samples, and adjust inventory FIFO ledger.'}
          </p>
        </div>
      </div>

      {/* Interactive Filters Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-150 shadow-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {lang === 'ar' ? 'البحث باسم الطبيب أو العميل أو التخصص' : 'Search Physician / Customer'}
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={lang === 'ar' ? 'مثال: الدكتور طارق، عيون...' : 'e.g. Dr. Tariq, Pediatrics...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs outline-none focus:border-purple-500 focus:bg-white font-medium text-right"
              value={reportSearchDoctor}
              onChange={(e) => setReportSearchDoctor(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1 text-right">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {lang === 'ar' ? 'تاريخ البداية (من)' : 'Date From'}
          </label>
          <input
            type="date"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-purple-500 focus:bg-white font-mono text-center"
            value={reportDateFrom}
            onChange={(e) => setReportDateFrom(e.target.value)}
          />
        </div>

        <div className="space-y-1 text-right">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {lang === 'ar' ? 'تاريخ النهاية (إلى)' : 'Date To'}
          </label>
          <input
            type="date"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs outline-none focus:border-purple-500 focus:bg-white font-mono text-center"
            value={reportDateTo}
            onChange={(e) => setReportDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* MOBILE TABS SWITCHER */}
      <div className="lg:hidden flex bg-slate-200/50 p-1 rounded-xl w-full border border-slate-200/60 mb-2 gap-1">
        <button
          type="button"
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            visibleMobileTab === 'ledger' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50/50'
          }`}
          onClick={() => setVisibleMobileTab('ledger')}
        >
          <Database className="w-4 h-4" />
          {lang === 'ar' ? 'جدول سجل الزيارات' : 'Visits Ledger'}
        </button>
        <button
          type="button"
          className={`flex-1 text-center py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            visibleMobileTab === 'map' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50/50'
          }`}
          onClick={() => setVisibleMobileTab('map')}
        >
          <MapPin className="w-4 h-4" />
          {lang === 'ar' ? 'خريطة التتبع الميداني' : 'Interactive GPS Map'}
        </button>
      </div>

      {/* DUAL-SECTION INTERFACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* PANEL 1: INTERACTIVE GPS FIELD MAP */}
        <div className={`lg:col-span-5 border border-slate-200/60 rounded-2xl bg-white p-4 shadow-sm flex flex-col space-y-3 ${
          visibleMobileTab === 'map' ? 'block' : 'hidden lg:flex'
        }`}>
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-purple-600 animate-bounce" />
              {lang === 'ar' ? 'خريطة التتبع الميداني والـ GPS التفاعلية' : 'Active GPS Tracking Map'}
            </h4>
            <p className="text-[10px] text-slate-400 mt-1">
              {lang === 'ar'
                ? 'تعرض النقاط الجغرافية للزيارات والخصومات الدوائية الحقيقية للمندوب.'
                : 'Real-time markers showing logged physician compliance points and FIFO allocations.'}
            </p>
          </div>

          <div className="flex-1 min-h-[350px]">
            <VisitsLogMap visits={filteredVisits} lang={lang} />
          </div>
        </div>

        {/* PANEL 2: VISITS HISTORY LEDGER SPREADSHEET */}
        <div className={`lg:col-span-7 border border-slate-200/60 rounded-2xl bg-white p-5 shadow-sm flex flex-col space-y-4 ${
          visibleMobileTab === 'ledger' ? 'block' : 'hidden lg:flex'
        }`}>
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {lang === 'ar' ? 'جدول سجلات الزيارات المركزي' : 'Physician Visit Achievements Ledger'}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {lang === 'ar' 
                  ? 'انقر على اسم الطبيب لعرض وتعديل توزيعات FIFO وإلغاء المعاملات.' 
                  : 'Click on physician profile to trigger atomic inventory adjustments or delete logs.'}
              </p>
            </div>
          </div>

          {/* Ledger Table Container */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl bg-slate-50/50">
            <table className="w-full text-right border-collapse text-[11px] leading-tight">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                  <th className="p-3 text-right">{lang === 'ar' ? 'بيانات الزيارة والعميل' : 'Physician & Client Profile'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'التاريخ والوقت' : 'Field Schedule'}</th>
                  <th className="p-3 text-right">{lang === 'ar' ? 'العينات والكميات المصروفة (FIFO)' : 'Dispensed Samples'}</th>
                  <th className="p-3 text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredVisits.map((v) => {
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Physician Account Column */}
                      <td className="p-3 max-w-[200px]">
                        <button
                          type="button"
                          onClick={() => handleOpenFullEditModal(v)}
                          className="font-bold text-slate-900 hover:text-purple-700 text-xs text-right cursor-pointer block underline decoration-dotted decoration-purple-400"
                        >
                          {v.clientType === 'Doctor' ? v.doctorName : v.workplaceName}
                        </button>
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

                      {/* Visit Date Field Column */}
                      <td className="p-3 text-center">
                        <div className="font-mono text-slate-600 font-bold">{v.visitDate}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5 flex items-center justify-center gap-1 font-mono">
                          <Clock className="w-2.5 h-2.5 text-slate-300" />
                          <span>
                            {v.checkInTime ? new Date(v.checkInTime).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '---'}
                          </span>
                        </div>
                      </td>

                      {/* FIFO Distributed inventory Column */}
                      <td className="p-3">
                        {v.samples && v.samples.length > 0 ? (
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            {v.samples.map((s, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-2 bg-purple-50/70 border border-purple-100/30 px-2 py-0.5 rounded-lg text-[10px]">
                                <span className="font-medium text-slate-700 truncate font-sans">{s.sampleName}</span>
                                <span className="bg-purple-100 text-purple-800 font-extrabold px-1.5 py-0.2 rounded font-mono">
                                  {s.quantityDistributed}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[10px]">{lang === 'ar' ? 'بدون عينات صرف' : 'Zero distribution'}</span>
                        )}
                      </td>

                      {/* Deletion actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenFullEditModal(v)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'ar' ? 'تعديل وتحديث FIFO' : 'Edit Visit & FIFO'}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVisit(v.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title={lang === 'ar' ? 'حذف الزيارة وإرجاع العينات' : 'Delete Visit & Return Stock'}
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredVisits.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400 font-medium bg-slate-50/30">
                      {lang === 'ar' ? 'لا توجد أي سجلات زيارات مطابقة للتصفية حالياً.' : 'No matching visit logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MINI POPUP */}
      {deletingVisitId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 text-right space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-red-100 text-red-600 rounded-xl mb-1 shrink-0">
                <Trash className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 text-sm">
                  {lang === 'ar' ? 'هل أنت متأكد من حذف الزيارة؟' : 'Delete Field Visit Log?'}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'ar' 
                    ? 'سيؤدي حذف هذه الزيارة إلى إرجاع جميع المواد المصروفة للدفعات الأصلية فوراً وإعادة حساب ميزان المخزون FIFO.' 
                    : 'Deleting this visit will instantly return all deducted samples back to their original batch locations & balance the FIFO ledger.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setDeletingVisitId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'تراجع وإلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeDeleteVisit}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'حذف اللوك بالكامل' : 'Delete Log'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTIONAL ATOMIC FIFO POPUP MODAL EDITOR */}
      {isFullEditModalOpen && fullEditVisitId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 shrink-0 animate-pulse text-purple-200" />
                <div>
                  <h4 className="font-bold text-sm tracking-tight text-right">
                    {lang === 'ar' ? 'التعديل المعياري والتسوية الفورية FIFO' : 'Atomic FIFO Ledger Editor'}
                  </h4>
                  <p className="text-[10px] text-purple-200 font-medium text-right">
                    {lang === 'ar' ? 'مزامنة دقيقة مع مروحة جلب المستودع والمخازن التراكمية' : 'Chromatically adjusts ledger batches on cancellation or update'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setIsFullEditModalOpen(false);
                  setFullEditVisitId(null);
                }}
                className="text-white hover:text-purple-200 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-right flex-1">
              
              {/* Workplace Name */}
              <div className="space-y-1 text-right relative">
                <div className="flex justify-between items-center mb-1">
                  {!showSecondWorkplaceInput && (
                    <button
                      type="button"
                      onClick={() => setShowSecondWorkplaceInput(true)}
                      className="text-[10px] flex items-center justify-center gap-1 font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-full transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      {lang === 'ar' ? 'إضافة مكان آخر' : 'Add Workplace'}
                    </button>
                  )}
                  <label className="text-xs font-bold text-slate-700 ml-auto">
                    {lang === 'ar' ? 'مكان العمل (العيادة/المستشفى)' : 'Workplace Name'}
                  </label>
                </div>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs outline-none text-right placeholder-slate-400 font-medium"
                  value={fullEditWorkplace}
                  placeholder={lang === 'ar' ? 'ابحث أو ادخل اسم العيادة...' : 'Search or enter workplace...'}
                  onChange={(e) => {
                    setFullEditWorkplace(e.target.value);
                    const q = e.target.value;
                    const items = searchAutocomplete('workplace', q);
                    setFullEditAutocompleteResults(items);
                    setFullEditSearchFocused(true);
                  }}
                  onFocus={() => {
                    const items = searchAutocomplete('workplace', fullEditWorkplace);
                    setFullEditAutocompleteResults(items);
                    setFullEditSearchFocused(true);
                  }}
                />
                {fullEditSearchFocused && fullEditAutocompleteResults.length > 0 && (
                  <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-32 overflow-y-auto divide-y divide-slate-50">
                    {fullEditAutocompleteResults.map((wp) => (
                      <button
                        key={wp}
                        type="button"
                        onClick={() => {
                          setFullEditWorkplace(wp);
                          setFullEditSearchFocused(false);
                        }}
                        className="w-full text-right px-3.5 py-2 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                      >
                        {wp}
                      </button>
                    ))}
                  </div>
                )}
                
                {showSecondWorkplaceInput && (
                  <div className="mt-3 relative">
                    <div className="flex justify-between items-center mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSecondWorkplaceInput(false);
                          setFullEditWorkplace2('');
                        }}
                        className="text-[10px] flex items-center justify-center gap-1 font-bold text-red-500 hover:text-red-700 transition-colors"
                      >
                        {lang === 'ar' ? 'إزالة' : 'Remove'}
                      </button>
                      <label className="text-[10px] font-bold text-slate-500 ml-auto">
                        {lang === 'ar' ? 'مكان العمل الثاني (اختياري)' : 'Second Workplace (Optional)'}
                      </label>
                    </div>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-xs outline-none text-right placeholder-slate-400 font-medium"
                      value={fullEditWorkplace2}
                      placeholder={lang === 'ar' ? 'ابحث أو ادخل اسم العيادة...' : 'Search or enter workplace...'}
                      onChange={(e) => {
                        setFullEditWorkplace2(e.target.value);
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Class rating */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'كلاس الطبيب (Doctor Class Rating)' : 'Doctor Class Rating'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['A', 'B', 'C'] as const).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFullEditDocClass(rating)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        fullEditDocClass === rating
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Class {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* Samples editing list */}
              <div className="space-y-2 text-right">
                <label className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1 block">
                  {lang === 'ar' ? 'العينات والكميات الموزعة في هذه الزيارة:' : 'Distributed Samples for this visit:'}
                </label>

                {fullEditSamples.length === 0 ? (
                  <div className="text-slate-400 text-xs italic py-2">
                    {lang === 'ar' ? 'لا توجد عينات مسجلة حالياً لهذه الزيارة' : 'No samples added yet'}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                    {fullEditSamples.map((s, idx) => {
                      const lookupVisit = db.visits.find(v => v.id === fullEditVisitId);
                      const visitDateStr = lookupVisit ? lookupVisit.visitDate : '';
                      const avail = getSampleStockBalanceForDate(s.sampleName, visitDateStr);
                      return (
                        <div key={idx} className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-[120px]">
                            <div className="font-semibold text-xs text-slate-800 font-sans">{s.sampleName}</div>
                            <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                              {lang === 'ar' ? `المخزن المتوفر بالتاريخ: ` : `Available dated stock: `}
                              <strong className="font-mono text-xs">{avail}</strong>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              className="w-16 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-center font-mono outline-none focus:border-purple-500"
                              value={s.quantityDistributed}
                              onChange={(e) => handleFullEditQtyChange(s.sampleName, Number(e.target.value))}
                            />
                            
                            <button
                              type="button"
                              onClick={() => handleFullEditRemoveSample(s.sampleName)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title={lang === 'ar' ? 'حذف العينة' : 'Delete sample'}
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add New Sample Sub-Row */}
              <div className="bg-purple-50/40 p-3.5 rounded-xl border border-purple-100/40 space-y-2">
                <div className="text-[10px] font-bold text-purple-950">
                  {lang === 'ar' ? 'صرف دواء إضافي في هذه الزيارة' : 'Dispense and Add New Sample Item'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 relative">
                  <div className="sm:col-span-2 relative">
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-purple-500 text-right"
                      placeholder={lang === 'ar' ? 'ابحث عن صنف الدواء...' : 'Search medicine...'}
                      value={fullEditNewSampleName}
                      onChange={(e) => {
                        setFullEditNewSampleName(e.target.value);
                      }}
                    />
                    {fullEditNewSampleName.trim() !== '' && (
                      <div className="absolute z-50 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-24 overflow-y-auto divide-y divide-slate-50">
                        {searchAutocomplete('sample', fullEditNewSampleName).map((alt) => (
                          <button
                            key={alt}
                            type="button"
                            onClick={() => {
                              setFullEditNewSampleName(alt);
                            }}
                            className="w-full text-right px-3 py-1.5 text-[10px] hover:bg-slate-50 text-slate-700 transition-colors block"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center font-mono outline-none"
                      value={fullEditNewSampleQty}
                      onChange={(e) => setFullEditNewSampleQty(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleFullEditAddSample}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-0.5 cursor-pointer py-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Detail notes */}
              <div className="space-y-1 text-right">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'ملاحظات وتفاصيل إضافية عن الزيارة' : 'Visit Notes & Details'}
                </label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs outline-none text-right h-16 placeholder-slate-400 resize-none font-medium"
                  value={fullEditNotes}
                  placeholder={lang === 'ar' ? 'اكتب ملاحظات اللقاء هنا...' : 'Enter meeting notes...'}
                  onChange={(e) => setFullEditNotes(e.target.value)}
                />
              </div>

              {/* Operational Errors */}
              {fullEditError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl flex items-start gap-2 text-right">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{fullEditError}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsFullEditModalOpen(false);
                  setFullEditVisitId(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'تراجع وإلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveFullEdit}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'حفظ التعديلات ومزامنة FIFO' : 'Save & Sync FIFO'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
