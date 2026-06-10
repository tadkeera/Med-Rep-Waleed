/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Invoice, InvoiceItem, Doctor, Workplace, VisitLog, WeeklyCycle, VirtualFile, VisitSample, Client } from '../types';

// Constants
const DB_VERSION = '1.1';
const STORAGE_PREFIX = 'medrep_db_';

interface DatabaseState {
  version: string;
  invoices: Invoice[];
  doctors: Doctor[];
  workplaces: Workplace[];
  visits: VisitLog[];
  weeklyCycles: WeeklyCycle[];
  files: VirtualFile[];
  clients: Client[]; // Add clients here
  settings: {
    serverUrl: string;
    apiKey: string;
    language: 'ar' | 'en';
  };
}

// =====================================================================================
// INDEXEDDB PRE-BOOT SYNCHRONIZATION ENGINE
// =====================================================================================

/**
 * Pre-boot initialization: Loads state from IndexedDB to memory/localStorage synchronously
 * before React mounts the virtual DOM tree, preventing data caps and page flicker.
 */
export function initIndexedDB(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('MedRepSecureIDB_v2', 1);
      request.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('state_store')) {
          db.createObjectStore('state_store');
        }
      };
      request.onsuccess = (e: any) => {
        const db = e.target.result;
        const tx = db.transaction('state_store', 'readonly');
        const store = tx.objectStore('state_store');
        const getReq = store.get('current_state');
        getReq.onsuccess = () => {
          if (getReq.result) {
            localStorage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify(getReq.result));
          }
          resolve();
        };
        getReq.onerror = () => resolve();
      };
      request.onerror = () => resolve();
    } catch (err) {
      console.warn('IndexedDB unavailable, falling back to local storage:', err);
      resolve();
    }
  });
}

