/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice, InvoiceItem, Doctor, Workplace, VisitLog, WeeklyCycle, VirtualFile, VisitSample } from '../types';

// Constants
const DB_VERSION = '1.1';
const STORAGE_PREFIX = 'medrep_db_';

// Guaranteed One-time Purge on Load to make it 100% Fresh without entered data
if (!localStorage.getItem('medrep_fresh_boot_v3')) {
  localStorage.setItem('medrep_fresh_boot_v3', 'true');
  localStorage.removeItem(`${STORAGE_PREFIX}state`);
  localStorage.removeItem('medrep_representative_name');
  localStorage.removeItem('medrep_representative_grade');
  localStorage.removeItem('corporate_logo');
}

interface DatabaseState {
  version: string;
  invoices: Invoice[];
  doctors: Doctor[];
  workplaces: Workplace[];
  visits: VisitLog[];
  weeklyCycles: WeeklyCycle[];
  files: VirtualFile[];
  settings: {
    serverUrl: string;
    apiKey: string;
    language: 'ar' | 'en';
  };
}

// Seed Data (Cleared to start fresh and empty)
const SEED_DOCTORS: Doctor[] = [];

const SEED_WORKPLACES: Workplace[] = [];

const SEED_INVOICES: Invoice[] = [];

const SEED_VISITS: VisitLog[] = [];

const SEED_WEEKLY_PLAN: WeeklyCycle[] = [];

const SEED_FILES: VirtualFile[] = [];

export function getInitialState(): DatabaseState {
  const stored = localStorage.getItem(`${STORAGE_PREFIX}state`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.version === DB_VERSION) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing stored state, resetting with empty data', e);
    }
  }

  // Set default empty initial state
  const state: DatabaseState = {
    version: DB_VERSION,
    invoices: SEED_INVOICES,
    doctors: SEED_DOCTORS,
    workplaces: SEED_WORKPLACES,
    visits: SEED_VISITS,
    weeklyCycles: SEED_WEEKLY_PLAN,
    files: SEED_FILES,
    settings: {
      serverUrl: 'https://ais-dev-si6uixl2yb6tgxnqbihxge-5901476095.europe-west1.run.app/api',
      apiKey: 'MY_GEMINI_API_KEY',
      language: 'ar',
    },
  };
  saveState(state);
  return state;
}

export function saveState(state: DatabaseState) {
  localStorage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify(state));
}

// -----------------------------------------------------
// DATABASE ACTIONS
// -----------------------------------------------------

/**
 * Adds an invoice and updates current quantities of all items
 */
export function addInvoice(invoice: Omit<Invoice, 'id'>): Invoice {
  const state = getInitialState();
  const newInvoice: Invoice = {
    ...invoice,
    id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
  };

  // Assign IDs to invoice items
  newInvoice.items = newInvoice.items.map((item, idx) => ({
    ...item,
    id: `item-${Date.now()}-${idx}`,
    invoiceId: newInvoice.id,
    currentQuantity: item.initialQuantity, // initialized
  }));

  state.invoices.push(newInvoice);
  saveState(state);
  return newInvoice;
}

/**
 * Autocomplete matching function supporting minimum typing check
 */
export function searchAutocomplete(type: 'sample' | 'doctor' | 'workplace', query: string): string[] {
  if (query.trim().length < 3) return [];
  const state = getInitialState();
  const q = query.toLowerCase();

  if (type === 'sample') {
    // Collect all unique sample names across invoices
    const sampleNames = new Set<string>();
    state.invoices.forEach((inv) => inv.items.forEach((item) => sampleNames.add(item.sampleName)));
    return Array.from(sampleNames).filter((name) => name.toLowerCase().includes(q));
  } else if (type === 'doctor') {
    return state.doctors
      .map((d) => d.name)
      .filter((name) => name.toLowerCase().includes(q));
  } else if (type === 'workplace') {
    return state.workplaces
      .map((w) => w.name)
      .filter((name) => name.toLowerCase().includes(q));
  }
  return [];
}

/**
 * Adds a new autocomplete entry if missing
 */
