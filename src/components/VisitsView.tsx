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
  wipeAllDataComplete,
  saveState
} from '../utils/db';
import { gpsTracker, LocationData, GeolocationError, GeolocationStatus } from '../utils/geolocation';
import { VisitLog, VisitSample, Doctor, Workplace } from '../types';
import { Calendar, Users, MapPin, Package, AlertCircle, Plus, Trash, Check, Compass, Sparkles, Navigation, Edit3, Search, Database, Upload, ArrowLeftRight, Trash2, ArrowUpDown, Lock, Unlock, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import LeafletMap from './LeafletMap';

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
  const [isGpsEnabled, setIsGpsEnabled] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [isFetchingGps, setIsFetchingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

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
  const [mainTab, setMainTab] = useState<'log' | 'migration'>('log');

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

  // Custom Reset & Wipe Confirmation states
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [showWipeSuccess, setShowWipeSuccess] = useState(false);
  const [wipeStats, setWipeStats] = useState<{ visitsCount: number; doctorsCount: number } | null>(null);

  // Custom Delete Visit states
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);

  // Legacy Migration Processor States
  const [legacyJsonInput, setLegacyJsonInput] = useState('');
  const [legacyHtmlInput, setLegacyHtmlInput] = useState('');
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationErrors, setMigrationErrors] = useState<string[]>([]);
  const [migrationSuccessCount, setMigrationSuccessCount] = useState<number | null>(null);

  // -----------------------------------------------------
  // التخزين المؤقت لملفات الاستيراد المحمولة وتأكيدها (جديد)
  // -----------------------------------------------------
  const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);
  const [pendingType, setPendingType] = useState<'doctors' | 'jan' | 'feb' | 'mar' | 'apr' | null>(null);
  const [pendingData, setPendingData] = useState<any[] | null>(null);
  const [pendingFileName, setPendingFileName] = useState('');
  const [pendingMonthName, setPendingMonthName] = useState('');
  const [pendingExpectedMonthStr, setPendingExpectedMonthStr] = useState('');

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

  useEffect(() => {
    triggerGpsAcquisition();
  }, [isGpsEnabled]);

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

  // High Precision Geolocation integration
  const triggerGpsAcquisition = () => {
    setIsFetchingGps(true);
    setGpsError(null);

    if (!isGpsEnabled) {
      setLatitude(null);
      setLongitude(null);
      setIsFetchingGps(false);
      return;
    }

    gpsTracker.startTracking(
      (location: LocationData) => {
        setLatitude(location.latitude);
        setLongitude(location.longitude);
        setGpsError(null);
        // Do not turn off isFetchingGps because it's continuous, or turn it off to indicate first lock.
        // We will turn it off on the first successful lock to indicate readiness.
        setIsFetchingGps(false);
      },
      (error: GeolocationError) => {
        console.warn('High precision tracking error:', error);
        setGpsError(error.message);
        setIsFetchingGps(false);
      },
      (status: GeolocationStatus) => {
        if (status === 'requesting') {
          setIsFetchingGps(true);
        }
      }
    );
  };

  useEffect(() => {
    // Cleanup GPS tracking on unmount
    return () => {
      gpsTracker.stopTracking();
    };
  }, []);

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

    if (isGpsEnabled && (!latitude || !longitude || gpsError)) {
      alert(lang === 'ar' ? 'تحذير: لا يمكن بدء زيارة جديدة بدون تحديد الموقع الجغرافي. يرجى تفعيل الموقع أو قفل التتبع للإستمرار.' : 'Warning: Cannot start a new visit without accurate geolocation. Please enable location services or turn off tracking.');
      return;
    }

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

    // Prepare visit coordinates. If GPS is manually turned off, we store undefined.
    const finalLat = isGpsEnabled ? (latitude || 0) : undefined;
    const finalLng = isGpsEnabled ? (longitude || 0) : undefined;

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
      latitude: (isGpsEnabled && latitude) ? latitude : undefined,
      longitude: (isGpsEnabled && longitude) ? longitude : undefined,
    });
    setShowWorkplaceModal(false);
    reloadDb();
    // Continue submit sequence
    setWorkplaceName(newWork.name);
  };

  // Perform cascade stock deletion
  const handleDeleteVisit = (id: string) => {
    setDeletingVisitId(id);
  };

  const executeDeleteVisit = () => {
    if (!deletingVisitId) return;
    deleteVisitLog(deletingVisitId);
    reloadDb();
    setDeletingVisitId(null);
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
    setShowWipeModal(true);
  };

  const executeWipeAllData = () => {
    try {
      setIsRecalculating(true);
      const res = wipeAllDataComplete();
      
      setWipeStats({
        visitsCount: res.deletedVisitsCount,
        doctorsCount: res.deletedDoctorsCount
      });

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
          ? `🗑️ تم مسح ${res.deletedVisitsCount} زيارة وتصفير ${res.deletedDoctorsCount} طبيباً بالكامل لمطابقة النظام الجديد.` 
          : `🗑️ Successfully wiped ${res.deletedVisitsCount} visits and cleared ${res.deletedDoctorsCount} doctors to match the new system.`
      ]);
      setMigrationErrors([]);
      setMigrationSuccessCount(null);
      setRecalcSummary(null);

      reloadDb();
      setShowWipeModal(false);
      setShowWipeSuccess(true);
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
      if (!latitude || !longitude) {
        alert(lang === 'ar' ? 'لا يوجد إحداثيات مجمعة للتثبيت' : 'No acquired coordinates to pin');
        return;
      }
      const pinLat = latitude;
      const pinLng = longitude;
      wp.latitude = pinLat;
      wp.longitude = pinLng;
      saveState(state);
      reloadDb();
      alert(lang === 'ar' 
        ? `تم بنجاح تثبيت الإحداثيات لـ (${workplaceName}) على خطوط: ${pinLat.toFixed(7)}, ${pinLng.toFixed(7)}`
        : `Successfully pinned location for (${workplaceName}) at: ${pinLat.toFixed(7)}, ${pinLng.toFixed(7)}`
      );
    } else {
      if (!latitude || !longitude) return;
      const pinLat = latitude;
      const pinLng = longitude;
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
          } else if (decoded && typeof decoded === 'object') {
            if (Array.isArray(decoded.doctors)) {
              resolve(decoded.doctors);
            } else if (Array.isArray(decoded.visits)) {
              resolve(decoded.visits);
            } else if (Array.isArray(decoded.data)) {
              resolve(decoded.data);
            } else {
              // Try to find any property that contains an array
              const keys = Object.keys(decoded);
              const arrayKey = keys.find(k => Array.isArray(decoded[k]));
              if (arrayKey) {
                resolve(decoded[arrayKey]);
              } else {
                reject(new Error(lang === 'ar' ? 'الملف لا يحتوي على مصفوفة صالحة للأطباء أو الزيارات' : 'The file does not contain a valid array of doctors or visits'));
              }
            }
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
      setPendingType('doctors');
      setPendingData(data);
      setPendingFileName(file.name);
      setPendingMonthName('');
      setPendingExpectedMonthStr('');
      setShowMigrationConfirm(true);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessingState(false);
      if (e.target) e.target.value = ''; // Reset file input
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
        const d = item.visit_date || item.date;
        if (!d) return true;
        return !d.startsWith(expectedMonthStr);
      });
      
      if (invalidVisits.length > 0) {
        throw new Error(lang === 'ar' 
          ? `عذراً، يحتوي هذا الملف على زيارات خارج النطاق لشهر ${monthName} (المتوقع: ${expectedMonthStr})` 
          : `Invalid dataset: some records in this file do not belong to ${monthName} (expected format: ${expectedMonthStr})`
        );
      }

      setPendingType(expectedMonthStr === '2026-01' ? 'jan' : expectedMonthStr === '2026-02' ? 'feb' : expectedMonthStr === '2026-03' ? 'mar' : 'apr');
      setPendingData(data);
      setPendingFileName(file.name);
      setPendingMonthName(monthName);
      setPendingExpectedMonthStr(expectedMonthStr);
      setShowMigrationConfirm(true);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessingState(false);
      if (e.target) e.target.value = ''; // Reset file input
    }
  };

  // معالج استيراد الملف بعد موافقة المندوب في البوكس التنبيهي (جديد)
  const executePendingMigration = () => {
    if (!pendingType || !pendingData) return;

    setIsProcessingState(true);
    try {
      if (pendingType === 'doctors') {
        migrateDoctorsFromLegacyJson(pendingData);
        setDoctorsFileName(pendingFileName);
        setMigrationLogs(prev => [
          ...prev,
          `${lang === 'ar' ? '✅ تم ترحيل ملف الأطباء بنجاح وبوضع المواقع الجغرافية كـ NULL:' : '✅ Successfully processed doctor file migration:'} ${pendingFileName} (${pendingData.length} records)`
        ]);
        setMigrationErrors([]);
        setMigrationSuccessCount(pendingData.length);
        reloadDb();
        alert(lang === 'ar' ? '✔ تم استيراد وترحيل قائمة الأطباء بنجاح!' : '✔ Successfully imported doctors directory!');
      } else {
        const result = migrateHistoricalVisitsAndDeductStock(pendingData);
        
        if (pendingExpectedMonthStr === '2026-01') setJanFileName(pendingFileName);
        else if (pendingExpectedMonthStr === '2026-02') setFebFileName(pendingFileName);
        else if (pendingExpectedMonthStr === '2026-03') setMarFileName(pendingFileName);
        else if (pendingExpectedMonthStr === '2026-04') setAprFileName(pendingFileName);

        setMigrationLogs(prev => [
          ...prev,
          `${lang === 'ar' ? `✔ تم ترحيل زيارات شهر ${pendingMonthName} بنظام الـ FIFO الرجعي المجدول :` : `✔ Scheduled retroactive FIFO deduction completed for ${pendingMonthName}:`} ${pendingFileName} (${result.successCount} succeeded, ${result.errors.length} alarms)`
        ]);
        setMigrationErrors(result.errors);
        setMigrationSuccessCount(result.successCount);
        reloadDb();
        alert(lang === 'ar' 
          ? `✔ تم استيراد وخصم زيارات صنف شهر ${pendingMonthName} بنظام الـ FIFO الرجعي المجدول!` 
          : `✔ Successfully ledgered and computed FIFO deductions for ${pendingMonthName} bucket!`
        );
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsProcessingState(false);
      setShowMigrationConfirm(false);
      setPendingType(null);
      setPendingData(null);
      setPendingFileName('');
      setPendingMonthName('');
      setPendingExpectedMonthStr('');
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
      <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl max-w-xl w-full border border-slate-200 gap-1">
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
          {/* GPS Telemetry Controls */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl transition-colors ${isGpsEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-400'}`}>
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  {lang === 'ar' ? 'تتبع الموقع الجغرافي (GPS)' : 'Location Tracking (GPS)'}
                </h4>
                <p className="text-xs text-slate-500">
                  {lang === 'ar' ? 'توثيق الإحداثيات الحية للزيارة الميدانية' : 'Attach live coordinates to audit visit'}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsGpsEnabled(!isGpsEnabled)}
              dir="ltr"
              className={`relative cursor-pointer flex items-center rounded-full p-1 transition-colors duration-300 w-12 h-7 focus:outline-none shrink-0 ${
                isGpsEnabled ? 'bg-green-500 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <span className="h-5 w-5 rounded-full bg-white shadow-sm transition-transform" />
            </button>
          </div>

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

              {gpsError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm flex items-start gap-3 mt-4">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{lang === 'ar' ? 'خطأ في الموقع:' : 'Location Error:'}</span> {gpsError}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmitVisit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600">{t.vDate}</label>
                    <input
                      type="date"
                      required
                      className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-base min-h-[44px] outline-none transition-all font-mono"
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
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-base min-h-[44px] outline-none transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-base min-h-[44px] outline-none transition-all"
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
                        className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-base min-h-[44px] outline-none transition-all"
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
                            Lat: <strong className="text-slate-800">{latitude?.toFixed(7) || '---'}</strong>, 
                            Lng: <strong className="text-slate-800">{longitude?.toFixed(7) || '---'}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
                              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-base min-h-[44px] outline-none focus:border-purple-500 font-medium"
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
                              className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-base min-h-[44px] outline-none focus:border-purple-500 font-mono"
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
                    className="w-full bg-slate-50 border border-slate-200 focus:border-purple-500 focus:bg-white rounded-xl px-4 py-3 text-base outline-none h-24 transition-all resize-none"
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
            </div>
          </div>
        </>
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
                        disabled={isProcessingState}
                        onClick={() => doctorsFileRef.current?.click()}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-500/10"
                      >
                        {isProcessingState ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {lang === 'ar' ? 'جاري قراءة وتحميل الملف...' : 'Reading & Uploading...'}
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 text-purple-200" />
                            {lang === 'ar' ? 'استيراد قائمة الأطباء المحلية (JSON)' : 'Import Local Doctor List (JSON)'}
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
                            {/* Open File dialog button */}
                            <button
                              type="button"
                              disabled={!m.isUnlocked}
                              onClick={() => m.ref.current?.click()}
                              className={`px-3 py-1.5 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                !m.isUnlocked 
                                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm shadow-indigo-500/10'
                              }`}
                            >
                              <Upload className="w-3.5 h-3.5" />
                              {m.fileName !== (lang === 'ar' ? 'لم يتم اختيار ملف' : 'No file chosen') 
                                ? m.fileName 
                                : lang === 'ar' ? 'استيراد ملف JSON' : 'Import JSON file'}
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

      {/* Custom FULL WIPE Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-red-100 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5 text-red-600">
              <div className="p-3 bg-red-50 rounded-xl">
                <Trash2 className="w-7 h-7 text-red-600 font-bold" />
              </div>
              <div className="text-right">
                <h4 className="font-extrabold text-slate-950 text-base">
                  {lang === 'ar' ? 'تصفير بيانات التطبيق بالكامل؟' : 'Completely Reset Application Data?'}
                </h4>
                <p className="text-[10px] text-red-600 font-semibold mt-0.5">
                  {lang === 'ar' ? 'هذا الإجراء خطير ولا يمكن التراجع عنه' : 'This action is dangerous and irreversible'}
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-right font-sans">
              <p className="text-xs text-slate-600 leading-relaxed">
                {lang === 'ar' 
                  ? 'سيقوم هذا النظام بتنفيذ عملية مسح شاملة وتطهير للذاكرة لاسترجاع الوضع الأصلي للتطبيق وتعديل كافة الاختناقات الحسابية:'
                  : 'This process will execute a comprehensive memory purge to restore the original application state and resolve calculation offsets:'}
              </p>

              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100/50 space-y-2.5 text-xs text-slate-800">
                <div className="flex items-start gap-2.5 justify-start">
                  <span className="text-red-500 font-bold mt-0.5">●</span>
                  <span>
                    {lang === 'ar' 
                      ? 'حذف كافة الزيارات والمتابعات المسجلة والمستوردة بشكل نهائي.' 
                      : 'Permanently delete all registered and imported doctor visit logs.'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5 justify-start">
                  <span className="text-red-500 font-bold mt-0.5">●</span>
                  <span>
                    {lang === 'ar' 
                      ? 'مسح كامل لقائمة الأطباء والجهات وخطط الدورات المجدولة.' 
                      : 'Completely clear the doctors list, workplaces, and planned cycle plans.'}
                  </span>
                </div>
                <div className="flex items-start gap-2.5 justify-start">
                  <span className="text-red-500 font-bold mt-0.5">●</span>
                  <span>
                    {lang === 'ar' 
                      ? 'استعادة كميات العينات بالمستودع لتطابق الصادر الفعلي بالفواتير 100% دون أي خصومات.' 
                      : 'Restore warehouse sample quantities to match original spent invoices 100% without any deductions.'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWipeModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeWipeAllData}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/10 transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
              >
                {lang === 'ar' ? 'تأكيد تصفيف وتطهير الذاكرة' : 'Confirm Wipe & Reset'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe/Reset Success Modal */}
      {showWipeSuccess && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-emerald-100 space-y-5 shadow-2xl relative animate-in fade-in duration-200">
            <div className="flex flex-col items-center justify-center text-center space-y-3 pt-3">
              <div className="p-3.5 bg-emerald-50 rounded-full text-emerald-600">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
              <h4 className="font-extrabold text-slate-950 text-base">
                {lang === 'ar' ? 'تم تصفير التطبيق بنجاح!' : 'Application Reset Successfully!'}
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
                {lang === 'ar' 
                  ? 'تم بنجاح حذف الزيارات السابقة، ومسح قائمة الأطباء بالكامل، وتصفير العينات المخصومة لتطابق الفواتير بنسبة 100%.' 
                  : 'Successfully deleted previous visits, cleared entire doctors list, and restored sample stocks back to match entered invoices 100%.'}
              </p>
            </div>

            {wipeStats && (
              <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100/50 space-y-2 text-xs text-slate-700 font-mono text-center">
                <div>{lang === 'ar' ? `🗑️ الزيارات المحذوفة: ${wipeStats.visitsCount}` : `🗑️ Deleted Visits: ${wipeStats.visitsCount}`}</div>
                <div>{lang === 'ar' ? `🗑️ الأطباء المحذوفون: ${wipeStats.doctorsCount}` : `🗑️ Cleared Doctors: ${wipeStats.doctorsCount}`}</div>
                <div className="text-[10px] text-emerald-700 font-bold mt-1.5">{lang === 'ar' ? '📦 تم استرجاع المخزون الفعلي بنسبة 100%' : '📦 100% actual stock ledger restored'}</div>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setShowWipeSuccess(false);
                window.location.reload();
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/10 text-center"
            >
              {lang === 'ar' ? 'إلى القائمة الرئيسية' : 'To Main Dashboard'}
            </button>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deletingVisitId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 border border-red-50 space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-950 text-sm">
                {lang === 'ar' ? 'حذف الزيارة وإرجاع المخزون؟' : 'Delete Visit & Restore Stock?'}
              </h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed text-right font-sans">
              {lang === 'ar' 
                ? 'هل أنت متأكد من رغبتك في حذف هذه المتابعة نهائياً؟ سيتم تلقائياً إرجاع الكميات المخصومة من العينات إلى المخزون الأصلي بنظام FIFO.' 
                : 'Are you sure you want to permanently delete this visit log? Deducted sample quantities will be rolled back into the warehouse inventory using FIFO.'}
            </p>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDeletingVisitId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executeDeleteVisit}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer text-center"
              >
                {lang === 'ar' ? 'تأكيد الحذف والرجوع' : 'Confirm Delete'}
              </button>
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

      {/* -----------------------------------------------------
          بوكس تأكيد استيراد الملف التنبيهي المنبثق (جديد)
          ----------------------------------------------------- */}
      {showMigrationConfirm && pendingType && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-100 overflow-hidden shadow-2xl p-6 space-y-4 text-right">
            <div className="flex items-center gap-3 justify-end text-purple-600">
              <h4 className="font-extrabold text-slate-950 text-base">
                {lang === 'ar' ? 'تأكيد استيراد ملف البيانات 📤' : 'Confirm File Import 📤'}
              </h4>
              <div className="p-2 bg-purple-50 rounded-xl">
                <Upload className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed font-semibold text-right" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <p>
                {lang === 'ar' 
                  ? `هل أنت متأكد من استيراد هذا الملف؟ ${pendingFileName}` 
                  : `Are you sure you want to import this file? ${pendingFileName}`}
              </p>
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl font-mono text-slate-800 break-all text-center">
                📁 {pendingFileName}
              </div>
              {pendingMonthName && (
                <p className="text-amber-800 text-[10px] bg-amber-50 border border-amber-100 p-2 rounded-lg mt-1 text-right">
                  ⚠️ {lang === 'ar' 
                    ? `سيتم تطبيق خصم العينات التراكمية لشهر ${pendingMonthName} من فواتير الـ FIFO بالترتيب.` 
                    : `This will apply cumulative sample deductions for ${pendingMonthName} from FIFO invoices sequentially.`}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowMigrationConfirm(false);
                  setPendingType(null);
                  setPendingData(null);
                  setPendingFileName('');
                  setPendingMonthName('');
                  setPendingExpectedMonthStr('');
                }}
                className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer"
              >
                {lang === 'ar' ? 'تراجع وإلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={executePendingMigration}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
              >
                {lang === 'ar' ? 'نعم، استورد البيانات' : 'Yes, Import Data'}
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