export function getInitialState(): DatabaseState {
  const stored = localStorage.getItem(`${STORAGE_PREFIX}state`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.version === DB_VERSION) {
        if (!parsed.clients) {
          parsed.clients = [];
        }
        if (!parsed.files) {
          parsed.files = [];
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing stored state, resetting with empty data', e);
    }
  }

  // Set default empty initial state
  const state: DatabaseState = {
    version: DB_VERSION,
    invoices: [],
    doctors: [],
    workplaces: [],
    visits: [],
    weeklyCycles: [],
    files: [],
    clients: [],
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
  // 1. Sync immediately to localStorage for fast synchronous operations
  localStorage.setItem(`${STORAGE_PREFIX}state`, JSON.stringify(state));

  // 2. Persist in IndexedDB asynchronously for permanent safety
  try {
    const request = indexedDB.open('MedRepSecureIDB_v2', 1);
    request.onsuccess = (e: any) => {
      const db = e.target.result;
      const tx = db.transaction('state_store', 'readwrite');
      const store = tx.objectStore('state_store');
      store.put(state, 'current_state');
    };
  } catch (err) {
    console.error('Failed to sync to IndexedDB', err);
  }
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

  newInvoice.items = newInvoice.items.map((item, idx) => ({
    ...item,
    id: `item-${Date.now()}-${idx}`,
    invoiceId: newInvoice.id,
    currentQuantity: item.initialQuantity,
  }));

  state.invoices.push(newInvoice);
  saveState(state);
  return newInvoice;
}

/**
 * Standardizes medicine sample names from the old legacy systems
 */
export function standardizeSampleName(name: string): string {
  if (!name) return '';
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  const norm = lower
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي');

  if (norm.includes('ميلاتونين') || norm.includes('ملاتونين') || norm.includes('melatonin')) {
    return 'ميلاتونين كبسول';
  }
  if (norm.includes('انرجكس تو جو') || norm.includes('انرجكس توجوا') || norm.includes('انرجيكس تو جو') || norm.includes('energex to go')) {
    return 'انرجكس تو جو امبول';
  }
  if (norm.includes('ملتي ادلت') || norm.includes('ادلت') || norm.includes('adult') || norm.includes('البالغين') || (norm.includes('ملتي') && norm.includes('فيتامين'))) {
    return 'ملتي فيتامين البالغين';
  }
  if (norm.includes('كالسيوم') || norm.includes('كاليسوم') || norm.includes('calcium')) {
    return 'فيمنكس كاليسوم';
  }
  if (norm.includes('جينكو') || norm.includes('ginkgo') || norm.includes('جينكو بيلوا') || norm.includes('جينكو بيلوبا')) {
    return 'جينكو بيلوبا كبسول';
  }
  if (norm.includes('سوبر انرجكس') || norm.includes('سوبر انرجيكس') || norm.includes('سوبرانرجكس') || norm.includes('super energex')) {
    return 'سوبر انرجكس كبسول';
  }
  if (norm.includes('جلوكزامين') || norm.includes('جلوكوزامين') || norm.includes('glucosamine') || norm.includes('msm')) {
    return 'جلوكوزامين ام اس ام';
  }
  if (norm.includes('كولاجين') || norm.includes('collagen')) {
    return 'كولاجين (90) كبسول';
  }
  if (norm.includes('جوجوينت') || norm.includes('gojoint')) {
    return 'جوجوينت شراب';
  }
  if (norm.includes('كرانبري') || norm.includes('كرانبيري') || norm.includes('cranberry')) {
    return 'فيمنكس كرانبيري 10000';
  }
  if (norm.includes('فيبر بلس') || norm.includes('فايبر بلس') || norm.includes('fiber plus')) {
    return 'فيبر بلس كبسول';
  }
  if (norm.includes('ديجست 365') || norm.includes('ديجست') || norm.includes('digest')) {
    return 'ديجست 365 كبسول';
  }
  if (norm.includes('ارثري') || norm.includes('أرثري') || norm.includes('ارثري فلكس') || norm.includes('arthri')) {
    return 'ارثري فلكس كريم';
  }
  if (norm.includes('نيوفلكس') || norm.includes('newflex')) {
    return 'نيوفلكس جوينت';
  }
  if (norm.includes('ريلاكسين داي') || norm.includes('relaxin day')) {
    return 'ريلاكسين داي';
  }
  if (norm.includes('ريلاكسين نايت') || norm.includes('relaxin night')) {
    return 'ريلاكسين نايت';
  }
  if (norm.includes('ليوتن') || norm.includes('lutein')) {
    return 'ليوتن كبسول';
  }

  const exactMappings: { [key: string]: string } = {
    'جوجوينت شراب': 'جوجوينت شراب',
    'كرانبري 10000': 'فيمنكس كرانبيري 10000',
    'فمنكس كرانبري 10000': 'فيمنكس كرانبيري 10000',
    'ميلاتونين اقراص': 'ميلاتونين كبسول',
    'ميلاتونين أقراص': 'ميلاتونين كبسول',
    'انرجكس تو جو': 'انرجكس تو جو امبول',
    'ملتي ادلت اقراص': 'ملتي فيتامين البالغين',
    'فمنكس كالسيوم': 'فيمنكس كاليسوم',
    'فيمنكس كالسيوم': 'فيمنكس كاليسوم',
    'كولاجين': 'كولاجين (90) كبسول',
    'كولاجين (90) كبسول': 'كولاجين (90) كبسول',
    'ديجست 365 كبسول': 'ديجست 365 كبسول',
    'ارثري فلكس كريم': 'ارثري فلكس كريم',
    'اوميجا 3 كبسول': 'جلوكوزامين ام اس ام',
    'جلوكزامين msm': 'جلوكوزامين ام اس ام',
  };

  if (exactMappings[trimmed]) return exactMappings[trimmed];
  if (exactMappings[lower]) return exactMappings[lower];
  return trimmed;
}

export function searchAutocomplete(type: 'sample' | 'doctor' | 'workplace', query: string): string[] {
  if (query.trim().length < 3) return [];
  const state = getInitialState();
  const q = query.toLowerCase();

  if (type === 'sample') {
    const sampleNames = new Set<string>();
    state.invoices.forEach((inv) => inv.items.forEach((item) => sampleNames.add(item.sampleName)));
    return Array.from(sampleNames).filter((name) => name.toLowerCase().includes(q));
  } else if (type === 'doctor') {
    return state.doctors.map((d) => d.name).filter((name) => name.toLowerCase().includes(q));
  } else if (type === 'workplace') {
    return state.workplaces.map((w) => w.name).filter((name) => name.toLowerCase().includes(q));
  }
  return [];
}

export function registerNewEntity(type: 'doctor' | 'workplace', name: string, extra?: any): any {
  const state = getInitialState();
  const id = `${type === 'doctor' ? 'doc' : 'work'}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

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

export function updateDoctor(doctorId: string, updates: Partial<Doctor>): Doctor | null {
  const state = getInitialState();
  const index = state.doctors.findIndex(d => d.id === doctorId);
  if (index === -1) return null;

  const originalName = state.doctors[index].name;
  const updatedDoc = { ...state.doctors[index], ...updates };
  state.doctors[index] = updatedDoc;

  // If the doctor name changed, we also need to update all VisitLogs to maintain referential integrity
  if (updates.name && updates.name !== originalName) {
    state.visits.forEach(v => {
      if (v.clientType === 'Doctor' && v.doctorName === originalName) {
        v.doctorName = updates.name;
        // Optionally update the class rating if it was changed
        if (updates.classRating) {
          v.doctorClass = updates.classRating;
        }
        if (updates.speciality) {
          v.doctorSpeciality = updates.speciality;
        }
      }
    });
  } else if (updates.classRating || updates.speciality) {
     // Even if name didn't change, update the class and speciality in visits 
     state.visits.forEach(v => {
      if (v.clientType === 'Doctor' && v.doctorName === originalName) {
        if (updates.classRating) v.doctorClass = updates.classRating;
        if (updates.speciality) v.doctorSpeciality = updates.speciality;
      }
    });
  }

  saveState(state);
  return updatedDoc;
}

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

export function deductFifoStock(sampleName: string, quantity: number, visitDate?: string): { invoiceItemId: string; quantityDeducted: number }[] {
  const state = getInitialState();
  const nameNorm = sampleName.trim().toLowerCase();

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

  items.sort((a, b) => new Date(a.parentDate).getTime() - new Date(b.parentDate).getTime());

  let remaining = quantity;
  const deductions: { invoiceItemId: string; quantityDeducted: number }[] = [];

  for (const entry of items) {
    if (remaining <= 0) break;

    const avail = entry.item.currentQuantity;
    if (avail >= remaining) {
      state.invoices[entry.parentIndex].items[entry.itemIndex].currentQuantity -= remaining;
      deductions.push({
        invoiceItemId: entry.item.id,
        quantityDeducted: remaining,
      });
      remaining = 0;
    } else {
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

export function addVisitLog(visit: Omit<VisitLog, 'id'>): VisitLog {
  const id = `visit-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  const processedSamples: VisitSample[] = visit.samples.map((sample) => {
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

  const finalState = getInitialState();
  finalState.visits.push(finalVisit);
  saveState(finalState);
  return finalVisit;
}

export function deleteVisitLog(visitId: string) {
  const state = getInitialState();
  const visitIndex = state.visits.findIndex((v) => v.id === visitId);
  if (visitIndex === -1) return;

  const visit = state.visits[visitIndex];

  visit.samples.forEach((sample) => {
    sample.deductions.forEach((ded) => {
      state.invoices.forEach((inv, pIdx) => {
        inv.items.forEach((it, iIdx) => {
          if (it.id === ded.invoiceItemId) {
            state.invoices[pIdx].items[iIdx].currentQuantity += ded.quantityDeducted;
          }
        });
      });
    });
  });

  state.visits.splice(visitIndex, 1);
  saveState(state);
}

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

export function saveVirtualFile(file: VirtualFile) {
  const state = getInitialState();
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

export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

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

  state.visits.forEach((v) => {
    // Determine the target locations based on Doctor
    let targetLat = v.workplaceLatitude;
    let targetLon = v.workplaceLongitude;

    if (v.clientType === 'Doctor' && v.doctorName) {
      const doc = state.doctors.find(d => d.name === v.doctorName);
      if (doc && doc.locationLatitude !== undefined && doc.locationLongitude !== undefined) {
        targetLat = doc.locationLatitude;
        targetLon = doc.locationLongitude;
      }
    }

    if (v.latitude && v.longitude && targetLat && targetLon) {
      const dist = calculateDistance(v.latitude, v.longitude, targetLat, targetLon);
      if (dist > 100) {
        alarms.push({
          id: `geofence-${v.id}`,
          type: 'Geofencing Breach',
          titleAr: '🚨 خرق جيو-جغرافي (Geofencing Breach)',
          titleEn: '🚨 Geofencing Breach',
          descriptionAr: `الزيارة للطبيب ${v.doctorName || 'عميل'} في مكان ${v.workplaceName} تبعد أكثر من ${Math.round(dist)}م عن الإحداثيات الحقيقية للطبيب.`,
          descriptionEn: `Visit to ${v.doctorName || 'Client'} at ${v.workplaceName} is recorded ${Math.round(dist)}m away from doctor's real coordinates.`,
          severity: 'red',
        });
      }
    }
  });

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

  const visitsByDate: { [date: string]: VisitLog[] } = {};
  state.visits.forEach((v) => {
    const d = v.visitDate;
    if (!visitsByDate[d]) visitsByDate[d] = [];
    visitsByDate[d].push(v);
  });

  Object.entries(visitsByDate).forEach(([date, list]) => {
    const sorted = [...list].sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
    const firstVisit = sorted[0];
    const lastVisit = sorted[sorted.length - 1];

    const firstCheckIn = new Date(firstVisit.checkInTime);
    const lastCheckOut = new Date(lastVisit.checkOutTime);

    const firstHour = firstCheckIn.getHours() + firstCheckIn.getMinutes() / 60;
    const lastHour = lastCheckOut.getHours() + lastCheckOut.getMinutes() / 60;

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

    if (lastHour < 11.5 && list.length < 3) {
      alarms.push({
        id: `early-close-${date}`,
        type: 'Early End',
        titleAr: '🚨 إنهاء مبكر للعمل الميداني (Early End)',
        titleEn: '🚨 Early End Alert',
        descriptionAr: `التاريخ ${date}: انتهى آخر نشاط ميداني موثق مبكراً في تمام الساعة ${lastCheckOut.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}.`,
        descriptionEn: `Date ${date}: Active field operations ended early at ${lastCheckOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}).`,
        severity: 'red',
      });
    }
  });

  Object.entries(visitsByDate).forEach(([date, list]) => {
    const sorted = [...list].sort((a, b) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
    for (let i = 0; i < sorted.length - 1; i++) {
      const endPrev = new Date(sorted[i].checkOutTime).getTime();
      const startNext = new Date(sorted[i + 1].checkInTime).getTime();
      const gapMins = (startNext - endPrev) / 1000 / 60;
      if (gapMins > 110) {
        alarms.push({
          id: `inactivity-${date}-${i}`,
          type: 'Inactivity Alert',
          titleAr: '🚨 فجوة خمول ميداني (Inactivity Alert)',
          titleEn: '🚨 Inactivity Alert',
          descriptionAr: `التاريخ ${date}: فجوة خمول ميداني مدتها ${(gapMins / 60).toFixed(1)} ساعة بين زيارة ${sorted[i].doctorName || 'العميل'} والزيارة التي تليها.`,
          descriptionEn: `Date ${date}: Long field gap of ${(gapMins / 60).toFixed(1)} hours detected between visits.`,
          severity: 'red',
        });
      }
    }
  });

  const classADoctors = state.doctors.filter((d) => d.classRating === 'A');
  const now = new Date().getTime();
  
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

  const visitsByDoc: { [doc: string]: number } = {};
  state.visits.forEach((v) => {
    if (v.doctorName) {
      const vTime = new Date(v.visitDate).getTime();
      const diffDays = (now - vTime) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7 && diffDays >= 0) {
        visitsByDoc[v.doctorName] = (visitsByDoc[v.doctorName] || 0) + 1;
      }
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

export function purgeDatabase() {
  const emptyState: DatabaseState = {
    version: DB_VERSION,
    invoices: [],
    doctors: [],
    workplaces: [],
    visits: [],
    weeklyCycles: [],
    files: [],
    clients: [],
    settings: {
      serverUrl: 'https://ais-dev-si6uixl2yb6tgxnqbihxge-5901476095.europe-west1.run.app/api',
      apiKey: 'MY_GEMINI_API_KEY',
      language: 'ar',
    },
  };
  saveState(emptyState);
  
  localStorage.removeItem('medrep_representative_name');
  localStorage.removeItem('medrep_representative_grade');
  localStorage.removeItem('corporate_logo');
}

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
    visit.samples.splice(sampleIndex, 1);
  }

  saveState(state);

  const availableStock = getSampleStockBalanceForDate(sampleName, visitDate);
  if (newQuantity > availableStock) {
    throw new Error(`CONSTRAINTS_VIOLATION: الكمية المطلوبة تتجاوز المخزون المقيد بالتاريخ! المتاح هو ${availableStock}`);
  }

  let deductions: { invoiceItemId: string; quantityDeducted: number }[] = [];
  if (newQuantity > 0) {
    deductions = deductFifoStock(sampleName, newQuantity, visitDate);
  }

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

export function updateFullVisitLog(
  visitId: string,
  updatedData: {
    workplaceName?: string;
    workplace2Name?: string;
    doctorClass?: 'A' | 'B' | 'C';
    samples: { sampleName: string; quantityDistributed: number }[];
    notes?: string;
  }
): void {
  const state = getInitialState();
  const visitIndex = state.visits.findIndex((v) => v.id === visitId);
  if (visitIndex === -1) {
    throw new Error('الزيارة غير موجودة في سجلات النظام.');
  }

  const visit = state.visits[visitIndex];

  visit.samples.forEach((oldSample) => {
    oldSample.deductions.forEach((ded) => {
      state.invoices.forEach((inv, pIdx) => {
        inv.items.forEach((it, iIdx) => {
          if (it.id === ded.invoiceItemId) {
            state.invoices[pIdx].items[iIdx].currentQuantity += ded.quantityDeducted;
          }
        });
      });
    });
  });

  saveState(state);

  const visitDate = visit.visitDate;
  for (const sItem of updatedData.samples) {
    if (sItem.quantityDistributed <= 0) continue;
    const avail = getSampleStockBalanceForDate(sItem.sampleName, visitDate);
    if (sItem.quantityDistributed > avail) {
      throw new Error(
        `المخزون المتوفر للصنف "${sItem.sampleName}" حتى تاريخ ${visitDate} هو ${avail} علبة، وهو غير كاف لتغطية الكمية المعدلة المطلوبة (${sItem.quantityDistributed} علبة).`
      );
    }
  }

  const newSamplesWithDeductions: VisitSample[] = [];
  for (const sItem of updatedData.samples) {
    let deductions: { invoiceItemId: string; quantityDeducted: number }[] = [];
    if (sItem.quantityDistributed > 0) {
      deductions = deductFifoStock(sItem.sampleName, sItem.quantityDistributed, visitDate);
    }
    newSamplesWithDeductions.push({
      sampleName: sItem.sampleName,
      quantityDistributed: sItem.quantityDistributed,
      deductions,
    });
  }

  const finalState = getInitialState();
  const finalVisit = finalState.visits.find((v) => v.id === visitId);
  if (!finalVisit) {
    throw new Error('فشل استرجاع الزيارة للتحديث النهائي');
  }

  if (updatedData.workplaceName) {
    const wpTrimmed = updatedData.workplaceName.trim();
    // Update the edited visit's workplace
    finalVisit.workplaceName = wpTrimmed;

    let matchedWp = finalState.workplaces.find(
      (w) => w.name.trim().toLowerCase() === wpTrimmed.toLowerCase()
    );
    if (!matchedWp) {
      matchedWp = {
        id: `work-mig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: wpTrimmed,
        latitude: null,
        longitude: null,
      };
      finalState.workplaces.push(matchedWp);
    }
    finalVisit.workplaceLatitude = matchedWp.latitude ?? undefined;
    finalVisit.workplaceLongitude = matchedWp.longitude ?? undefined;
  }

  // Handle secondary workplace insertion
  let wp2Trimmed = '';
  if (updatedData.workplace2Name) {
    wp2Trimmed = updatedData.workplace2Name.trim();
    if (wp2Trimmed) {
      let matchedWp2 = finalState.workplaces.find(
        (w) => w.name.trim().toLowerCase() === wp2Trimmed.toLowerCase()
      );
      if (!matchedWp2) {
        matchedWp2 = {
          id: `work-mig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          name: wp2Trimmed,
          latitude: null,
          longitude: null,
        };
        finalState.workplaces.push(matchedWp2);
      }
    }
  }

  if (finalVisit.doctorName) {
    const docName = finalVisit.doctorName.trim();
    const docIndex = finalState.doctors.findIndex(
      (d) => d.name.trim().toLowerCase() === docName.toLowerCase()
    );
    
    // Update Doctor record
    if (docIndex !== -1) {
      if (updatedData.doctorClass) {
        finalState.doctors[docIndex].classRating = updatedData.doctorClass;
      }
      if (updatedData.workplaceName) {
        finalState.doctors[docIndex].workplace1 = updatedData.workplaceName.trim();
      }
      if (updatedData.workplace2Name) {
        finalState.doctors[docIndex].workplace2 = wp2Trimmed;
      }
    }

    // Cascade changes to all historical visits for this doctor
    const combinedWorkplaceName = [updatedData.workplaceName?.trim(), wp2Trimmed].filter(Boolean).join(' و ');

    finalState.visits.forEach((v) => {
      // "Historical" visit check: notes include phrase from the old system
      if (v.doctorName === docName && v.notes?.includes('النظام القديم')) {
        if (updatedData.doctorClass) {
          v.doctorClass = updatedData.doctorClass;
        }
        if (combinedWorkplaceName) {
          v.workplaceName = combinedWorkplaceName;
        }
      }
    });

    if (updatedData.doctorClass) {
      finalVisit.doctorClass = updatedData.doctorClass;
    }
  }

  if (updatedData.notes !== undefined) {
    finalVisit.notes = updatedData.notes;
  }

  finalVisit.samples = newSamplesWithDeductions;
  saveState(finalState);
}

export function recomputeAllFifoDeductions(): {
  success: boolean;
  processedVisitsCount: number;
  totalDeductionsCount: number;
  insufficientStockAlarms: string[];
} {
  const state = getInitialState();
  const alarms: string[] = [];

  state.invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      item.currentQuantity = item.initialQuantity;
    });
  });

  saveState(state);

  const sortedVisits = [...state.visits].sort((a, b) => new Date(a.visitDate).getTime() - new Date(b.visitDate).getTime());

  let totalDeductions = 0;

  for (let i = 0; i < sortedVisits.length; i++) {
    const visit = sortedVisits[i];
    const dateStr = visit.visitDate;

    visit.samples = visit.samples.map((sample) => {
      const requestedQty = sample.quantityDistributed;
      if (requestedQty <= 0) {
        return {
          sampleName: sample.sampleName,
          quantityDistributed: requestedQty,
          deductions: [],
        };
      }

      const available = getSampleStockBalanceForDate(sample.sampleName, dateStr);
      if (requestedQty > available) {
        alarms.push(
          `التاريخ: ${dateStr} - الطبيب: ${visit.doctorName || 'عميل'}: عينة "${sample.sampleName}" المطلوب: ${requestedQty}، المتوفر: ${available}`
        );
      }

      const deductions = deductFifoStock(sample.sampleName, requestedQty, dateStr);
      totalDeductions += deductions.reduce((acc, d) => acc + d.quantityDeducted, 0);

      return {
        sampleName: sample.sampleName,
        quantityDistributed: requestedQty,
        deductions,
      };
    });

    const stateToSave = getInitialState();
    const vIdx = stateToSave.visits.findIndex((v) => v.id === visit.id);
    if (vIdx !== -1) {
      stateToSave.visits[vIdx].samples = visit.samples;
      saveState(stateToSave);
    }
  }

  return {
    success: true,
    processedVisitsCount: sortedVisits.length,
    totalDeductionsCount: totalDeductions,
    insufficientStockAlarms: alarms,
  };
}

export function wipeAllMigratedVisitsAndRestoreStock(): { deletedCount: number } {
  const state = getInitialState();
  const originalCount = state.visits.length;

  state.visits = state.visits.filter((v) => {
    if (!v) return false;
    const dateStr = typeof v.visitDate === 'string' ? v.visitDate.trim() : '';
    const notesStr = typeof v.notes === 'string' ? v.notes : '';

    const isImported = dateStr.startsWith('2026-01') ||
                       dateStr.startsWith('2026-02') ||
                       dateStr.startsWith('2026-03') ||
                       dateStr.startsWith('2026-04') ||
                       dateStr.includes('2026/01') ||
                       dateStr.includes('2026/02') ||
                       dateStr.includes('2026/03') ||
                       dateStr.includes('2026/04') ||
                       notesStr.includes('مرحلة') ||
                       notesStr.includes('مرحّلة') ||
                       notesStr.includes('القديم') ||
                       notesStr.includes('تلقائياً') ||
                       notesStr.includes('MediaFire') ||
                       notesStr.includes('mediafire') ||
                       notesStr.includes('يناير') ||
                       notesStr.includes('فبراير') ||
                       notesStr.includes('مارس') ||
                       notesStr.includes('ابريل') ||
                       notesStr.includes('إبريل') ||
                       notesStr.includes('تمهيدية') ||
                       notesStr.includes('ترويجية') ||
                       notesStr.includes('متابعة');
    return !isImported;
  });

  const deletedCount = originalCount - state.visits.length;

  state.invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      item.currentQuantity = item.initialQuantity;
    });
  });

  saveState(state);

  if (state.visits.length > 0) {
    recomputeAllFifoDeductions();
  }

  return { deletedCount };
}