export function registerNewEntity(type: 'doctor' | 'workplace', name: string, extra?: any): any {
  const state = getInitialState();
  const id = `${type === 'doctor' ? 'doc' : 'work'}-${Date.now()}`;

  if (type === 'doctor') {
    const newDoc: Doctor = {
      id,
      name,
      speciality: extra?.speciality || 'طب عام (General Medicine)',
      classRating: extra?.classRating || 'B',
    };
    state.doctors.push(newDoc);
    saveState(state);
    return newDoc;
  } else {
    // Riyadh central coordinates default
    const newWorkplace: Workplace = {
      id,
      name,
      latitude: extra?.latitude || 24.7136 + (Math.random() - 0.5) * 0.05,
      longitude: extra?.longitude || 46.6753 + (Math.random() - 0.5) * 0.05,
    };
    state.workplaces.push(newWorkplace);
    saveState(state);
    return newWorkplace;
  }
}

/**
 * Get available real-time aggregated FIFO stock
 */
export function getSampleStockBalance(sampleName: string): number {
  const state = getInitialState();
  let total = 0;
  state.invoices.forEach((invoice) => {
    invoice.items.forEach((item) => {
      if (item.sampleName.trim().toLowerCase() === sampleName.trim().toLowerCase()) {
        total += item.currentQuantity;
      }
    });
  });
  return total;
}

/**
 * Get available real-time stock bounded by visit date (invoice_date <= visit_date)
 */
export function getSampleStockBalanceForDate(sampleName: string, visitDate: string): number {
  const state = getInitialState();
  let total = 0;
  const vTime = new Date(visitDate).getTime();
  state.invoices.forEach((invoice) => {
    const invTime = new Date(invoice.invoiceDate).getTime();
    if (invTime <= vTime) {
      invoice.items.forEach((item) => {
        if (item.sampleName.trim().toLowerCase() === sampleName.trim().toLowerCase()) {
          total += item.currentQuantity;
        }
      });
    }
  });
  return total;
}

/**
 * Chronological FIFO Deduction logic restricted by visit date
 */
export function deductFifoStock(sampleName: string, quantity: number, visitDate?: string): { invoiceItemId: string; quantityDeducted: number }[] {
  const state = getInitialState();
  const nameNorm = sampleName.trim().toLowerCase();

  // Find all matching active invoice items with stock on or before visit date
  let items: { parentDate: string; item: InvoiceItem; parentIndex: number; itemIndex: number }[] = [];
  const vTime = visitDate ? new Date(visitDate).getTime() : Infinity;

  state.invoices.forEach((inv, pIdx) => {
    const invTime = new Date(inv.invoiceDate).getTime();
    if (invTime <= vTime) {
      inv.items.forEach((it, iIdx) => {
        if (it.sampleName.trim().toLowerCase() === nameNorm && it.currentQuantity > 0) {
          items.push({
            parentDate: inv.invoiceDate,
            item: it,
            parentIndex: pIdx,
            itemIndex: iIdx,
          });
        }
      });
    }
  });

  // Sort Chronologically (Oldest first) by Invoice Date
  items.sort((a, b) => new Date(a.parentDate).getTime() - new Date(b.parentDate).getTime());

  let remaining = quantity;
  const deductions: { invoiceItemId: string; quantityDeducted: number }[] = [];

  for (const entry of items) {
    if (remaining <= 0) break;

    const avail = entry.item.currentQuantity;
    if (avail >= remaining) {
      // Deduct all from this invoice
      state.invoices[entry.parentIndex].items[entry.itemIndex].currentQuantity -= remaining;
      deductions.push({
        invoiceItemId: entry.item.id,
        quantityDeducted: remaining,
      });
      remaining = 0;
    } else {
      // Empty this invoice item and move on
      state.invoices[entry.parentIndex].items[entry.itemIndex].currentQuantity = 0;
      deductions.push({
        invoiceItemId: entry.item.id,
        quantityDeducted: avail,
      });
      remaining -= avail;
    }
  }

  saveState(state);
  return deductions;
}

/**
 * Saves a visit log and completes FIFO deductions internally with zero-quantity pass-through
 */
