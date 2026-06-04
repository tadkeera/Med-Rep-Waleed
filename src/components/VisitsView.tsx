/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  getInitialState, 
  addVisitLog, 
  deleteVisitLog, 
  getDoctorLastVisitInfo, 
  searchAutocomplete, 
  registerNewEntity,
  getSampleStockBalance,
  getSampleStockBalanceForDate,
  calculateDistance,
  updateVisitSampleStrictFIFO,
  migrateDoctorsFromLegacyJson,
  migrateHistoricalVisitsAndDeductStock,
  updateFullVisitLog,
  recomputeAllFifoDeductions,
  standardizeSampleName,
  wipeAllMigratedVisitsAndRestoreStock,
  wipeAllDataComplete
} from '../utils/db';
import { VisitLog, VisitSample, Doctor, Workplace } from '../types';
import { Calendar, Users, MapPin, Package, AlertCircle, Plus, Trash, Check, Compass, Sparkles, Navigation, Edit3, Search, Database, Upload, ArrowLeftRight, Trash2, ArrowUpDown, Lock, Unlock, FileText, CheckCircle2, Loader2 } from 'lucide-react';

interface VisitsViewProps {
  lang: 'ar' | 'en';
}

export default function VisitsView({ lang }: VisitsViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [activeTab, setActiveTab] = useState<'Doctor' | 'Customer'>('Doctor');

  // Form Fields
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [workplaceName, setWorkplaceName] = useState('');
  const [notes, setNotes] = useState('');
  
  // Geolocation states
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [gpsFallbackUsed, setGpsFallbackUsed] = useState(false);

  // Repeatable samples array
  const [samples, setSamples] = useState<{ sampleName: string; qty: number }[]>([
    { sampleName: '', qty: 1 }
  ]);

  // Contextual info regarding selected doctor
  const [lastVisitInfo, setLastVisitInfo] = useState<{ lastDate: string; samples: { name: string; qty: number }[] } | null>(null);

  // Interceptor Modals Support
  const [showDocModal, setShowDocModal] = useState(false);
  const [newDocCandidate, setNewDocCandidate] = useState('');
  const [newDocSpeciality, setNewDocSpeciality] = useState('');
  const [newDocClass, setNewDocClass] = useState<'A' | 'B' | 'C'>('B');

  const [showWorkplaceModal, setShowWorkplaceModal] = useState(false);
  const [newWorkplaceCandidate, setNewWorkplaceCandidate] = useState('');

  // Auto-complete dropdown index maps
  const [focusedField, setFocusedField] = useState<'doctor' | 'workplace' | { type: 'sample'; idx: number } | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);

  // Timing markers for Speed Call guardrail detection (Check-in and Check-out timestamps)
  const [checkInTime, setCheckInTime] = useState<string>(new Date().toISOString());

  // Strict date boundary FIFO violations modal message
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  // New features multi-tab configuration
  const [mainTab, setMainTab] = useState<'log' | 'report' | 'migration'>('log');

  // Visits Spreadsheet Report Filters
  const [reportSearchDoctor, setReportSearchDoctor] = useState('');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  // Live FIFO Quantity Editor States
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editingSampleName, setEditingSampleName] = useState<string | null>(null);
  const [editingCurrentQty, setEditingCurrentQty] = useState(0);
  const [editingNewQtyValue, setEditingNewQtyValue] = useState('');
  const [editingVisitDate, setEditingVisitDate] = useState('');
  const [editErrorMsg, setEditErrorMsg] = useState<string | null>(null);

  // Full Visit Popup Modal Editor States
  const [isFullEditModalOpen, setIsFullEditModalOpen] = useState(false);
  const [fullEditVisitId, setFullEditVisitId] = useState<string | null>(null);
  const [fullEditWorkplace, setFullEditWorkplace] = useState('');
  const [fullEditDocClass, setFullEditDocClass] = useState<'A' | 'B' | 'C'>('C');
  const [fullEditNotes, setFullEditNotes] = useState('');
  const [fullEditSamples, setFullEditSamples] = useState<{ sampleName: string; quantityDistributed: number }[]>([]);
  const [fullEditError, setFullEditError] = useState<string | null>(null);
  const [fullEditNewSampleName, setFullEditNewSampleName] = useState('');
  const [fullEditNewSampleQty, setFullEditNewSampleQty] = useState('1');
  const [fullEditSearchFocused, setFullEditSearchFocused] = useState(false);
  const [fullEditAutocompleteResults, setFullEditAutocompleteResults] = useState<string[]>([]);

  // Retroactive FIFO recalculation states
  const [recalcSummary, setRecalcSummary] = useState<{
    processedVisitsCount: number;
    totalDeductionsCount: number;
    insufficientStockAlarms: string[];
  } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Legacy Migration Processor States
  const [legacyJsonInput, setLegacyJsonInput] = useState('');
  const [legacyHtmlInput, setLegacyHtmlInput] = useState('');
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationErrors, setMigrationErrors] = useState<string[]>([]);
  const [migrationSuccessCount, setMigrationSuccessCount] = useState<number | null>(null);

  // File Picker Simulation Nodes and Filenames
  const doctorsFileRef = useRef<HTMLInputElement>(null);
  const janFileRef = useRef<HTMLInputElement>(null);
  const febFileRef = useRef<HTMLInputElement>(null);
  const marFileRef = useRef<HTMLInputElement>(null);
  const aprFileRef = useRef<HTMLInputElement>(null);

  const [doctorsFileName, setDoctorsFileName] = useState(lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen');
  const [janFileName, setJanFileName] = useState(lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen');
  const [febFileName, setFebFileName] = useState(lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen');
  const [marFileName, setMarFileName] = useState(lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen');
  const [aprFileName, setAprFileName] = useState(lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen');
  const [isProcessingState, setIsProcessingState] = useState(false);

  const reloadDb = () => {
    setDb(getInitialState());
  };

  useEffect(() => {
    reloadDb();
    triggerGpsAcquisition();
    // Start check-in timestamp
    setCheckInTime(new Date().toISOString());
  }, []);

  // Update contextual card on doctor selection
  useEffect(() => {
    if (doctorName.trim()) {
      const info = getDoctorLastVisitInfo(doctorName.trim());
      setLastVisitInfo(info);
    } else {
      setLastVisitInfo(null);
    }
  }, [doctorName]);

  const t = {
    ar: {
      docTab: 'زيارة طبيب (Physician Visit)',
      custTab: 'زيارة صيدلية/عميل (Customer Visit)',
      formTitleDoc: 'تسجيل زيارة طبيب جديدة',
      formTitleCust: 'تسجيل زيارة عميل جديدة',
      vDate: 'تاريخ الزيارة الميدانية',
      docName: 'اسم الطبيب المعالج',
      custName: 'اسم الصيدلية / المستشفى العميل',
      workplace: 'مكان العمل الحالي الطبيب',
      notes: 'ملاحظات وتفاصيل الدعاية الطبية',
      geoStatus: 'إحداثيات التتبع الجغرافي للشبكة GPS',
      fetchingGps: 'جاري جلب إحداثيات GPS...',
      gpsOk: 'تم تحديد الإحداثيات بنجاح!',
      indoorHospitalRule: 'مفعل: النطاق الذكي للأجواء الداخلية (تم جلب الإحداثيات التقريبية للموقع لعدم التجميد)',
      samplesDistributed: 'العينات الموزعة في الزيارة',
      itemPicker: 'اسم عينة الصنف الدوائي',
      stockIndicator: 'المخزون المتوفر الفعلي:',
      qty: 'الكمية الدوائية المهدية (يسمح بـ 0)',
      addSample: 'إضافة عينة صنف آخر',
      saveVisit: 'حفظ ووثق الزيارة وتطبيق الـ FIFO',
      lastGivenCard: '💡 سجل المتابعة الذكي للطبيب والآخر عينة وزعت له',
      lastGivenDate: 'آخر زيارة تمت بتاريخ:',
      lastGivenSamples: 'الأصناف المصروفة له مسبقاً:',
      newDocTitle: 'طبيب جديد غير مسجل 🆕',
      newDocDesc: 'هل ترغب في تسجيل الطبيب "[NAME]" وتعيين اختصاصه وتصنيفه ضمن قائمة الأطباء المعتمدين؟',
      docSpeciality: 'تخصص الطبيب المعالج',
      docClass: 'الفئة المعيارية للطبيب (Class Rating)',
      newWorkTitle: 'مكان عمل جديد غير مدرج 🏥',
      newWorkDesc: 'المنشأة الطبية "[NAME]" غير مسجلة مسبقاً في الدليل الجغرافي للزيارات. هل تريد إضافتها كمركب جغرافي؟',
      saveEntity: 'نعم، قم بالحفظ والاعتماد',
      cancel: 'إلغاء التعديل',
      visitsHistory: 'سجل الزيارات الموثق والرقابي للـ FIFO والـ SFA',
      deleteBtn: 'حذف وإبطال الزيارة (Rollback FIFO)',
      noVisits: 'لا توجد زيارات مسجلة لهذا الأسبوع.',
      rollbackSuccess: 'تم حذف الزيارة بنجاح وإرجاع رصيد العينات بالتساوي للمستودع (FIFO Rollback)!',
    },
    en: {
      docTab: 'Doctor Visit Tab',
      custTab: 'Pharmacy / Customer Visit',
      formTitleDoc: 'Log New Doctor Visit',
      formTitleCust: 'Log New Customer Visit',
      vDate: 'Visit Log Date',
      docName: 'Doctor Name',
      custName: 'Pharmacy / Customer Name',
      workplace: 'Workplace Clinic / Hospital',
      notes: 'Notes & Detailing Comments',
      geoStatus: 'GPS Coordinates & Tracking',
      fetchingGps: 'Acquiring GPS position...',
      gpsOk: 'Coordinates obtained successfully.',
      indoorHospitalRule: 'Indoor Hospital Rule active: Utilized cached fallback coordinates.',
      samplesDistributed: 'Distributed Samples Section',
      itemPicker: 'Sample Medicine Picker',
      stockIndicator: 'Real-time Stock Available:',
      qty: 'Quantity (Allows 0)',
      addSample: 'Add Another Medication',
      saveVisit: 'Save Visit & Deduct FIFO Stock',
      lastGivenCard: '💡 Doctor Biography & Historical Left Samples',
      lastGivenDate: 'Last visit date:',
      lastGivenSamples: 'Previously distributed items:',
      newDocTitle: 'Unregistered Physician 🆕',
      newDocDesc: 'Physician "[NAME]" is new. Do you want to save them with specialty & class metrics?',
      docSpeciality: 'Medical Speciality',
      docClass: 'Class Rating',
      newWorkTitle: 'Unrecorded Workplace 🏥',
      newWorkDesc: 'Workplace "[NAME]" is new. Do you want to register it into the spatial indices?',
      saveEntity: 'Save and continue',
      cancel: 'Cancel',
      visitsHistory: 'Audited Visits Ledger (With FIFO Rollback)',
      deleteBtn: 'Delete & Rollback Stock',
      noVisits: 'No field visits recorded during this cycle.',
      rollbackSuccess: 'Visit deleted. Cascade Stock Rollback has successfully returned items to Invoices FIFO!',
    },
  }[lang];

  // Geolocation handling - Indoor Hospital Rule Fallback
  const triggerGpsAcquisition = () => {
    setIsFetchingGps(true);
    setGpsFallbackUsed(false);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setIsFetchingGps(false);
        },
        (error) => {
          console.warn('GPS Signal unavailable inside hospital building, applying fallback:', error);
          // Riyadh mock values fallback coordinates mimicking indoor rule
          setLatitude(24.7136 + (Math.random() - 0.5) * 0.005);
          setLongitude(46.6753 + (Math.random() - 0.5) * 0.005);
          setGpsFallbackUsed(true);
          setIsFetchingGps(false);
        },
        { timeout: 4000, enableHighAccuracy: false } // fast response, no freezing
      );
    } else {
      setLatitude(24.7136);
      setLongitude(46.6753);
      setGpsFallbackUsed(true);
      setIsFetchingGps(false);
    }
  };

  // Form Autocomplete Searches
  const handleInputChange = (field: 'doctor' | 'workplace', val: string) => {
    if (field === 'doctor') {
      setDoctorName(val);
      setFocusedField('doctor');
      setAutocompleteResults(searchAutocomplete('doctor', val));
    } else if (field === 'workplace') {
      setWorkplaceName(val);
      setFocusedField('workplace');
      setAutocompleteResults(searchAutocomplete('workplace', val));
    }
  };

  const handleSampleNameChange = (idx: number, val: string) => {
    const updated = [...samples];
    updated[idx].sampleName = val;
    setSamples(updated);

    setFocusedField({ type: 'sample', idx });
    setAutocompleteResults(searchAutocomplete('sample', val));
  };

  const handleSelectAutocomplete = (item: string) => {
    if (focusedField === 'doctor') {
      setDoctorName(item);
    } else if (focusedField === 'workplace') {
      setWorkplaceName(item);
    } else if (focusedField && typeof focusedField === 'object' && focusedField.type === 'sample') {
      const updated = [...samples];
      updated[focusedField.idx].sampleName = item;
      setSamples(updated);
    }

    setFocusedField(null);
    setAutocompleteResults([]);
  };

  const addAnotherSampleRow = () => {
    setSamples([...samples, { sampleName: '', qty: 1 }]);
  };

  const removeSampleRow = (idx: number) => {
    if (samples.length === 1) return;
    setSamples(samples.filter((_, i) => i !== idx));
  };

  const handleQtyChange = (idx: number, val: number) => {
    const updated = [...samples];
    updated[idx].qty = val;
    setSamples(updated);
  };

  // Main Form Submit trigger and Interceptors mapping
  const handleSubmitVisit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'Doctor') {
      if (!doctorName.trim() || !workplaceName.trim()) return;

      // 1. Check if Doctor exists in Database
      const doctorExists = db.doctors.some(d => d.name.trim().toLowerCase() === doctorName.trim().toLowerCase());
      if (!doctorExists) {
        setNewDocCandidate(doctorName.trim());
        setShowDocModal(true);
        return;
      }

      // 2. Check if Workplace exists in Database
      const workplaceExists = db.workplaces.some(w => w.name.trim().toLowerCase() === workplaceName.trim().toLowerCase());
      if (!workplaceExists) {
        setNewWorkplaceCandidate(workplaceName.trim());
        setShowWorkplaceModal(true);
        return;
      }
    } else {
      if (!workplaceName.trim()) return;
      
      const workplaceExists = db.workplaces.some(w => w.name.trim().toLowerCase() === workplaceName.trim().toLowerCase());
      if (!workplaceExists) {
        setNewWorkplaceCandidate(workplaceName.trim());
        setShowWorkplaceModal(true);
        return;
      }
    }

    commitVisitLog();
  };

  const commitVisitLog = () => {
    const matchedDoc = db.doctors.find(d => d.name.trim().toLowerCase() === doctorName.trim().toLowerCase());
    const matchedWork = db.workplaces.find(w => w.name.trim().toLowerCase() === workplaceName.trim().toLowerCase());

    // Standardize and Validate each sample item for date-bounded FIFO capacity
    for (const s of samples) {
      const rawName = s.sampleName.trim();
      if (!rawName) continue;
      const name = standardizeSampleName(rawName);

      // RULE: ZERO-DEDUCTION PASS-THROUGH bypasses validation
      if (s.qty === 0) continue;

      // RULE: Date-bounded stock validation
      const availableDateStock = getSampleStockBalanceForDate(name, visitDate);
      if (s.qty > availableDateStock) {
        const errMsg = lang === 'ar'
          ? `خطأ في الصرف! الكمية المدخلة (${s.qty}) للصنف [${name}] تتجاوز المخزون الفعلي المتوفر بحقيبتك حتى تاريخ اليوم لزيارة المريض (${availableDateStock} علبة). يرجى تعديل الكمية، أو مراجعة تواريخ الإدخال لمنع التلاعب الجاري.`
          : `Dispensing error! Entered quantity (${s.qty}) for [${name}] exceeds actual available stock in your bag up to the visit date (${availableDateStock} units). Please modify the quantity or review entry dates to prevent ongoing tampering.`;
        setErrorModalMsg(errMsg);
        return;
      }
    }

    const finalSamples = samples
      .filter(s => s.sampleName.trim())
      .map(s => ({
        sampleName: standardizeSampleName(s.sampleName.trim()),
        quantityDistributed: s.qty,
        deductions: [], // populated automatically inside DB utility deductFifoStock
      }));

    // Find if visit is within the Cycle Plan (otherwise count as unplanned for Route Deviation alarm)
    let isUnplanned = true;
    const currentDayEn = new Date(visitDate).toLocaleDateString('en-US', { weekday: 'long' });
    const cycle = db.weeklyCycles[0]; // Active plan cycle
    if (cycle) {
      const dayPlan = cycle.plans.find(p => p.day === currentDayEn);
      if (dayPlan) {
        const matchesWorkplace = dayPlan.morning.workplaces.includes(workplaceName) || dayPlan.evening.workplaces.includes(workplaceName);
        if (matchesWorkplace) {
          isUnplanned = false;
        }
      }
    }

    // Prepare visit coordinates
    const finalLat = latitude || matchedWork?.latitude || 24.7136;
    const finalLng = longitude || matchedWork?.longitude || 46.6753;

    addVisitLog({
      visitDate,
      clientType: activeTab,
      doctorName: activeTab === 'Doctor' ? doctorName.trim() : undefined,
      doctorSpeciality: activeTab === 'Doctor' ? (matchedDoc?.speciality || undefined) : undefined,
      doctorClass: activeTab === 'Doctor' ? (matchedDoc?.classRating || undefined) : undefined,
      workplaceName: workplaceName.trim(),
      latitude: finalLat,
      longitude: finalLng,
      workplaceLatitude: matchedWork?.latitude,
      workplaceLongitude: matchedWork?.longitude,
      // Record check-in / check-out
      checkInTime,
      checkOutTime: new Date().toISOString(),
      samples: finalSamples as any[],
      notes,
      isUnplanned,
    });

    // Reset Form
    setDoctorName('');
    setWorkplaceName('');
    setNotes('');
    setSamples([{ sampleName: '', qty: 1 }]);
    setCheckInTime(new Date().toISOString()); // refresh clock
    reloadDb();
    
    // Auto re-acquire location
    triggerGpsAcquisition();
  };

  // Modals Save confirmations
  const handleSaveDocFromConfirm = () => {
    const newDoc = registerNewEntity('doctor', newDocCandidate, {
      speciality: newDocSpeciality,
      classRating: newDocClass,
    });
    setShowDocModal(false);
    reloadDb();
    // Continue submitting sequence
    setDoctorName(newDoc.name);
  };

  const handleSaveWorkplaceFromConfirm = () => {
    const newWork = registerNewEntity('workplace', newWorkplaceCandidate, {
      latitude: latitude || 24.7136,
      longitude: longitude || 46.6753,
    });
    setShowWorkplaceModal(false);
    reloadDb();
    // Continue submit sequence
    setWorkplaceName(newWork.name);
  };

  // Perform cascade stock deletion
  const handleDeleteVisit = (id: string) => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المتابعة وإرجاع رصيد المخزون؟' : 'Are you sure you want to verify rollback?')) {
      deleteVisitLog(id);
      reloadDb();
      alert(t.rollbackSuccess);
    }
  };

  // Dynamic FIFO Quantity Editor handler
  const handleSaveQuantityEdit = () => {
    if (!editingVisitId || !editingSampleName) return;
    const newQty = Number(editingNewQtyValue);
    if (isNaN(newQty) || newQty < 0) {
      setEditErrorMsg(lang === 'ar' ? 'يرجى إدخال كمية صحيحة غير سالبة (0 أو أكثر)' : 'Please enter a valid non-negative quantity');
      return;
    }

    try {
      updateVisitSampleStrictFIFO(editingVisitId, editingSampleName, newQty, editingVisitDate || '');
      setEditingVisitId(null);
      setEditingSampleName(null);
      setEditErrorMsg(null);
      reloadDb();
      alert(lang === 'ar' ? 'تم تعديل كمية الصرف بنجاح وتحديث ميزان المخزون FIFO.' : 'Successfully adjusted distributed quantity and recalculated FIFO ledger.');
    } catch (err: any) {
      setEditErrorMsg(err?.message || (lang === 'ar' ? 'فشلت معالجة الخصم.' : 'Deduction processing failed.'));
    }
  };

  // Full-scale Dynamic Visit Log Editor handlers
  const handleOpenFullEditModal = (v: VisitLog) => {
    setFullEditVisitId(v.id);
    setFullEditWorkplace(v.workplaceName || '');
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
    if (isNaN(qtyNum) || qtyNum < 0) {
      setFullEditError(lang === 'ar' ? 'الكمية يجب أن تكون رقماً أكبر من أو يساوي الصفر' : 'Quantity must be positive or zero');
      return;
    }

    const nameNormalized = fullEditNewSampleName.trim();
    const existingIdx = fullEditSamples.findIndex(s => s.sampleName.toLowerCase() === nameNormalized.toLowerCase());
    
    if (existingIdx !== -1) {
      // update quantity of existing row
      setFullEditSamples(prev => prev.map((s, idx) => idx === existingIdx ? { ...s, quantityDistributed: s.quantityDistributed + qtyNum } : s));
    } else {
      // add new sample item row
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
    setFullEditSamples(prev => prev.map(s => s.sampleName.toLowerCase() === sampleName.toLowerCase() ? { ...s, quantityDistributed: Math.max(0, newQty) } : s));
  };

  const handleSaveFullEdit = () => {
    if (!fullEditVisitId) return;
    try {
      // Validate samples list
      const validated = fullEditSamples.map(s => {
        const q = Number(s.quantityDistributed);
        if (isNaN(q) || q < 0) {
          throw new Error(lang === 'ar' ? `العدد المدخل للصنف "${s.sampleName}" غير صحيح.` : `Invalid amount for "${s.sampleName}"`);
        }
        return {
          sampleName: standardizeSampleName(s.sampleName),
          quantityDistributed: q
        };
      });

      // Update in our smart strict FIFO engine
      updateFullVisitLog(fullEditVisitId, {
        workplaceName: fullEditWorkplace,
        doctorClass: fullEditDocClass,
        notes: fullEditNotes,
        samples: validated
      });

      setIsFullEditModalOpen(false);
      setFullEditVisitId(null);
      setFullEditError(null);
      reloadDb();
      alert(lang === 'ar' ? 'تم حفظ التعديلات في كل قواعد البيانات بنظام الـ FIFO والتراكم التنازلي للتخزين بنجاح!' : 'Successfully synchronized entire visit attributes and ledger values using safe FIFO Cascade!');
    } catch (err: any) {
      setFullEditError(err?.message || (lang === 'ar' ? 'تعذر الحفظ ومطابقة المخزون المتاح.' : 'Could not validate inventory stock levels.'));
    }
  };

  const handleRecomputeAllFIFO = () => {
    setIsRecalculating(true);
    setRecalcSummary(null);
    setTimeout(() => {
      try {
        const result = recomputeAllFifoDeductions();
        setRecalcSummary(result);
        reloadDb();
        alert(lang === 'ar' 
          ? `✔ تم إعادة حساب جميع فواتير الـ FIFO وخصم الزيارات بنجاح!\nتم معالجة ${result.processedVisitsCount} زيارة بنجاح.` 
          : `✔ Successfully recomputed all FIFO deductions and ledger balances across all visits!\nProcessed ${result.processedVisitsCount} visits.`
        );
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setIsRecalculating(false);
      }
    }, 600);
  };

  const handleWipeMigratedVisits = () => {
    if (!window.confirm(lang === 'ar' 
      ? 'تحذير: هل أنت متأكد من رغبتك في تصفير بيانات التطبيق كاملاً؟ سيتم حذف جميع الزيارات وقائمة الأطباء والخطط المجدولة بالكامل، وإرجاع كميات المخزون لمطابقة الفواتير المدخلة بنسبة 100% بدون أي خصومات.' 
      : 'Warning: Are you sure you want to completely wipe all application data? This will delete all visits, doctors lists, and cycles, and restore warehouse stocks to match entered invoices 100% without any deductions.')) {
      return;
    }
    try {
      setIsRecalculating(true);
      const res = wipeAllDataComplete();
      
      // Reset files states
      const resetMsg = lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen';
      setDoctorsFileName(resetMsg);
      setJanFileName(resetMsg);
      setFebFileName(resetMsg);
      setMarFileName(resetMsg);
      setAprFileName(resetMsg);

      // Reset migration logs state
      setMigrationLogs([
        lang === 'ar' 
          ? `🗑️ تم مسح ${res.deletedVisitsCount} زيارة وتصفير ${res.deletedDoctorsCount} طبياً بالكامل لمطابقة النظام الجديد.` 
          : `🗑️ Successfully wiped ${res.deletedVisitsCount} visits and cleared ${res.deletedDoctorsCount} doctors to match the new system.`
      ]);
      setMigrationErrors([]);
      setMigrationSuccessCount(null);
      setRecalcSummary(null);

      alert(lang === 'ar' 
        ? `✔ تم بنجاح تصفير التطبيق كاملاً! تم حذف الزيارات السابقة، ومسح قائمة الأطباء، وإرجاع كميات العينات لحالتها الأصلية بالفواتير الصرف بنسبة 100%. سيتم الآن إنعاش الصفحة بنجاح.` 
        : `✔ Application successfully reset entirely! Wiped visits, cleared doctors, and restored actual stock to match entered invoices 100%. Refreshing page now.`
      );
      
      // Full window reload to guarantee no stale states are cached anywhere in other tabs
      window.location.reload();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  // Lazy workplace coordinate tracking fixer
  const handleFixWorkplaceLocationInput = (workplaceName: string) => {
    const state = getInitialState();
    const wp = state.workplaces.find(w => w.name.trim().toLowerCase() === workplaceName.trim().toLowerCase());
    if (wp) {
      const pinLat = latitude || 24.7136;
      const pinLng = longitude || 46.6753;
      wp.latitude = pinLat;
      wp.longitude = pinLng;
      localStorage.setItem('medrep_state', JSON.stringify(state));
      reloadDb();
      alert(lang === 'ar' 
        ? `تم بنجاح تثبيت الإحداثيات لـ (${workplaceName}) على خطوط: ${pinLat.toFixed(4)}, ${pinLng.toFixed(4)}`
        : `Successfully pinned location for (${workplaceName}) at: ${pinLat.toFixed(4)}, ${pinLng.toFixed(4)}`
      );
    } else {
      const pinLat = latitude || 24.7136;
      const pinLng = longitude || 46.6753;
      registerNewEntity('workplace', workplaceName, { latitude: pinLat, longitude: pinLng });
      reloadDb();
      alert(lang === 'ar' 
        ? `تم تسجيل وتثبيت إحداثيات المكان الجديد (${workplaceName})`
        : `Registered and pinned coordinates for new workplace (${workplaceName})`
      );
    }
  };

  // Migration logic procedures
  const processAndParseFileJson = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const decoded = JSON.parse(content);
          if (Array.isArray(decoded)) {
            resolve(decoded);
          } else if (decoded && typeof decoded === 'object' && Array.isArray(decoded.data)) {
            resolve(decoded.data);
          } else {
            reject(new Error(lang === 'ar' ? 'الملف لا يحتوي على مصفوفة JSON صالحة' : 'The file does not contain a valid JSON array'));
          }
        } catch (err: any) {
          reject(new Error(lang === 'ar' ? `فشل في عزل وتحليل الـ JSON: ${err.message}` : `Failed to parse JSON file content: ${err.message}`));
        }
      };
      reader.onerror = () => {
        reject(new Error(lang === 'ar' ? 'فشل تحصيل البيانات من الملف المختار' : 'Failed to read from selected file'));
      };
      reader.readAsText(file);
    });
  };

  const handleDoctorsFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingState(true);
    try {
      const data = await processAndParseFileJson(file);
      setDoctorsFileName(file.name);
      
      // Execute migration
      migrateDoctorsFromLegacyJson(data);
      
      setMigrationLogs(prev => [
        ...prev,
        `${lang === 'ar' ? '✅ تم ترحيل ملف الأطباء بنجاح وبوضع المواقع الجغرافية كـ NULL:' : '✅ Successfully processed doctor file migration:'} ${file.name} (${data.length} records)`
      ]);
      setMigrationErrors([]);
      setMigrationSuccessCount(data.length);
      reloadDb();
      alert(lang === 'ar' ? '✔ تم ترحيل الأطباء بنجاح وبوضع المواقع الجغرافية كـ NULL' : '✔ Successfully imported doctors directory with empty geographical indexes.');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessingState(false);
      if (e.target) e.target.value = ''; // Reset file input
    }
  };

  const handleImportFromMediafire = async () => {
    setIsProcessingState(true);
    setMigrationLogs(prev => [
      ...prev,
      `${lang === 'ar' ? '🕒 جاري الاتصال بخادم MediaFire لتحميل قائمة الأطباء (تتضمن 190 طبيب)...' : '🕒 Connecting to MediaFire servers to download the doctor directory (includes 190 doctors)...'}`
    ]);
    try {
      const response = await fetch('/api/import-mediafire-doctors');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || (lang === 'ar' ? 'فشل استيراد الملف' : 'Failed to import file'));
      }
      
      const data = result.doctors;
      
      // Execute migration
      migrateDoctorsFromLegacyJson(data);
      
      setMigrationLogs(prev => [
        ...prev,
        `${lang === 'ar' ? `✅ تم تنزيل واستيراد الأطباء من MediaFire بنجاح:` : `✅ Successfully downloaded and imported doctors from MediaFire:`} doctors.json (${data.length} records)`
      ]);
      setMigrationErrors([]);
      setMigrationSuccessCount(data.length);
      setDoctorsFileName('doctors.json (MediaFire)');
      reloadDb();
      alert(lang === 'ar' 
        ? `✔ تم تنزيل واستيراد ${data.length} طبيب من MediaFire بنجاح وتحديث النظام!` 
        : `✔ Successfully downloaded and imported ${data.length} doctors from MediaFire and updated the system!`);
    } catch (err: any) {
      console.error(err);
      setMigrationLogs(prev => [
        ...prev,
        `${lang === 'ar' ? `❌ فشل عملية تحميل الأطباء من رابط MediaFire: ` : `❌ MediaFire doctor list download failed: `} ${err.message}`
      ]);
      alert(lang === 'ar' 
        ? `فشل تنزيل ملف أطباء MediaFire. يرجى مراجعة الاتصال أو المحاولة مجدداً. الخطأ: ${err.message}` 
        : `Failed to download Mediafire doctor file. Please check connection or try again. Error: ${err.message}`);
    } finally {
      setIsProcessingState(false);
    }
  };

  const handleImportMonthFromMediafire = async (monthId: string, monthName: string, expectedMonthStr: string) => {
    setIsProcessingState(true);
    setMigrationLogs(prev => [
      ...prev,
      `${lang === 'ar' ? `🕒 جاري الاتصال بخادم MediaFire لتحميل سجل زيارات شهر ${monthName}...` : `🕒 Connecting to MediaFire servers to download visit logs for ${monthName}...`}`
    ]);
    try {
      const response = await fetch(`/api/import-mediafire-month?month=${monthId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || (lang === 'ar' ? 'فشل استيراد الملف' : 'Failed to import file'));
      }

      const data = result.data;

      // Execute migration using our newly upgraded migrateHistoricalVisitsAndDeductStock which handles both formats!
      const status = migrateHistoricalVisitsAndDeductStock(data);

      // Update file state Name
      if (expectedMonthStr === '2026-01') setJanFileName(`${monthName} (MediaFire)`);
      else if (expectedMonthStr === '2026-02') setFebFileName(`${monthName} (MediaFire)`);
      else if (expectedMonthStr === '2026-04') setAprFileName(`${monthName} (MediaFire)`);
      else if (expectedMonthStr === '2026-03') setMarFileName(`${monthName} (MediaFire)`);

      setMigrationLogs(prev => [
        ...prev,
        `${lang === 'ar' 
          ? `✔ تم تحميل ودمج زيارات شهر ${monthName} من MediaFire بنظام FIFO الرجعي:` 
          : `✔ Mediafire retroactive FIFO sync successfully processed for ${monthName}:`} ${status.successCount} succeeded, ${status.errors.length} alarms`
      ]);
      setMigrationErrors(status.errors);
      setMigrationSuccessCount(status.successCount);
      reloadDb();
      alert(lang === 'ar' 
        ? `✔ تم تنزيل وخصم زيارات شهر ${monthName} بنجاح من MediaFire بنظام FIFO الرجعي والتراكمي!` 
        : `✔ Successfully downloaded, legacy ledgered, and computed FIFO deductions for ${monthName} bucket directly from MediaFire!`
      );
    } catch (err: any) {
      console.error(err);
      setMigrationLogs(prev => [
        ...prev,
        `${lang === 'ar' ? `❌ فشل دمج زيارات شهر ${monthName}: ` : `❌ Failed to ingest ${monthName} visit logs: `} ${err.message}`
      ]);
      alert(lang === 'ar' 
        ? `فشل دمج ملف شهر ${monthName}. الخطأ: ${err.message}` 
        : `Failed to download or integrate month ${monthName}. Error: ${err.message}`);
    } finally {
      setIsProcessingState(false);
    }
  };

  const handleMonthlyFilePicked = async (monthName: string, expectedMonthStr: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessingState(true);
    try {
      const data = await processAndParseFileJson(file);
      
      // Verification: Make sure all visits in the files match the expected month (2026-01, 2026-02, 2026-03, 2026-04)
      const invalidVisits = data.filter(item => {
        if (!item.visit_date) return true;
        return !item.visit_date.startsWith(expectedMonthStr);
      });
      
      if (invalidVisits.length > 0) {
        throw new Error(lang === 'ar' 
          ? `عذراً، يحتوي هذا الملف على زيارات خارج النطاق لشهر ${monthName} (المتوقع: ${expectedMonthStr})` 
          : `Invalid dataset: some records in this file do not belong to ${monthName} (expected format: ${expectedMonthStr})`
        );
      }

      // Execute migration
      const result = migrateHistoricalVisitsAndDeductStock(data);
      
      // Update file state
      if (expectedMonthStr === '2026-01') setJanFileName(file.name);
      else if (expectedMonthStr === '2026-02') setFebFileName(file.name);
      else if (expectedMonthStr === '2026-03') setMarFileName(file.name);
      else if (expectedMonthStr === '2026-04') setAprFileName(file.name);

      setMigrationLogs(prev => [
        ...prev,
        `${lang === 'ar' ? `✔ تم ترحيل زيارات شهر ${monthName} بنظام الـ FIFO الرجعي المجدول :` : `✔ Scheduled retroactive FIFO deduction completed for ${monthName}:`} ${file.name} (${result.successCount} succeeded, ${result.errors.length} alarms)`
      ]);
      setMigrationErrors(result.errors);
      setMigrationSuccessCount(result.successCount);
      reloadDb();
      alert(lang === 'ar' 
        ? `✔ تم استيراد وخصم زيارات صنف شهر ${monthName} بنظام الـ FIFO الرجعي المجدول!` 
        : `✔ Successfully ledgered and computed FIFO deductions for ${monthName} bucket!`
      );
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessingState(false);
      if (e.target) e.target.value = ''; // Reset file input
    }
  };

  const simulateDemoFile = (type: 'doctors' | 'jan' | 'feb' | 'mar' | 'apr') => {
    setIsProcessingState(true);
    setTimeout(() => {
      try {
        if (type === 'doctors') {
          const demoDocs = [
            {
              "doctor_name": "الدكتور طارق الرميحي",
              "workplace_name": "مستشفى الملك فيصل التخصصي",
              "speciality": "باطنية وقلب",
              "class_rating": "A"
            },
            {
              "doctor_name": "الدكتورة لمياء القحطاني",
              "workplace_name": "مجمع العيادات الطبية الاستشارية",
              "speciality": "نساء وولادة",
              "class_rating": "B"
            }
          ];
          migrateDoctorsFromLegacyJson(demoDocs);
          setDoctorsFileName('simulated_doctors_directory.json');
          setMigrationLogs(prev => [
            ...prev,
            `${lang === 'ar' ? '✅ تم ترحيل ملف الأطباء بنجاح وبوضع المواقع الجغرافية كـ NULL (محاكاة)' : '✅ Successfully processed doctor file migration (simulated):'} simulated_doctors_directory.json`
          ]);
          setMigrationErrors([]);
          setMigrationSuccessCount(demoDocs.length);
          reloadDb();
          alert(lang === 'ar' ? '✔ تم ترحيل الأطباء بنجاح وبوضع المواقع الجغرافية كـ NULL' : '✔ Successfully imported doctors directory with empty geographical indexes.');
        } else {
          let demoVisits: any[] = [];
          let monthName = '';
          let expectedMonthStr = '';
          
          if (type === 'jan') {
            monthName = lang === 'ar' ? 'يناير 2026' : 'January 2026';
            expectedMonthStr = '2026-01';
            demoVisits = [
              {
                "visit_date": "2026-01-10",
                "doctor_name": "الدكتور طارق الرميحي",
                "workplace_name": "مستشفى الملك فيصل التخصصي",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 5,
                "notes": "زيارة تمهيدية لمندوب المنطقة لشهر يناير"
              },
              {
                "visit_date": "2026-01-20",
                "doctor_name": "الدكتورة لمياء القحطاني",
                "workplace_name": "مجمع العيادات الطبية الاستشارية",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 8,
                "notes": "صرف عينات ترويجية للمركز لشهر يناير"
              }
            ];
          } else if (type === 'feb') {
            monthName = lang === 'ar' ? 'فبراير 2026' : 'February 2026';
            expectedMonthStr = '2026-02';
            demoVisits = [
              {
                "visit_date": "2026-02-12",
                "doctor_name": "الدكتور طارق الرميحي",
                "workplace_name": "مستشفى الملك فيصل التخصصي",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 4,
                "notes": "زيارة متابعة لشهر فبراير"
              },
              {
                "visit_date": "2026-02-25",
                "doctor_name": "الدكتورة لمياء القحطاني",
                "workplace_name": "مجمع العيادات الطبية الاستشارية",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 6,
                "notes": "صرف عينات ترويجية مكملة لشهر فبراير"
              }
            ];
          } else if (type === 'mar') {
            monthName = lang === 'ar' ? 'مارس 2026' : 'March 2026';
            expectedMonthStr = '2026-03';
            demoVisits = [
              {
                "visit_date": "2026-03-08",
                "doctor_name": "الدكتور طارق الرميحي",
                "workplace_name": "مستشفى الملك فيصل التخصصي",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 3,
                "notes": "زيارة متابعة دورية لشهر مارس"
              },
              {
                "visit_date": "2026-03-24",
                "doctor_name": "الدكتورة لمياء القحطاني",
                "workplace_name": "مجمع العيادات الطبية الاستشارية",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 5,
                "notes": "صرف دعم طبيب لشهر مارس"
              }
            ];
          } else if (type === 'apr') {
            monthName = lang === 'ar' ? 'إبريل 2026' : 'April 2026';
            expectedMonthStr = '2026-04';
            demoVisits = [
              {
                "visit_date": "2026-04-05",
                "doctor_name": "الدكتور طارق الرميحي",
                "workplace_name": "مستشفى الملك فيصل التخصصي",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 5,
                "notes": "زيارة متابعة لشهر إبريل"
              },
              {
                "visit_date": "2026-04-18",
                "doctor_name": "الدكتورة لمياء القحطاني",
                "workplace_name": "مجمع العيادات الطبية الاستشارية",
                "sample_name": "Panadol Extra",
                "quantity_distributed": 4,
                "notes": "زيارة دورية للربع الأول لشهر إبريل"
              }
            ];
          }
          
          const result = migrateHistoricalVisitsAndDeductStock(demoVisits);
          const mockFileName = `demo_visits_${type}_2026.json`;
          
          if (type === 'jan') setJanFileName(mockFileName);
          else if (type === 'feb') setFebFileName(mockFileName);
          else if (type === 'mar') setMarFileName(mockFileName);
          else if (type === 'apr') setAprFileName(mockFileName);
          
          setMigrationLogs(prev => [
            ...prev,
            `${lang === 'ar' ? `✔ تم ترحيل زيارات شهر ${monthName} بنظام الـ FIFO الرجعي المجدول (محاكاة):` : `✔ Scheduled retroactive FIFO deduction completed (simulated) for ${monthName}:`} ${mockFileName} (${result.successCount} succeeded, ${result.errors.length} alarms)`
          ]);
          setMigrationErrors(result.errors);
          setMigrationSuccessCount(result.successCount);
          reloadDb();
          alert(lang === 'ar' 
            ? `✔ تم استيراد وخصم زيارات صنف شهر ${monthName} بنظام الـ FIFO الرجعي المجدول!` 
            : `✔ Successfully ledgered and computed FIFO deductions for ${monthName} bucket!`
          );
        }
      } catch (err: any) {
        alert(`Error: ${err.message}`);
      } finally {
        setIsProcessingState(false);
      }
    }, 450);
  };

  return (
    <div className="space-y-6 fade-in text-slate-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Page Title header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
          <CompanionIcon className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {lang === 'ar' ? 'تسجيل الزيارات اليومية وتتبع التوزيع' : 'Report Daily Visits & SFA Tracker'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'ar' 
              ? 'قم بتأكيد زيارة طبية، جلب الإحداثيات آليًا، وتوزيع عينات برصيد متجدد FIFO.' 
              : 'Log clinic field achievements, deduct FIFO medicine items, and trigger automatic safety guardrails.'}
          </p>
        </div>
      </div>

      {/* High-Level Feature Switcher */}
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl max-w-2xl w-full border border-slate-200 gap-1">
        <button
          type="button"
          className={`flex-1 min-w-[125px] text-center py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            mainTab === 'log' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => setMainTab('log')}
        >
          <Calendar className="w-4 h-4" />
          {lang === 'ar' ? 'تسجيل زيارة جديدة' : 'Log New Visit'}
        </button>
        <button
          type="button"
          className={`flex-1 min-w-[125px] text-center py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            mainTab === 'report' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => setMainTab('report')}
        >
          <Search className="w-4 h-4" />
          {lang === 'ar' ? 'سجل الزيارات والـ FIFO' : 'Ledger & FIFO Editor'}
        </button>
        <button
          type="button"
          className={`flex-1 min-w-[125px] text-center py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
            mainTab === 'migration' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
          onClick={() => setMainTab('migration')}
        >
          <Upload className="w-4 h-4" />
          {lang === 'ar' ? 'ترحيل ملفات قديمة' : 'Legacy Data Migration'}
        </button>
      </div>

      {/* 1. Log New Field Visit State Panel */}
      {mainTab === 'log' && (
        <>
          {/* Tabs list switch */}
          <div className="flex bg-slate-150 p-1 rounded-xl max-w-md w-full border border-slate-200">
            <button
              type="button"
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'Doctor' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => {
                setActiveTab('Doctor');
                setDoctorName('');
              }}
            >
              {t.docTab}
            </button>
            <button
              type="button"
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'Customer' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              onClick={() => {
                setActiveTab('Customer');
                setDoctorName('');
              }}
            >
              {t.custTab}
            </button>
          </div>

          {/* Grid container layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Form panel column */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-50 pb-3 flex justify-between items-center">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-500" />
                  {activeTab === 'Doctor' ? t.formTitleDoc : t.formTitleCust}
                </h3>
                
                {/* GPS Indicator Button */}
                <button
                  type="button"
                  onClick={triggerGpsAcquisition}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Compass className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin text-purple-600' : ''}`} />
                  {lang === 'ar' ? 'تحديث الإحداثيات' : 'Acquire GPS'}
                </button>
              </div>

              <form onSubmit={handleSubmitVisit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">{t.vDate}</label>
                    <input
                      type="date"
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all font-mono"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                    />
                  </div>

                  {activeTab === 'Doctor' ? (
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-semibold text-slate-600">{t.docName}</label>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'ar' ? 'ابحث عن اسم الطبيب...' : 'Search doctor name...'}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                        value={doctorName}
                        onChange={(e) => handleInputChange('doctor', e.target.value)}
                      />
                      {focusedField === 'doctor' && autocompleteResults.length > 0 && (
                        <div className="absolute z-25 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-50">
                          {autocompleteResults.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleSelectAutocomplete(name)}
                              className="w-full text-right md:text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5 relative">
                      <label className="text-xs font-semibold text-slate-600">{t.custName}</label>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'ar' ? 'ابحث عن اسم الصيدلية أو العميل...' : 'Pharmacy name...'}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                        value={workplaceName}
                        onChange={(e) => handleInputChange('workplace', e.target.value)}
                      />
                      {focusedField === 'workplace' && autocompleteResults.length > 0 && (
                        <div className="absolute z-25 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-50">
                          {autocompleteResults.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleSelectAutocomplete(name)}
                              className="w-full text-right md:text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Workplace clinic location (only visible in Doctor tab) */}
                  {activeTab === 'Doctor' && (
                    <div className="space-y-1.5 md:col-span-2 relative">
                      <label className="text-xs font-semibold text-slate-600">{t.workplace}</label>
                      <input
                        type="text"
                        required
                        placeholder={lang === 'ar' ? 'اسم المستشفى أو عيادة الطبيب...' : 'Hospital or clinic workplace...'}
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all"
                        value={workplaceName}
                        onChange={(e) => handleInputChange('workplace', e.target.value)}
                      />
                      {focusedField === 'workplace' && autocompleteResults.length > 0 && (
                        <div className="absolute z-25 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-50">
                          {autocompleteResults.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => handleSelectAutocomplete(name)}
                              className="w-full text-right md:text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Realtime Geo gap alert for the selected doctor's workplace in Doctors tab */}
                  {activeTab === 'Doctor' && workplaceName.trim() !== '' && (
                    (() => {
                      const wp = db.workplaces.find(
                        (w) => w.name.trim().toLowerCase() === workplaceName.trim().toLowerCase()
                      );
                      const hasMissingCoords = !wp || wp.latitude === null || wp.longitude === null;
                      if (hasMissingCoords) {
                        return (
                          <div className="md:col-span-2 bg-amber-50/90 border border-amber-200 text-amber-900 text-xs p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse text-right">
                            <div className="flex items-center gap-2 font-bold">
                              <span className="text-sm">⚠️</span>
                              <span>{lang === 'ar' ? 'الطبيب بدون موقع مؤرشف حالياً!' : 'Doctor has no saved location!'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleFixWorkplaceLocationInput(workplaceName)}
                              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer self-end sm:self-auto"
                            >
                              <span>📍</span>
                              <span>{lang === 'ar' ? 'تثبيت الموقع الحالي وحل الفجوة' : 'Pin Current Location & Resolve'}</span>
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>

                {/* Auto GPS status indicators */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-2 text-slate-600">
                    <MapPin className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="space-y-1">
                      <div className="text-xs font-bold">{t.geoStatus}</div>
                      <div className="text-[11px] font-mono font-medium">
                        {isFetchingGps ? (
                          <span className="text-slate-400 animate-pulse">{t.fetchingGps}</span>
                        ) : (
                          <span>
                            Lat: <strong className="text-slate-800">{latitude?.toFixed(4) || '---'}</strong>, 
                            Lng: <strong className="text-slate-800">{longitude?.toFixed(4) || '---'}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {gpsFallbackUsed && (
                    <div className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1.5 rounded-lg max-w-sm">
                      ⚡ {t.indoorHospitalRule}
                    </div>
                  )}
                </div>

                {/* Repeatable Samples distribution row */}
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 border-b border-slate-100 pb-1 flex justify-between items-center">
                    <span>{t.samplesDistributed}</span>
                  </div>

                  {samples.map((s, idx) => {
                    const absoluteTotalStock = getSampleStockBalance(s.sampleName);
                    const validDateStock = getSampleStockBalanceForDate(s.sampleName, visitDate);
                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl relative space-y-3">
                        {/* Trash row button */}
                        {samples.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSampleRow(idx)}
                            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Medicine Selector input */}
                          <div className="space-y-1 relative">
                            <label className="text-xs font-semibold text-slate-600">{t.itemPicker}</label>
                            <input
                              type="text"
                              placeholder={lang === 'ar' ? 'اكتب اسم الصنف للتسهيل...' : 'Medicine name...'}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 font-medium"
                              value={s.sampleName}
                              onChange={(e) => handleSampleNameChange(idx, e.target.value)}
                              onFocus={() => {
                                setFocusedField({ type: 'sample', idx });
                                setAutocompleteResults(searchAutocomplete('sample', s.sampleName));
                              }}
                            />

                            {focusedField && typeof focusedField === 'object' && focusedField.type === 'sample' && focusedField.idx === idx && autocompleteResults.length > 0 && (
                              <div className="absolute z-25 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg max-h-32 overflow-y-auto divide-y divide-slate-50">
                                {autocompleteResults.map((name) => (
                                  <button
                                    key={name}
                                    type="button"
                                    onClick={() => handleSelectAutocomplete(name)}
                                    className="w-full text-right md:text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors cursor-pointer"
                                  >
                                    {name}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Real-time AVAILABLE STOCK HUD badges */}
                            {s.sampleName && (
                              <div className="mt-2.5 space-y-2">
                                {/* Date Stock Badge (Green Theme) */}
                                <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] px-3 py-1.5 rounded-lg flex items-center justify-between font-medium">
                                  <span>
                                    {lang === 'ar' 
                                      ? `المخزون المتاح لهذه الزيارة الحالية هو: ` 
                                      : `Available stock for this current visit is: `}
                                    <strong className="font-mono text-xs">{validDateStock}</strong>
                                    {lang === 'ar' ? ' علبة' : ' units'}
                                  </span>
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                </div>

                                {/* Absolute Stock Badge (Orange Theme) */}
                                <div className="bg-amber-50 border border-amber-100 text-amber-800 text-[11px] px-3 py-1.5 rounded-lg flex items-center justify-between font-medium">
                                  <span>
                                    {lang === 'ar' 
                                      ? `إجمالي المخزون الكلي في الحقيبة (للقراءة فقط): ` 
                                      : `Total absolute stock in the bag (Read-Only): `}
                                    <strong className="font-mono text-xs">{absoluteTotalStock}</strong>
                                    {lang === 'ar' ? ' علبة' : ' units'}
                                  </span>
                                  <span className="text-[10px] text-amber-600">ℹ️</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Distributed quantity (allows 0) */}
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-slate-600">{t.qty}</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-purple-500 font-mono"
                              value={s.qty}
                              onChange={(e) => handleQtyChange(idx, Math.max(0, Number(e.target.value)))}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={addAnotherSampleRow}
                    className="px-3.5 py-1.5 bg-slate-50 hover:bg-radial text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4 text-purple-600" />
                    {t.addSample}
                  </button>
                </div>

                {/* Notes Comment box */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">{t.notes}</label>
                  <textarea
                    placeholder={lang === 'ar' ? 'تفاصيل المناقشة مع العميل أو الطبيب...' : 'Discussion detailing feedback...'}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none h-20 transition-all resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Footer controls submit */}
                <div className="pt-3 border-t border-slate-50 flex justify-end">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm shadow-purple-500/15 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {t.saveVisit}
                  </button>
                </div>
              </form>
            </div>

            {/* Biography Context and History column */}
            <div className="xl:col-span-1 space-y-6">
              {/* Dynamic Contextual Bio Card */}
              {activeTab === 'Doctor' && doctorName.trim() && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-xl -mr-12 -mt-12"></div>
                  
                  <div className="relative z-10 space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
                      <h4 className="font-extrabold text-sm text-purple-100">{t.lastGivenCard}</h4>
                    </div>

                    {lastVisitInfo ? (
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between border-b border-white/5 pb-2">
                          <span className="text-slate-400 font-medium">{t.lastGivenDate}</span>
                          <strong className="text-slate-200 font-mono">{lastVisitInfo.lastDate}</strong>
                        </div>

                        <div className="space-y-1.5">
                          <div className="text-slate-400 font-medium mb-1">{t.lastGivenSamples}</div>
                          <div className="space-y-1 bg-white/5 border border-white/5 p-2.5 rounded-xl">
                            {lastVisitInfo.samples.map((s, i) => (
                              <div key={i} className="flex justify-between font-mono text-[11px] font-semibold">
                                <span className="text-white font-sans">{s.name}</span>
                                <span className="text-purple-300">{s.qty} وحدات</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        {lang === 'ar' ? 'لا توجد زيارات سابقة مسجلة وموثقة لهذا الطبيب.' : 'No historic sample releases recorded for this physician.'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* List of active Visits */}
              <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-dash border-slate-50 pb-2">
                  {t.visitsHistory}
                </h3>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                  {[...db.visits].reverse().map((v) => {
                    const inTime = new Date(v.checkInTime).getTime();
                    const outTime = new Date(v.checkOutTime).getTime();
                    const duration = Math.round((outTime - inTime) / 1000 / 60);
                    
                    return (
                      <div key={v.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-2 relative">
                        <button
                          type="button"
                          onClick={() => handleDeleteVisit(v.id)}
                          className="absolute top-2.5 left-2.5 text-slate-400 hover:text-red-500 p-1 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title={t.deleteBtn}
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-1.5 pr-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="bg-slate-200/60 text-slate-600 px-1.5 py-0.5 rounded-sm font-semibold">{v.clientType}</span>
                            <span className="font-mono">{v.visitDate}</span>
                            {v.isUnplanned && (
                              <span className="bg-amber-100/50 text-amber-800 border border-amber-200/40 text-[9px] px-1 py-0.5 rounded-sm font-semibold">غير مخطط</span>
                            )}
                          </div>

                          <div className="text-xs font-bold text-slate-800">
                            {v.clientType === 'Doctor' ? v.doctorName : v.workplaceName}
                          </div>

                          {v.clientType === 'Doctor' && (
                            <div className="text-[10px] text-slate-500 font-medium">
                              {v.workplaceName} • <span className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-semibold text-[9px]">Class {v.doctorClass}</span>
                            </div>
                          )}

                          {/* Samples distributed details */}
                          {v.samples.length > 0 && (
                            <div className="space-y-1 border-t border-slate-100/60 pt-2">
                              {v.samples.map((s, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[10px] font-mono text-slate-600">
                                  <span className="font-sans truncate max-w-[120px]">{s.sampleName}</span>
                                  <strong className="text-slate-900 font-bold">{s.quantityDistributed} وحدات</strong>
                                </div>
                              ))}
                            </div>
                          )}

                          {v.notes && (
                            <p className="text-[10px] text-slate-400 italic line-clamp-2 pt-1 border-t border-slate-100/40">
                              "{v.notes}"
                            </p>
                          )}

                          <div className="text-[8px] text-slate-400 text-left pt-1 font-mono">
                            مدة الزيارة: {duration} دقيقة
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {db.visits.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                      {t.noVisits}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 2. Interactive Spreadsheet Report & Live FIFO Editor State Panel */}
      {mainTab === 'report' && (
        <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                {lang === 'ar' ? 'سجل الزيارات التفاعلي ومعدل الـ FIFO' : 'Interactive Visits Spreadsheet & FIFO Ledger'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'ar' 
                  ? 'جدول الرقابة المركزي لمطابقة التوزيع الجغرافي وتعديل الميزان الدوائي فورياً.' 
                  : 'Central audit ledger for tracking GPS pins compliance and adjusting medicine quantities.'}
              </p>
            </div>
            {/* Clear filters shortcut */}
            {(reportSearchDoctor || reportDateFrom || reportDateTo) && (
              <button
                type="button"
                onClick={() => {
                  setReportSearchDoctor('');
                  setReportDateFrom('');
                  setReportDateTo('');
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 font-semibold cursor-pointer text-slate-700"
              >
                {lang === 'ar' ? 'إعادة تعيين الفلاتر 🔄' : 'Reset Filters 🔄'}
              </button>
            )}
          </div>

          {/* Interactive Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">
                {lang === 'ar' ? 'البحث باسم الطبيب أو العميل' : 'Search Physician / Customer'}
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder={lang === 'ar' ? 'مثال: الدكتور طارق...' : 'e.g. Dr. Tariq...'}
                  className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-purple-500 font-medium"
                  value={reportSearchDoctor}
                  onChange={(e) => setReportSearchDoctor(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">
                {lang === 'ar' ? 'تاريخ البداية (من)' : 'Date From'}
              </label>
              <input
                type="date"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500 font-mono"
                value={reportDateFrom}
                onChange={(e) => setReportDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600">
                {lang === 'ar' ? 'تاريخ النهاية (إلى)' : 'Date To'}
              </label>
              <input
                type="date"
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-purple-500 font-mono"
                value={reportDateTo}
                onChange={(e) => setReportDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full text-right md:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-150">
                  <th className="p-3 font-semibold">{lang === 'ar' ? 'بيانات الزيارة والعميل' : 'Physician & Client profile'}</th>
                  <th className="p-3 font-semibold">{lang === 'ar' ? 'التاريخ الميداني' : 'Field Date'}</th>
                  <th className="p-3 font-semibold">{lang === 'ar' ? 'العينات والكميات (تعديل مباشر)' : 'Distributed Items (FIFO Edit)'}</th>
                  <th className="p-3 font-semibold">{lang === 'ar' ? 'الموقع الجغرافي والـ GPS' : 'GPS Location Tracking'}</th>
                  <th className="p-3 font-semibold text-center">{lang === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {db.visits
                  .filter((v) => {
                    if (reportSearchDoctor.trim()) {
                      const q = reportSearchDoctor.toLowerCase().trim();
                      const nameMatch = v.doctorName?.toLowerCase().includes(q) || v.workplaceName?.toLowerCase().includes(q);
                      if (!nameMatch) return false;
                    }
                    if (reportDateFrom && new Date(v.visitDate) < new Date(reportDateFrom)) return false;
                    if (reportDateTo && new Date(v.visitDate) > new Date(reportDateTo)) return false;
                    return true;
                  })
                  .map((v) => {
                    const wpInDb = db.workplaces.find(w => w.name.trim().toLowerCase() === v.workplaceName.trim().toLowerCase());
                    const hasMissingCoords = !wpInDb || wpInDb.latitude === null || wpInDb.longitude === null;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900">
                            {v.clientType === 'Doctor' ? v.doctorName : v.workplaceName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {v.clientType === 'Doctor' ? `${v.workplaceName} • Class ${v.doctorClass || 'B'}` : (lang === 'ar' ? 'زيارة صيدلية خارجية' : 'Clinical Pharmacy Customer')}
                          </div>
                          {v.notes && (
                            <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-md mt-1 italic border-r-2 border-purple-400 max-w-sm truncate">
                              "{v.notes}"
                            </div>
                          )}
                        </td>

                        <td className="p-3 font-mono text-slate-600 font-semibold">{v.visitDate}</td>

                        <td className="p-3 space-y-2">
                          {v.samples.length > 0 ? (
                            <div className="flex flex-col gap-1.5">
                              {v.samples.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-purple-50/50 border border-purple-100/40 p-1.5 rounded-lg justify-between max-w-xs">
                                  <span className="font-medium text-slate-700 truncate max-w-[120px]">{s.sampleName}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded font-mono text-[10px]">
                                      {s.quantityDistributed} {lang === 'ar' ? 'وحدات' : 'items'}
                                    </span>
                                    {/* Edit Full Visit Details Button (Modal Popup) */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenFullEditModal(v)}
                                      className="p-1 hover:bg-purple-200 hover:text-purple-900 rounded text-purple-600 transition-colors cursor-pointer"
                                      title={lang === 'ar' ? 'تعديل جميع بيانات الزيارة' : 'Edit all visit data'}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">{lang === 'ar' ? 'بدون صرف عينات' : 'Zero distribution'}</span>
                          )}
                        </td>

                        <td className="p-3">
                          {hasMissingCoords ? (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 max-w-xs space-y-1 text-[10px] text-amber-800 font-medium text-right">
                              <div>⚠️ {lang === 'ar' ? 'الطبيب بدون موقع مؤرشف حالياً!' : 'Doctor has no saved location!'}</div>
                              <button
                                type="button"
                                onClick={() => handleFixWorkplaceLocationInput(v.workplaceName)}
                                className="text-purple-700 hover:text-purple-900 font-bold underline flex items-center gap-0.5 cursor-pointer text-[10px]"
                              >
                                📍 {lang === 'ar' ? 'تثبيت الموقع الحالي وحل الفجوة' : 'Fix & Pin Current Location'}
                              </button>
                            </div>
                          ) : (
                            <div className="font-mono text-slate-500 text-[10px] flex flex-col gap-0.5">
                              <span className="text-slate-700 font-medium font-sans">🌐 {v.workplaceName}</span>
                              <span>Lat: {wpInDb?.latitude?.toFixed(5) || '---'}</span>
                              <span>Lng: {wpInDb?.longitude?.toFixed(5) || '---'}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteVisit(v.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer inline-flex"
                            title={t.deleteBtn}
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                {db.visits.filter((v) => {
                  if (reportSearchDoctor.trim()) {
                    const q = reportSearchDoctor.toLowerCase().trim();
                    return v.doctorName?.toLowerCase().includes(q) || v.workplaceName?.toLowerCase().includes(q);
                  }
                  if (reportDateFrom && new Date(v.visitDate) < new Date(reportDateFrom)) return false;
                  if (reportDateTo && new Date(v.visitDate) > new Date(reportDateTo)) return false;
                  return true;
                }).length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-medium bg-slate-50/50">
                      {lang === 'ar' ? 'لا توجد أي سجلات مطابقة للبحث حالياً.' : 'No matching visit logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Legacy File Data Migrator State Panel */}
      {mainTab === 'migration' && (() => {
        const isJanComplete = db.visits.some(v => v.visitDate.startsWith('2026-01'));
        const isFebComplete = db.visits.some(v => v.visitDate.startsWith('2026-02'));
        const isMarComplete = db.visits.some(v => v.visitDate.startsWith('2026-03'));
        const isAprComplete = db.visits.some(v => v.visitDate.startsWith('2026-04'));

        return (
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-sm space-y-6 text-right">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Upload className="w-5 h-5 text-purple-600 animate-pulse" />
                {lang === 'ar' ? 'بوابة ترحيل البيانات القديمة والمزامنة الرجعية' : 'Legacy Data Migration & Retroactive Sync Hub'}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'ar' 
                  ? 'استورد قوائم الأطباء والتاريخ الميداني لخصمه تلقائياً وبأولويته FIFO من الدفعات النشطة عبر ملفات JSON حقيقية.' 
                  : 'Import legacy doctor listings and historical SFA logs to execute FIFO active bag deductions automatically via real JSON files.'}
              </p>
            </div>

            {/* Hidden native input files pointers */}
            <input 
              type="file" 
              ref={doctorsFileRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleDoctorsFilePicked} 
            />
            <input 
              type="file" 
              ref={janFileRef} 
              className="hidden" 
              accept=".json" 
              onChange={(e) => handleMonthlyFilePicked(lang === 'ar' ? 'يناير 2026' : 'January 2026', '2026-01', e)} 
            />
            <input 
              type="file" 
              ref={febFileRef} 
              className="hidden" 
              accept=".json" 
              onChange={(e) => handleMonthlyFilePicked(lang === 'ar' ? 'فبراير 2026' : 'February 2026', '2026-02', e)} 
            />
            <input 
              type="file" 
              ref={marFileRef} 
              className="hidden" 
              accept=".json" 
              onChange={(e) => handleMonthlyFilePicked(lang === 'ar' ? 'مارس 2026' : 'March 2026', '2026-03', e)} 
            />
            <input 
              type="file" 
              ref={aprFileRef} 
              className="hidden" 
              accept=".json" 
              onChange={(e) => handleMonthlyFilePicked(lang === 'ar' ? 'أبريل 2026' : 'April 2026', '2026-04', e)} 
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Doctors Migration Card (Right-hand in RTL) */}
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-150 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-purple-500" />
                      {lang === 'ar' ? 'ترحيل الأطباء من قائمة JSON' : 'Doctor Directory Migration (JSON)'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => simulateDemoFile('doctors')}
                      className="text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md font-semibold cursor-pointer border border-purple-200"
                    >
                      💡 {lang === 'ar' ? 'التجريب التلقائي (محاكاة)' : 'Load Demo Dr list'}
                    </button>
                  </div>
                  
                  <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center bg-white space-y-3">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" strokeWidth={1.5} />
                    <p className="text-xs text-slate-500 font-medium">
                      {lang === 'ar' ? 'يدعم الملفات حقيقية الامتداد .json تحتوي مصفوفة الأطباء' : 'Accepts standard doctors directory config .json block'}
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => doctorsFileRef.current?.click()}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg cursor-pointer transition-colors border border-slate-200"
                      >
                        {lang === 'ar' ? 'اختر ملف الأطباء (JSON)' : 'Choose Doctors File (JSON)'}
                      </button>
                      
                      <div className="flex items-center justify-center gap-2 text-slate-300 text-[10px] my-1 font-bold">
                        <span>—</span>
                        <span>{lang === 'ar' ? 'أو' : 'OR'}</span>
                        <span>—</span>
                      </div>

                      <button
                        type="button"
                        disabled={isProcessingState}
                        onClick={handleImportFromMediafire}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/10"
                      >
                        {isProcessingState ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {lang === 'ar' ? 'جاري التحميل والتثبيت والدمج...' : 'Downloading & Ingesting...'}
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4 text-purple-200 animate-pulse" />
                            {lang === 'ar' ? 'تحميل مباشر من رابط MediaFire (190 طبيب)' : 'Download & Import doctors from MediaFire (190)'}
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 italic mt-1.5">
                      {lang === 'ar' ? `الملف المختار: ${doctorsFileName}` : `Selected file: ${doctorsFileName}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Monthly Historical Visits & Deductions (Sequential locks) */}
              <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-150 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-purple-500" />
                    {lang === 'ar' ? 'ترحيل الزيارات الشهرية التاريخية (FIFO)' : 'Monthly Visit Logs FIFO Migrator'}
                  </h4>
                  
                  {/* Lock sequential safeguard HUD info alert */}
                  <div className="bg-amber-50 border border-amber-200/50 text-amber-800 text-[10px] p-2.5 rounded-lg space-y-1">
                    <div className="font-bold flex items-center gap-1">
                      <span>⚠️</span>
                      <span>{lang === 'ar' ? 'حارس تأمين المزامنة التراكمية الـ FIFO:' : 'Cumulative Sequenced FIFO Safekeeping Guard:'}</span>
                    </div>
                    <p>
                      {lang === 'ar' 
                        ? 'تأمين الحسابات يتطلب ترحيل الأشهر بالتتابع الزمني الصارم (فبراير يفتح بعد ترحيل يناير، ومارس بعد فبراير، وهكذا).' 
                        : 'Calculations depend on chrono order: Feb requires Jan database records to compute cumulative active balance values safely.'}
                    </p>
                  </div>

                  {/* Progressive Month Selection Matrix */}
                  <div className="space-y-2.5 pt-2">
                    {/* Month Rows Grid */}
                    {[
                      { 
                        id: 'jan', 
                        labelAr: 'يناير 2026', 
                        labelEn: 'January 2026', 
                        dateStr: '2026-01', 
                        isUnlocked: true, 
                        isComplete: isJanComplete,
                        fileName: janFileName,
                        ref: janFileRef
                      },
                      { 
                        id: 'feb', 
                        labelAr: 'فبراير 2026', 
                        labelEn: 'February 2026', 
                        dateStr: '2026-02', 
                        isUnlocked: isJanComplete, 
                        isComplete: isFebComplete,
                        fileName: febFileName,
                        ref: febFileRef
                      },
                      { 
                        id: 'mar', 
                        labelAr: 'مارس 2026', 
                        labelEn: 'March 2026', 
                        dateStr: '2026-03', 
                        isUnlocked: isJanComplete && isFebComplete, 
                        isComplete: isMarComplete,
                        fileName: marFileName,
                        ref: marFileRef
                      },
                      { 
                        id: 'apr', 
                        labelAr: 'أبريل 2026', 
                        labelEn: 'April 2026', 
                        dateStr: '2026-04', 
                        isUnlocked: isJanComplete && isFebComplete && isMarComplete, 
                        isComplete: isAprComplete,
                        fileName: aprFileName,
                        ref: aprFileRef
                      }
                    ].map((m) => {
                      const monthName = lang === 'ar' ? m.labelAr : m.labelEn;
                      return (
                        <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 bg-white rounded-lg border border-slate-100 animate-fadeIn">
                          {/* Left text month detail */}
                          <div className="flex items-center gap-1.5">
                            {!m.isUnlocked ? (
                              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : m.isComplete ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            )}
                            <span className={`text-[11px] font-bold ${m.isUnlocked ? 'text-slate-800' : 'text-slate-400'}`}>
                              {monthName}
                            </span>
                            {m.isComplete && (
                              <span className="bg-emerald-50 text-emerald-700 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                {lang === 'ar' ? 'مكتمل' : 'Complete'}
                              </span>
                            )}
                          </div>

                          {/* Action upload file-pickers details */}
                          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                            {/* Direct Mediafire Import Button */}
                            {m.isUnlocked && !m.isComplete && (
                              <button
                                type="button"
                                disabled={isProcessingState}
                                onClick={() => handleImportMonthFromMediafire(m.id, monthName, m.dateStr)}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-indigo-500/10 shrink-0"
                              >
                                <Database className="w-3 h-3 text-purple-200" />
                                {lang === 'ar' ? 'تحميل مباشر من MediaFire' : 'Direct Download'}
                              </button>
                            )}

                            {/* Open File dialog button */}
                            <button
                              type="button"
                              disabled={!m.isUnlocked}
                              onClick={() => m.ref.current?.click()}
                              className={`px-2.5 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                !m.isUnlocked 
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <Upload className="w-3 h-3" />
                              {m.fileName !== (lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen') 
                                ? m.fileName 
                                : lang === 'ar' ? 'ملف يدوي' : 'Pick PDF/JSON'}
                            </button>

                            {/* Simulation toggle buttons for instant testing */}
                            {m.isUnlocked && !m.isComplete && (
                              <button
                                type="button"
                                onClick={() => simulateDemoFile(m.id as any)}
                                className="px-2 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[9px] font-semibold text-slate-600 flex items-center gap-0.5 cursor-pointer"
                                title={lang === 'ar' ? 'محاكاة ترحيل البيانات' : 'Simulate Migration'}
                              >
                                💡
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Retroactive FIFO Stock Realignment */}
              <div className="bg-purple-50/35 p-5 rounded-xl border border-purple-100 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                    <ArrowUpDown className="w-4 h-4 text-purple-600 animate-pulse font-bold" />
                    {lang === 'ar' ? 'مزامنة فواتير ومخازن الـ FIFO (خصم الزيارات القديمة)' : 'FIFO Ledger Synchronizer (Deduct Old Visits)'}
                  </h4>
                  
                  <p className="text-[11px] text-purple-950/80 leading-relaxed text-right">
                    {lang === 'ar' 
                      ? 'إذا قمت باستيراد زيارات سابقة أو تعديل فواتير المستودع لاحقاً، تتيح لك هذه الأداة إعادة ضبط مخزون جميع فواتير النظام لخصم كافة العينات الموزعة تاريخياً بترتيب زمني صارم (FIFO) وبمنتهى الدقة.' 
                      : 'If you imported historical visits or added warehouse invoices later, use this tool to re-calculate and apply precise chronological (FIFO) stock deductions across all visit logs.'}
                  </p>

                  <button
                    type="button"
                    disabled={isRecalculating}
                    onClick={handleRecomputeAllFIFO}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-purple-500/10"
                  >
                    {isRecalculating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {lang === 'ar' ? 'جاري إعادة المعالجة والحساب للـ FIFO...' : 'Re-allocating stocks via FIFO cascade...'}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-purple-200" />
                        {lang === 'ar' ? 'بدء خصم العينات وإعادة مطابقة الـ FIFO' : 'Apply Retroactive FIFO Deductions'}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 4. Reset & Rollback All Migrated Visits */}
              <div className="bg-red-50/35 p-5 rounded-xl border border-red-100 flex flex-col justify-between space-y-4">
                <div className="space-y-3 font-sans">
                  <h4 className="font-bold text-red-950 text-xs flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-red-600 font-bold" />
                    {lang === 'ar' ? 'تصفير بيانات التطبيق كاملاً وقائمة الأطباء' : 'Reset All App Data & Doctors List'}
                  </h4>
                  
                  <p className="text-[11px] text-red-950/80 leading-relaxed text-right">
                    {lang === 'ar' 
                      ? 'تقوم هذه الأداة بحذف كافة الزيارات المسجلة وقائمة الأطباء والخطط المجدولة، وإرجاع كميات المخزون للكميات الأصلية المدخلة بالفواتير بنسبة 100% لتصحيح أوجه التطابق من البداية.' 
                      : 'Deletes all visits, clears the entire doctors database list, resets weekly plans, and restores stock quantities back to their initial invoice quantities, allowing a clean slate for correct imports.'}
                  </p>

                  <button
                    type="button"
                    disabled={isRecalculating}
                    onClick={handleWipeMigratedVisits}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/10"
                  >
                    <Trash2 className="w-4 h-4 text-red-200" />
                    {lang === 'ar' ? 'تصفير وتطهير الذاكرة واستعادة المخزون الأصلي' : 'Full Wipe & Recover Original Stock'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stamped Migration Log HUD */}
            {(migrationSuccessCount !== null || migrationLogs.length > 0 || recalcSummary !== null) && (
              <div className="bg-slate-900 text-slate-300 rounded-xl p-5 border border-slate-800 space-y-3 font-mono text-[11px] text-right">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-purple-400 font-bold">💻 {lang === 'ar' ? 'سجل ترحيل النظام المركزي:' : 'Migration central terminal log:'}</span>
                  {(migrationSuccessCount !== null || recalcSummary !== null) && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-sans text-xs font-bold animate-pulse">
                      {lang === 'ar' 
                        ? `بنجاح: ${recalcSummary ? recalcSummary.totalDeductionsCount : migrationSuccessCount} عينة` 
                        : `Success: ${recalcSummary ? recalcSummary.totalDeductionsCount : migrationSuccessCount} items`}
                    </span>
                  )}
                </div>

                {/* Monospace terminal logs */}
                <div className="max-h-44 overflow-y-auto divide-y divide-slate-800/40 text-[10px] space-y-1 pr-1 text-right">
                  {recalcSummary && (
                    <div className="py-1 text-emerald-400 font-bold">
                      {lang === 'ar'
                        ? `✔ تم الانتهاء بنجاح من المزامنة والخصم التراكمي: معالجة ${recalcSummary.processedVisitsCount} زيارات وصرف ${recalcSummary.totalDeductionsCount} عينات بنظام الـ FIFO.`
                        : `✔ Complete: Processed ${recalcSummary.processedVisitsCount} visits and spent ${recalcSummary.totalDeductionsCount} sample units via FIFO cascade.`}
                    </div>
                  )}
                  {migrationLogs.map((log, i) => (
                    <div key={i} className="py-1 text-slate-300 flex items-start gap-1 justify-end text-right">
                      <span>{log}</span>
                      <span className="text-slate-500 shrink-0">[{i+1}]</span>
                    </div>
                  ))}
                </div>

                {/* Monospace warning/infraction alarms */}
                {((recalcSummary && recalcSummary.insufficientStockAlarms.length > 0) || migrationErrors.length > 0) && (
                  <div className="border-t border-slate-800 pt-3 space-y-1.5 text-xs text-right">
                    <div className="text-amber-400 font-bold font-sans">⚠️ {lang === 'ar' ? 'إنذارات ومخالفات الخصم الرجعي (FIFO Alarms):' : 'Retroactive Deduction Warnings (FIFO Alarms):'}</div>
                    <div className="space-y-1 text-right">
                      {recalcSummary?.insufficientStockAlarms.map((err, i) => (
                        <div key={`recalc-${i}`} className="text-red-400 text-[11px] bg-red-400/5 border border-red-400/15 p-1 px-2 rounded text-right">
                          • {err}
                        </div>
                      ))}
                      {migrationErrors.map((err, i) => (
                        <div key={i} className="text-red-400 text-[11px] bg-red-400/5 border border-red-400/15 p-2 rounded text-right">
                          • {err}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Dynamic FIFO Quantity editing dialog */}
      {editingVisitId !== null && editingSampleName !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-100 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-purple-600 px-5 py-4 text-white flex items-center gap-2.5">
              <Edit3 className="w-5 h-5 shrink-0 animate-pulse" />
              <div>
                <h4 className="font-bold text-sm tracking-tight text-right">
                  {lang === 'ar' ? 'تعديل كمية منصرف عينة FIFO' : 'Edit FIFO Sample Quantity'}
                </h4>
                <p className="text-[10px] text-purple-200 font-medium text-right">
                  {lang === 'ar' ? 'يقوم بإيقاف السجل وترتيب الخصم التراكمي آلياً' : 'Recalculates ledger FIFO queue deductions on the fly'}
                </p>
              </div>
            </div>

            {/* Content body */}
            <div className="p-5 space-y-4 text-right">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2 text-xs text-right">
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'ar' ? 'اسم الصنف الدوائي:' : 'Product Sample Name:'}</span>
                  <strong className="text-slate-800 font-sans">{editingSampleName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'ar' ? 'تاريخ المتابعة في السجل:' : 'Recorded Visit Date:'}</span>
                  <strong className="text-slate-800 font-mono">{editingVisitDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{lang === 'ar' ? 'الكمية القديمة المصروفة:' : 'Original Distributed Qty:'}</span>
                  <strong className="text-slate-800 font-mono">{editingCurrentQty} {lang === 'ar' ? 'وحدة' : 'units'}</strong>
                </div>
              </div>

              {/* Input for new quantity */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-semibold text-slate-600">
                  {lang === 'ar' ? 'الكمية الجديدة الدقيقة (يسمح بـ 0)' : 'New distributed quantity (allows 0)'}
                </label>
                <input
                  type="number"
                  min="0"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-sm outline-none font-mono text-right"
                  value={editingNewQtyValue}
                  onChange={(e) => setEditingNewQtyValue(e.target.value)}
                />
              </div>

              {/* Live stock indicator HUD badge */}
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] px-3 py-2 rounded-lg space-y-1 text-right">
                <div className="flex justify-between items-center">
                  <span>{lang === 'ar' ? 'إجمالي المخزون المتاح لهذه الزيارة:' : 'Allowed stock for this visit:'}</span>
                  <strong className="font-mono text-xs text-emerald-950">
                    {getSampleStockBalanceForDate(editingSampleName || '', editingVisitDate)} {lang === 'ar' ? 'علبة' : 'units'}
                  </strong>
                </div>
              </div>

              {/* Error messages block */}
              {editErrorMsg && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl flex items-start gap-1.5 text-right">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{editErrorMsg}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => {
                    setEditingVisitId(null);
                    setEditingSampleName(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuantityEdit}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {lang === 'ar' ? 'حفظ وتعديل الـ FIFO' : 'Save & Adjust FIFO'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Doctor addition Interceptor dialog */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-purple-600">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Compass className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-extrabold text-slate-950 text-base">{t.newDocTitle}</h4>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {t.newDocDesc.replace('[NAME]', newDocCandidate)}
            </p>

            <div className="space-y-3.5 pt-2">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">{t.docSpeciality}</label>
                <input
                  type="text"
                  placeholder="e.g. Ophthalmology, Orthopedics"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none"
                  value={newDocSpeciality}
                  onChange={(e) => setNewDocSpeciality(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500">{t.docClass}</label>
                <select
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none font-semibold"
                  value={newDocClass}
                  onChange={(e) => setNewDocClass(e.target.value as any)}
                >
                  <option value="A">الفئة (A) - متابعة كل 14 يوماً</option>
                  <option value="B">الفئة (B) - متابعة شهرياً</option>
                  <option value="C">الفئة (C) - متابعة دورية</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveDocFromConfirm}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {t.saveEntity}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Workplace addition Interceptor dialog */}
      {showWorkplaceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-purple-600">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Navigation className="w-5 h-5 animate-bounce" />
              </div>
              <h4 className="font-extrabold text-slate-950 text-base">{t.newWorkTitle}</h4>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {t.newWorkDesc.replace('[NAME]', newWorkplaceCandidate)}
            </p>

            <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowWorkplaceModal(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSaveWorkplaceFromConfirm}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                {t.saveEntity}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Error Modal Window (Triggered in Red) */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-red-200 overflow-hidden shadow-2xl">
            <div className="bg-red-600 px-5 py-4 text-white flex items-center gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 animate-ping" />
              <h4 className="font-bold text-sm tracking-tight">
                {lang === 'ar' ? 'تنبيه أمان صارم - خطأ في الصرف!' : 'Strict Security Guardrail - Dispensing Error!'}
              </h4>
            </div>
            <div className="p-5 space-y-4 text-right">
              <p className="text-xs font-semibold leading-relaxed text-slate-700">
                {errorModalMsg}
              </p>
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setErrorModalMsg(null)}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  {lang === 'ar' ? 'موافق، سأقوم بالتعديل لتجنب التلاعب' : 'Understood, I will correct'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Visit Popup Modal Editor */}
      {isFullEditModalOpen && fullEditVisitId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4.5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Edit3 className="w-5 h-5 shrink-0 animate-pulse text-purple-200" />
                <div>
                  <h4 className="font-bold text-sm tracking-tight text-right">
                    {lang === 'ar' ? 'تعديل بيانات المتابعة بالكامل' : 'Edit Visit Details & FIFO Ledger'}
                  </h4>
                  <p className="text-[10px] text-purple-200 font-medium text-right">
                    {lang === 'ar' ? 'مزامنة تلقائية للمخزن، كلاس الطبيب ومكان العمل' : 'Automated sync of inventory, class level and workplace coordinates'}
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsFullEditModalOpen(false)}
                className="text-white/75 hover:text-white font-bold text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto text-right">
              
              {/* Workplace Name */}
              <div className="space-y-1.5 text-right relative">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'مكان العمل (العيادة/المستشفى)' : 'Workplace Name'}
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none text-right placeholder-slate-400"
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
              </div>

              {/* Class rating */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'كلاس الطبيب (Class Rating)' : 'Doctor Class Rating'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(['A', 'B', 'C'] as const).map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFullEditDocClass(rating)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        fullEditDocClass === rating
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/10'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Class {rating}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of current samples */}
              <div className="space-y-2.5 text-right">
                <label className="text-xs font-bold text-slate-700 border-b border-slate-100 pb-1 block">
                  {lang === 'ar' ? 'العينات والكميات الموزعة في هذه الزيارة:' : 'Distributed Samples & Amounts for this visit:'}
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
                      // In the edit view, the available stock check needs to account for the current visit's existing qty 
                      // which will be added back via rollback during final save. We'll show the actual real-time stock 
                      // up to the exact date, which may be 0 if fully consumed, but it's safe to note that rollback is computed atomically.
                      return (
                        <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between gap-3 flex-wrap">
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
                              className="w-16 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-right font-mono outline-none focus:border-purple-500"
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

              {/* Add New Sample Row helper UI inside popup */}
              <div className="bg-purple-50/40 border border-purple-100/40 p-4.5 rounded-2xl space-y-2.5">
                <div className="text-[11px] font-bold text-purple-950 flex items-center gap-1">
                  <span>✨</span>
                  <span>{lang === 'ar' ? 'صرف وإضافة عينة عينات إضافية جديدة للطبيب' : 'Dispense and Add New Sample Item'}</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 relative">
                  <div className="sm:col-span-2 relative">
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-purple-500 text-right"
                      placeholder={lang === 'ar' ? 'اسم الصنف الدوائي الأساسي...' : 'Search medicine...'}
                      value={fullEditNewSampleName}
                      onChange={(e) => {
                        setFullEditNewSampleName(e.target.value);
                        setFullEditAutocompleteResults(searchAutocomplete('sample', e.target.value));
                        setFullEditSearchFocused(false); 
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
                            className="w-full text-right px-3 py-1.5 text-xs hover:bg-slate-50 text-slate-700 transition-colors"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 items-center">
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
                      className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'صرف' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5 text-right">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'ملاحظات وتفاصيل إضافية عن الزيارة' : 'Visit Notes & Details'}
                </label>
                <textarea
                  className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-3.5 py-2 text-xs outline-none text-right h-16 placeholder-slate-400 resize-none"
                  value={fullEditNotes}
                  placeholder={lang === 'ar' ? 'اكتب ملاحظات اللقاء هنا...' : 'Enter meeting notes...'}
                  onChange={(e) => setFullEditNotes(e.target.value)}
                />
              </div>

              {/* Internal FIFO safeguarding alerts inside edit panel */}
              {fullEditError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3.5 rounded-xl flex items-start gap-2 text-right">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{fullEditError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2.5 px-6 py-4.5 bg-slate-50 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => {
                  setIsFullEditModalOpen(false);
                  setFullEditVisitId(null);
                }}
                className="px-4.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveFullEdit}
                className="px-5.5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'حفظ التغييرات ومزامنة FIFO' : 'Save & Sync FIFO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple temporary icon mapping to replace missing lucide-react instances
function CompanionIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