export function getClients(): Client[] {
  return getInitialState().clients || [];
}

export function addClient(clientPayload: Omit<Client, 'id'>): Client {
  const state = getInitialState();
  const id = `client-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const newClient: Client = { ...clientPayload, id };
  state.clients.push(newClient);
  saveState(state);
  return newClient;
}

export function updateClient(clientId: string, updates: Partial<Client>): Client | null {
  const state = getInitialState();
  const index = state.clients.findIndex(c => c.id === clientId);
  if (index === -1) return null;
  const updatedClient = { ...state.clients[index], ...updates };
  state.clients[index] = updatedClient;
  saveState(state);
  return updatedClient;
}

export function wipeAllDataComplete(): { deletedVisitsCount: number; deletedDoctorsCount: number } {
  const state = getInitialState();
  const deletedVisitsCount = state.visits.length;
  const deletedDoctorsCount = state.doctors.length;

  state.visits = [];
  state.doctors = [];
  state.workplaces = [];
  state.weeklyCycles = [];
  state.clients = [];

  state.invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      item.currentQuantity = item.initialQuantity;
    });
  });

  saveState(state);
  return { deletedVisitsCount, deletedDoctorsCount };
}

export function migrateDoctorsFromLegacyJson(jsonList: any[]): void {
  const state = getInitialState();
  
  jsonList.forEach((doc) => {
    const workplaceName = (doc.workplace_name || doc.workplaceName || 'مكان عمل غير محدد').trim();
    const doctorName = (doc.doctor_name || doc.doctorName || doc.name || '').trim();
    if (!doctorName) return;

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

    let matchedDoc = state.doctors.find(
      (d) => d.name.trim().toLowerCase() === doctorName.toLowerCase()
    );
    if (!matchedDoc) {
      matchedDoc = {
        id: `doc-mig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: doctorName,
        speciality: doc.speciality || doc.specialty || 'طب عام',
        classRating: doc.class_rating || doc.classRating || 'C',
      };
      state.doctors.push(matchedDoc);
    }
  });

  saveState(state);
}

