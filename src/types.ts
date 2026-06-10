/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SampleStock {
  sampleName: string;
  totalQuantity: number;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  sampleName: string;
  initialQuantity: number;
  currentQuantity: number;
  expiryDate?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  items: InvoiceItem[];
}

export interface Doctor {
  id: string;
  name: string;
  speciality: string;
  classRating: 'A' | 'B' | 'C';
  workplace1?: string;
  workplace2?: string;
  locationLatitude?: number;
  locationLongitude?: number;
}

export interface Workplace {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
}

export type ClientCategory = 'مستشفى' | 'مركز طبي' | 'عيادة خاصة' | 'صيدلية' | 'Hospital' | 'Medical Center' | 'Private Clinic' | 'Pharmacy';

export interface Client {
  id: string;
  type: ClientCategory;
  name: string;
  address: string;
  locationLatitude?: number;
  locationLongitude?: number;
}

export interface VisitSample {
  sampleName: string;
  quantityDistributed: number;
  // Tracks exactly which invoice item was deducted and how much, for rollback
  deductions: {
    invoiceItemId: string;
    quantityDeducted: number;
  }[];
}

export type AlarmType = 'GEOFENCE_BREACH' | 'GHOST_CALL' | 'INACTIVITY' | 'LATE_START' | 'CLASS_A_NEGLECT';

export interface GuardrailAlarm {
  id: string;
  type: AlarmType;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
  timestamp: string;
}

export interface VisitLog {
  id: string;
  visitDate: string;
  clientType: 'Doctor' | 'Customer';
  doctorName?: string;
  doctorSpeciality?: string;
  doctorClass?: 'A' | 'B' | 'C';
  workplaceName: string;
  latitude: number;
  longitude: number;
  // Used for GPS tracking / geofence breaching
  workplaceLatitude?: number;
  workplaceLongitude?: number;
  checkInTime: string;
  checkOutTime: string;
  samples: VisitSample[];
  notes: string;
  isUnplanned?: boolean;
}

export interface ShiftPlan {
  workplaces: string[];
}

export interface DailyCyclePlan {
  day: string; // 'Saturday' | 'Sunday' | ...
  morning: ShiftPlan;
  evening: ShiftPlan;
}

export interface WeeklyCycle {
  id: string;
  dateFrom: string;
  dateTo: string;
  companyName: string;
  repName: string;
  plans: DailyCyclePlan[];
}

export interface VirtualFile {
  name: string;
  size: string;
  dateModified: string;
  folder: 'BACKUP' | 'DOWNLOAD';
  content: string; // Serialized content or base64 or HTML placeholder
  type: 'backup' | 'pdf' | 'html' | 'csv';
}