export function addVisitLog(visit: Omit<VisitLog, 'id'>): VisitLog {
  const state = getInitialState();
  const id = `visit-${Date.now()}`;

  // Process FIFO stock deductions
  const processedSamples: VisitSample[] = visit.samples.map((sample) => {
    // RULE: ZERO-DEDUCTION PASS-THROUGH
    const deductions = sample.quantityDistributed === 0
      ? []
      : deductFifoStock(sample.sampleName, sample.quantityDistributed, visit.visitDate);
    return {
      sampleName: sample.sampleName,
      quantityDistributed: sample.quantityDistributed,
      deductions,
    };
  });

  const finalVisit: VisitLog = {
    ...visit,
    id,
    samples: processedSamples,
  };

  state.visits.push(finalVisit);
  saveState(state);
  return finalVisit;
}

/**
 * Deletes a visit and initiates Cascade Stock Rollback!
 */
export function deleteVisitLog(visitId: string) {
  const state = getInitialState();
  const visitIndex = state.visits.findIndex((v) => v.id === visitId);
  if (visitIndex === -1) return;

  const visit = state.visits[visitIndex];

  // Rollback all deductions
  visit.samples.forEach((sample) => {
    sample.deductions.forEach((ded) => {
      // Search for the specific invoice item
      state.invoices.forEach((inv, pIdx) => {
        inv.items.forEach((it, iIdx) => {
          if (it.id === ded.invoiceItemId) {
            state.invoices[pIdx].items[iIdx].currentQuantity += ded.quantityDeducted;
          }
        });
      });
    });
  });

  // Remove the visit log
  state.visits.splice(visitIndex, 1);
  saveState(state);
}

/**
 * Gets historical info regarding a selected doctor
 */
export function getDoctorLastVisitInfo(doctorName: string): { lastDate: string; samples: { name: string; qty: number }[] } | null {
  const state = getInitialState();
  const doctorVisits = state.visits
    .filter((v) => v.doctorName && v.doctorName.trim() === doctorName.trim())
    .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());

  if (doctorVisits.length === 0) return null;

  const latestVisit = doctorVisits[0];
  const list = latestVisit.samples.map((s) => ({
    name: s.sampleName,
    qty: s.quantityDistributed,
  }));

  return {
    lastDate: latestVisit.visitDate,
    samples: list,
  };
}

// -----------------------------------------------------
// FILE SYSTEM SIMULATOR ENGINE
// -----------------------------------------------------

export function saveVirtualFile(file: VirtualFile) {
  const state = getInitialState();
  // Filter out duplicate if existing
  state.files = state.files.filter((f) => !(f.name === file.name && f.folder === file.folder));
  state.files.push(file);
  saveState(state);
}

export function getVirtualFiles(folder: 'BACKUP' | 'DOWNLOAD'): VirtualFile[] {
  const state = getInitialState();
  return state.files.filter((f) => f.folder === folder);
}

export function deleteVirtualFile(name: string, folder: 'BACKUP' | 'DOWNLOAD') {
  const state = getInitialState();
  state.files = state.files.filter((f) => !(f.name === name && f.folder === folder));
  saveState(state);
}

// -----------------------------------------------------
// GEOGRAPHICAL DISTANCE UTILITY
// -----------------------------------------------------
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // meters
}

// -----------------------------------------------------
// SMART SECURITY GUARDRAILS METRICS
// -----------------------------------------------------
export interface GuardrailAlarm {
  id: string;
  type: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  severity: 'red' | 'yellow';
}