export function migrateHistoricalVisitsAndDeductStock(parsedHtmlVisits: any[]): { successCount: number; errors: string[] } {
  const sorted = [...parsedHtmlVisits].sort((a, b) => {
    const dateA = a.visit_date || a.date || '';
    const dateB = b.visit_date || b.date || '';
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  let successCount = 0;
  const errors: string[] = [];

  for (const item of sorted) {
    try {
      const visitDateStr = item.visit_date || item.date;
      const doctorName = (item.doctor_name || item.doctor || '').trim();
      const workplaceName = (item.workplace_name || item.workplace || 'مكان عمل غير محدد').trim();

      if (!visitDateStr) throw new Error('تاريخ الزيارة مفقود.');
      if (!doctorName) throw new Error('اسم الطبيب مفقود.');

      const state = getInitialState();
      let matchedDoc = state.doctors.find(
        (d) => d.name.trim().toLowerCase() === doctorName.toLowerCase()
      );
      if (!matchedDoc) {
        migrateDoctorsFromLegacyJson([{
          doctor_name: doctorName,
          workplace_name: workplaceName,
          speciality: item.specialty || item.speciality
        }]);
        const reloadedState = getInitialState();
        matchedDoc = reloadedState.doctors.find(
          (d) => d.name.trim().toLowerCase() === doctorName.toLowerCase()
        );
      }

      const finalState = getInitialState();
      const matchedWp = finalState.workplaces.find(
        (w) => w.name.trim().toLowerCase() === workplaceName.toLowerCase()
      );

      const sampleItems: VisitSample[] = [];
      if (item.items && Array.isArray(item.items)) {
        for (const subItem of item.items) {
          const rawName = (subItem.name || subItem.sample_name || '').trim();
          const sName = standardizeSampleName(rawName);
          const sQty = Number(subItem.quantity || subItem.quantity_distributed) || 0;
          if (sName) {
            sampleItems.push({ sampleName: sName, quantityDistributed: sQty, deductions: [] });
          }
        }
      } else {
        const rawName = (item.sample_name || '').trim();
        const sampleName = standardizeSampleName(rawName);
        const qty = Number(item.quantity_distributed) || 0;
        if (sampleName) {
          sampleItems.push({ sampleName, quantityDistributed: qty, deductions: [] });
        }
      }

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
        samples: sampleItems,
        notes: item.notes || 'زيارة مرحّلة تلقائياً من النظام القديم',
        isUnplanned: false,
      };

      for (const sItem of sampleItems) {
        const availStock = getSampleStockBalanceForDate(sItem.sampleName, visitDateStr);
        if (sItem.quantityDistributed > availStock) {
          throw new Error(`المخزون المتوفر للصنف "${sItem.sampleName}" حتى تاريخ ${visitDateStr} هو ${availStock} علبة، وهو غير كاف لتغطية الكمية الموزعة (${sItem.quantityDistributed} علبة).`);
        }
      }

      addVisitLog(visitPayload);
      successCount++;
    } catch (e: any) {
      errors.push(`🚨 تنبيه مطابقة الهجرة: ${e.message}`);
    }
  }

  return { successCount, errors };
}