export function evaluateGuardrailAlarms(): GuardrailAlarm[] {
  const state = getInitialState();
  const alarms: GuardrailAlarm[] = [];

  // 1. Geofencing Breach (>100 meters)
  state.visits.forEach((v) => {
    if (v.latitude && v.longitude && v.workplaceLatitude && v.workplaceLongitude) {
      const dist = calculateDistance(v.latitude, v.longitude, v.workplaceLatitude, v.workplaceLongitude);
      if (dist > 100) {
        alarms.push({
          id: `geofence-${v.id}`,
          type: 'Geofencing Breach',
          titleAr: '🚨 خرق جيو-جغرافي (Geofencing Breach)',
          titleEn: '🚨 Geofencing Breach',
          descriptionAr: `الزيارة للطبيب ${v.doctorName || 'عميل'} في مكان ${v.workplaceName} تبعد أكثر من ${Math.round(dist)}م عن الإحداثيات المسجلة.`,
          descriptionEn: `Visit to ${v.doctorName || 'Client'} at ${v.workplaceName} is recorded ${Math.round(dist)}m away from coordinates.`,
          severity: 'red',
        });
      }
    }
  });

  // 2. Ghost/Speed Call (< 2 minutes between check-in and check-out)
  state.visits.forEach((v) => {
    const inTime = new Date(v.checkInTime).getTime();
    const outTime = new Date(v.checkOutTime).getTime();
    const durationMins = (outTime - inTime) / 1000 / 60;
    if (durationMins < 2) {
      alarms.push({
        id: `speed-${v.id}`,
        type: 'Ghost Call',
        titleAr: '🚨 زيارة وهمية / سريعة (Ghost/Speed Call)',
        titleEn: '🚨 Ghost/Speed Call',
        descriptionAr: `الزيارة الموثقة للطبيب ${v.doctorName || 'عميل'} انتهت خلال أقل من دقيقتين (${durationMins.toFixed(1)} دقيقة).`,
        descriptionEn: `Visit with ${v.doctorName || 'Client'} completed in under 2 minutes (${durationMins.toFixed(1)} mins).`,
        severity: 'red',
      });
    }
  });

  // 3. Late Start/Early End (No morning activity by 10:00 AM or evening by 5:00 PM; or early close before 11:30 AM / 7:00 PM)
  // Let's analyze activity per date
  const visitsByDate: { [date: string]: VisitLog[] } = {};
  state.visits.forEach((v) => {
    const d = v.visitDate;
    if (!visitsByDate[d]) visitsByDate[d] = [];
    visitsByDate[d].push(v);
  });

  Object.entries(visitsByDate).forEach(([date, list]) => {
    // Sort times
    const sorted = [...list].sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
    const firstVisit = sorted[0];
    const lastVisit = sorted[sorted.length - 1];

    const firstCheckIn = new Date(firstVisit.checkInTime);
    const lastCheckOut = new Date(lastVisit.checkOutTime);

    const firstHour = firstCheckIn.getHours() + firstCheckIn.getMinutes() / 60;
    const lastHour = lastCheckOut.getHours() + lastCheckOut.getMinutes() / 60;

    // Late morning start check (e.g., started afternoon or after 10 AM, and it is a morning shift day)
    if (firstHour > 10.0) {
      alarms.push({
        id: `late-start-${date}`,
        type: 'Late Start',
        titleAr: '🚨 بدء متأخر للنوبة الصباحية (Late Start)',
        titleEn: '🚨 Late Start Alert',
        descriptionAr: `التاريخ ${date}: تم تسجيل الزيارة الأولى بعد الساعة 10:00 صباحاً (الساعة ${firstCheckIn.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}).`,
        descriptionEn: `Date ${date}: First visit recorded after 10:00 AM (at ${firstCheckIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}).`,
        severity: 'red',
      });
    }

    // Early morning close check (if morning closed before 11:30 AM)
    // For simplicity, if we see action ending before 11:30 AM and nothing in evening
    if (lastHour < 11.5 && list.length < 3) {
      alarms.push({
        id: `early-close-${date}`,
        type: 'Early End',
        titleAr: '🚨 إنهاء مبكر للعمل الميداني (Early End)',
        titleEn: '🚨 Early End Alert',
        descriptionAr: `التاريخ ${date}: انتهى آخر نشاط ميداني موثق مبكراً في تمام الساعة ${lastCheckOut.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}.`,
        descriptionEn: `Date ${date}: Active field operations ended early at ${lastCheckOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.`,
        severity: 'red',
      });
    }
  });

  // 4. Inactivity Alert (Gap of >1.5-2 hours between consecutive visits in the same day)
  Object.entries(visitsByDate).forEach(([date, list]) => {
    const sorted = [...list].sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      const endPrev = new Date(sorted[i].checkOutTime).getTime();
      const startNext = new Date(sorted[i + 1].checkInTime).getTime();
      const gapMins = (startNext - endPrev) / 1000 / 60;
      if (gapMins > 110) { // ~1.8 hours
        alarms.push({
          id: `inactivity-${date}-${i}`,
          type: 'Inactivity Alert',
          titleAr: '🚨 فجوة حمولة خمول ميداني (Inactivity Alert)',
          titleEn: '🚨 Inactivity Alert',
          descriptionAr: `التاريخ ${date}: فجوة خمول ميداني مدتها ${(gapMins / 60).toFixed(1)} ساعة بين زيارة ${sorted[i].doctorName || 'العميل'} والزيارة التي تليها.`,
          descriptionEn: `Date ${date}: Long field gap of ${(gapMins / 60).toFixed(1)} hours detected between visits.`,
          severity: 'red',
        });
      }
    }
  });

  // 5. Class A Neglect (No visits for >14 days for Class A doctors)
  const classADoctors = state.doctors.filter((d) => d.classRating === 'A');
  const now = new Date('2026-06-02T21:48:19Z').getTime(); // Current mock time anchor
  
  classADoctors.forEach((doc) => {
    const docVisits = state.visits.filter((v) => v.doctorName && v.doctorName.trim() === doc.name.trim());
    if (docVisits.length === 0) {
      alarms.push({
        id: `neglect-${doc.id}`,
        type: 'Class A Neglect',
        titleAr: '🚨 إهمال طبيب فئة (أ) (Class A Neglect)',
        titleEn: '🚨 Class A Neglect Warning',
        descriptionAr: `الطبيب ذو الفئة (أ) ${doc.name} لم يتم تسجيل أي زيارة له حتى الآن!`,
        descriptionEn: `Class A Physician ${doc.name} has never been visited!`,
        severity: 'red',
      });
    } else {
      const sortedVisits = docVisits.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
      const lastVisitTime = new Date(sortedVisits[0].visitDate).getTime();
      const diffDays = (now - lastVisitTime) / (1000 * 60 * 60 * 24);
      if (diffDays > 14) {
        alarms.push({
          id: `neglect-time-${doc.id}`,
          type: 'Class A Neglect',
          titleAr: '🚨 إهمال طبيب فئة (أ) تجاوز الوقت (Class A Neglect)',
          titleEn: '🚨 Class A Neglect Alert',
          descriptionAr: `مرَّ ${Math.floor(diffDays)} يوماً على آخر زيارة للطبيب المتميز فئة أ: ${doc.name} (المعدل الآمن 14 يوماً).`,
          descriptionEn: `Over ${Math.floor(diffDays)} days since last visit with Class A doc: ${doc.name} (safe threshold: 14 days).`,
          severity: 'red',
        });
      }
    }
  });

  // 6. Over-visiting Warning (> 4 times a week to the same client)
  const visitsByDoc: { [doc: string]: number } = {};
  state.visits.forEach((v) => {
    if (v.doctorName) {
      visitsByDoc[v.doctorName] = (visitsByDoc[v.doctorName] || 0) + 1;
    }
  });
  Object.entries(visitsByDoc).forEach(([docName, count]) => {
    if (count > 4) {
      alarms.push({
        id: `over-visit-${docName}`,
        type: 'Over-visiting',
        titleAr: '🚨 إفراط في تكرار الزيارات (Over-visiting)',
        titleEn: '🚨 Excessive Client Visits',
        descriptionAr: `تمت زيارة العميل ${docName} بشكل مكثف (${count} مرات في الأسبوع) مما يمثل إسرافاً في عينات التشجيع والموارد.`,
        descriptionEn: `Client ${docName} visited excessively (${count} times this cycle) causing inefficient sample allocation.`,
        severity: 'red',
      });
    }
  });

  // 7. Route Deviation (> 30% unplanned visits)
  const unplannedVisits = state.visits.filter((v) => v.isUnplanned);
  const routeCompliancePct = state.visits.length > 0 ? ((state.visits.length - unplannedVisits.length) / state.visits.length) * 100 : 100;
  if (routeCompliancePct < 70) {
    alarms.push({
      id: 'route-deviation-alarm',
      type: 'Route Deviation',
      titleAr: '🚨 انحراف مفرط عن خط سير الدورة المعتمدة',
      titleEn: '🚨 High Route Deviation',
      descriptionAr: `مستوى الامتثال لخط السير منخفض (${routeCompliancePct.toFixed(1)}%)، مع تخطي أكثر من 30% من الزيارات غير المخططة.`,
      descriptionEn: `Route Compliance is low (${routeCompliancePct.toFixed(1)}%), exceeding 30% unplanned tracks.`,
      severity: 'red',
    });
  }

  return alarms;
}

/**
 * Truncates and resets the local storage database state fully (Zero-State Database Purge)
 */
export function purgeDatabase() {
  const emptyState: DatabaseState = {
    version: DB_VERSION,
    invoices: [],
    doctors: [],
    workplaces: [],
    visits: [],
    weeklyCycles: [],
    files: [],
    settings: {
      serverUrl: 'https://ais-dev-si6uixl2yb6tgxnqbihxge-5901476095.europe-west1.run.app/api',
      apiKey: 'MY_GEMINI_API_KEY',
      language: 'ar',
    },
  };
  saveState(emptyState);
  
  // Clear other profile and configuration states
  localStorage.removeItem('medrep_representative_name');
  localStorage.removeItem('medrep_representative_grade');
  localStorage.removeItem('corporate_logo');
}

/**
 * Dynamic Editing Pipeline: Atomic rollback, validation and reallocation of visit sample quantity
 */
export function updateVisitSampleStrictFIFO(
  visitId: string,
  sampleName: string,
  newQuantity: number,
  visitDate: string
): void {
  const state = getInitialState();
  const visitIndex = state.visits.findIndex((v) => v.id === visitId);
  if (visitIndex === -1) {
    throw new Error('Visit not found');
  }

  const visit = state.visits[visitIndex];
  const sampleIndex = visit.samples.findIndex(
    (s) => s.sampleName.trim().toLowerCase() === sampleName.trim().toLowerCase()
  );

  // 1. ROLLBACK: Re-add old deductions back to active stock
  if (sampleIndex !== -1) {
    const oldSample = visit.samples[sampleIndex];
    oldSample.deductions.forEach((ded) => {
      state.invoices.forEach((inv, pIdx) => {
        inv.items.forEach((it, iIdx) => {
          if (it.id === ded.invoiceItemId) {
            state.invoices[pIdx].items[iIdx].currentQuantity += ded.quantityDeducted;
          }
        });
      });
    });
    // Remove the sample from the visit samples temporarily
    visit.samples.splice(sampleIndex, 1);
  }

  // Save temporary progress so state queries reflect rolled-back stock
  saveState(state);

  // 2. RE-VALIDATE: check date-bounded stock after rollback returns
  const availableStock = getSampleStockBalanceForDate(sampleName, visitDate);
  if (newQuantity > availableStock) {
    throw new Error(`CONSTRAINTS_VIOLATION: الكمية المطلوبة تتجاوز المخزون المقيد بالتاريخ! المتاح هو ${availableStock}`);
  }

  // 3. RE-ALLOCATE: re-run FIFO queue if quantity > 0
  let deductions: { invoiceItemId: string; quantityDeducted: number }[] = [];
  if (newQuantity > 0) {
    deductions = deductFifoStock(sampleName, newQuantity, visitDate);
  }

  // Reload current state (as deductFifoStock has modified and saved invoice records)
  const finalState = getInitialState();
  const finalVisit = finalState.visits.find((v) => v.id === visitId);
  if (finalVisit) {
    finalVisit.samples.push({
      sampleName,
      quantityDistributed: newQuantity,
      deductions,
    });
    saveState(finalState);
  }
}

/**
 * Migration Processor for legacy JSON doctor imports and historical visits with retroactive FIFO
 */
export function migrateDoctorsFromLegacyJson(jsonList: any[]): void {
  const state = getInitialState();
  
  jsonList.forEach((doc) => {
    const workplaceName = (doc.workplace_name || doc.workplaceName || 'مكان عمل غير محدد').trim();
    const doctorName = (doc.doctor_name || doc.doctorName || '').trim();
    if (!doctorName) return;

    // Insert workplace if missing
    let matchedWp = state.workplaces.find(
      (w) => w.name.trim().toLowerCase() === workplaceName.toLowerCase()
    );
    if (!matchedWp) {
      matchedWp = {
        id: `work-mig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: workplaceName,
        latitude: null,
        longitude: null,
      };
      state.workplaces.push(matchedWp);
    }

    // Insert doctor if missing
    let matchedDoc = state.doctors.find(
      (d) => d.name.trim().toLowerCase() === doctorName.toLowerCase()
    );
    if (!matchedDoc) {
      matchedDoc = {
        id: `doc-mig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: doctorName,
        speciality: doc.speciality || 'طب عام',
        classRating: doc.class_rating || doc.classRating || 'C',
      };
      state.doctors.push(matchedDoc);
    }
  });

  saveState(state);
}

export function migrateHistoricalVisitsAndDeductStock(parsedHtmlVisits: any[]): { successCount: number; errors: string[] } {
  // Sort visits chronologically, as retroactive FIFO depends on oldest-first visiting path
  const sorted = [...parsedHtmlVisits].sort((a, b) => {
    return new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime();
  });

  let successCount = 0;
  const errors: string[] = [];

  for (const item of sorted) {
    try {
      const visitDateStr = item.visit_date;
      const doctorName = (item.doctor_name || '').trim();
      const sampleName = (item.sample_name || '').trim();
      const qty = Number(item.quantity_distributed) || 0;
      const workplaceName = (item.workplace_name || 'مكان عمل غير محدد').trim();

      if (!doctorName || !sampleName) {
        throw new Error('اسم الطبيب أو العينة مفقود.');
      }

      const state = getInitialState();
      // Look up doctor
      let matchedDoc = state.doctors.find(
        (d) => d.name.trim().toLowerCase() === doctorName.toLowerCase()
      );
      if (!matchedDoc) {
        // Register doc and workplace implicitly
        migrateDoctorsFromLegacyJson([{
          doctor_name: doctorName,
          workplace_name: workplaceName
        }]);
        const reloadedState = getInitialState();
        matchedDoc = reloadedState.doctors.find(
          (d) => d.name.trim().toLowerCase() === doctorName.toLowerCase()
        );
      }

      // Find workplace
      const finalState = getInitialState();
      const matchedWp = finalState.workplaces.find(
        (w) => w.name.trim().toLowerCase() === workplaceName.toLowerCase()
      );

      // Construct visit payload
      const visitPayload: Omit<VisitLog, 'id'> = {
        visitDate: visitDateStr,
        clientType: 'Doctor',
        doctorName: matchedDoc ? matchedDoc.name : doctorName,
        doctorSpeciality: matchedDoc ? matchedDoc.speciality : 'طب عام',
        doctorClass: matchedDoc ? matchedDoc.classRating : 'C',
        workplaceName: matchedWp ? matchedWp.name : workplaceName,
        latitude: 15.3694, 
        longitude: 44.1910,
        workplaceLatitude: matchedWp ? matchedWp.latitude : null,
        workplaceLongitude: matchedWp ? matchedWp.longitude : null,
        checkInTime: `${visitDateStr}T09:00:00Z`,
        checkOutTime: `${visitDateStr}T09:12:00Z`,
        samples: [{
          sampleName,
          quantityDistributed: qty,
          deductions: [],
        }],
        notes: item.notes || 'زيارة مرحّلة تلقائياً من النظام القديم',
        isUnplanned: false,
      };

      // Deduct stock before adding visit log to test stock level
      const availStock = getSampleStockBalanceForDate(sampleName, visitDateStr);
      if (qty > availStock) {
        throw new Error(`المخزون المتوفر للصنف "${sampleName}" حتى تاريخ ${visitDateStr} هو ${availStock} علبة، وهو غير كاف لتغطية الكمية الموزعة (${qty} علبة).`);
      }

      // Add actual visit log (which performs chronological FIFO details internally)
      addVisitLog(visitPayload);
      successCount++;
    } catch (e: any) {
      errors.push(`🚨 تنبيه مطابقة الهجرة: ${e.message}`);
    }
  }

  return { successCount, errors };
}

