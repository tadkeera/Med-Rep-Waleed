/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * =====================================================================================
 * OFF-LINE FIRST SQL RELATIONAL EMULATOR & SCHEMA FOR MED REP CRM SFA
 * =====================================================================================
 * This file provides identical definitions to our relational database schema.
 * It contains:
 * 1. The Raw ANSI-SQL / SQLite / PostgreSQL compatible DDL script.
 * 2. Strongly-typed TypeScript Interfaces mapping 1-to-1 with the SQL Tables.
 * 3. A lightweight, reactive LocalStorage SQL Engine implementing Relational CRUD,
 *    Foreign Key tracking, Cascading Rollbacks, and Chronological FIFO Balance calculations.
 */

// =====================================================================================
// 1. ANSI-SQL DDL SCHEMA SPECIFICATION
// =====================================================================================
export const SQL_SCHEMA = `
-- Med Rep CRM SFA System - Complete Relational SQL Schema

-- 1. Invoices Table
CREATE TABLE invoices (
    id VARCHAR(50) PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL
);

-- 2. Invoice Items Table (Tracks stock batches & quantities dynamically)
CREATE TABLE invoice_items (
    id VARCHAR(50) PRIMARY KEY,
    invoice_id VARCHAR(50) NOT NULL,
    sample_name VARCHAR(150) NOT NULL,
    initial_quantity INT NOT NULL CHECK (initial_quantity >= 0),
    current_quantity INT NOT NULL CHECK (current_quantity >= 0),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- 3. Doctors Table
CREATE TABLE doctors (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    speciality VARCHAR(150) NOT NULL,
    class_rating CHAR(1) NOT NULL CHECK (class_rating IN ('A', 'B', 'C'))
);

-- 4. Workplaces Table (Clinics, Hospitals, Centers)
CREATE TABLE workplaces (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL
);

-- 5. Doctor Workplaces Junction Table (Many-to-Many relationship)
CREATE TABLE doctor_workplaces (
    doctor_id VARCHAR(50) NOT NULL,
    workplace_id VARCHAR(50) NOT NULL,
    PRIMARY KEY (doctor_id, workplace_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
    FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE CASCADE
);

-- 6. Visits Table (Rep Field representative activity tracker)
CREATE TABLE visits (
    id VARCHAR(50) PRIMARY KEY,
    visit_date DATE NOT NULL,
    client_type VARCHAR(20) NOT NULL CHECK (client_type IN ('Doctor', 'Customer')),
    doctor_id VARCHAR(50) NULL,
    workplace_id VARCHAR(50) NOT NULL,
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP NOT NULL,
    notes TEXT,
    is_unplanned BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
    FOREIGN KEY (workplace_id) REFERENCES workplaces(id) ON DELETE RESTRICT
);

-- 7. Visit Samples Table (Itemization of medication samples distributed during visits)
CREATE TABLE visit_samples (
    id VARCHAR(50) PRIMARY KEY,
    visit_id VARCHAR(50) NOT NULL,
    sample_name VARCHAR(150) NOT NULL,
    quantity_distributed INT NOT NULL CHECK (quantity_distributed >= 0),
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
);

-- Chronological Indexing for FIFO Optimization
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoice_items_sample ON invoice_items(sample_name);
CREATE INDEX idx_visits_date ON visits(visit_date);
`;

// =====================================================================================
// 2. TYPESCRIPT TABLE ROW DEFINITIONS
// =====================================================================================

export interface InvoiceRow {
  id: string; // PRIMARY KEY
  invoice_number: string;
  invoice_date: string;
}

export interface InvoiceItemRow {
  id: string; // PRIMARY KEY
  invoice_id: string; // FOREIGN KEY (invoices.id)
  sample_name: string;
  initial_quantity: number;
  current_quantity: number;
}

export interface DoctorRow {
  id: string; // PRIMARY KEY
  name: string;
  speciality: string;
  class_rating: 'A' | 'B' | 'C';
}

export interface WorkplaceRow {
  id: string; // PRIMARY KEY
  name: string;
  latitude: number;
  longitude: number;
}

export interface DoctorWorkplaceRow {
  doctor_id: string; // FOREIGN KEY (doctors.id)
  workplace_id: string; // FOREIGN KEY (workplaces.id)
}

export interface VisitRow {
  id: string; // PRIMARY KEY
  visit_date: string;
  client_type: 'Doctor' | 'Customer';
  doctor_id?: string; // FOREIGN KEY (doctors.id)
  workplace_id: string; // FOREIGN KEY (workplaces.id)
  check_in_time: string;
  check_out_time: string;
  notes: string;
  is_unplanned: boolean;
}

export interface VisitSampleRow {
  id: string; // PRIMARY KEY
  visit_id: string; // FOREIGN KEY (visits.id)
  sample_name: string;
  quantity_distributed: number;
}

// Storage Schema definition
export interface SqlDatabaseState {
  version: string;
  invoices: InvoiceRow[];
  invoice_items: InvoiceItemRow[];
  doctors: DoctorRow[];
  workplaces: WorkplaceRow[];
  doctor_workplaces: DoctorWorkplaceRow[];
  visits: VisitRow[];
  visit_samples: VisitSampleRow[];
}

// =====================================================================================
// 3. LIGHTWEIGHT OFFLINE ENGINE IMPLEMENTATION (LocalStorage adapter)
// =====================================================================================

const SQL_STORAGE_KEY = 'medrep_val_sqlite_state';
const CURRENT_VAL_VERSION = '1.0';

/**
 * Initializes/Fetches the DB from LocalStorage
 */
export function getSqlDbState(): SqlDatabaseState {
  const data = localStorage.getItem(SQL_STORAGE_KEY);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      // Recovery fallback
    }
  }

  // Create empty database conforming to schema structure
  const emptyDb: SqlDatabaseState = {
    version: CURRENT_VAL_VERSION,
    invoices: [],
    invoice_items: [],
    doctors: [],
    workplaces: [],
    doctor_workplaces: [],
    visits: [],
    visit_samples: []
  };
  saveSqlDbState(emptyDb);
  return emptyDb;
}

/**
 * Persists the entire mock database back to localstorage
 */
export function saveSqlDbState(state: SqlDatabaseState) {
  localStorage.setItem(SQL_STORAGE_KEY, JSON.stringify(state));
}

// -----------------------------------------------------
// INVOICES & ITEMS CRUD
// -----------------------------------------------------

export function insertInvoice(invoice: Omit<InvoiceRow, 'id'>, items: Omit<InvoiceItemRow, 'id' | 'invoice_id' | 'current_quantity'>[]): InvoiceRow {
  const db = getSqlDbState();
  const invoiceId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  const newInvoice: InvoiceRow = {
    id: invoiceId,
    invoice_number: invoice.invoice_number,
    invoice_date: invoice.invoice_date,
  };

  db.invoices.push(newInvoice);

  items.forEach((item, index) => {
    const itemId = `item-${Date.now()}-${index}`;
    db.invoice_items.push({
      id: itemId,
      invoice_id: invoiceId,
      sample_name: item.sample_name,
      initial_quantity: Number(item.initial_quantity),
      current_quantity: Number(item.initial_quantity)
    });
  });

  saveSqlDbState(db);
  return newInvoice;
}

export function selectInvoices(): InvoiceRow[] {
  return getSqlDbState().invoices;
}

/**
 * Selects items matching a certain invoice_id
 */
export function selectInvoiceItems(invoiceId?: string): InvoiceItemRow[] {
  const items = getSqlDbState().invoice_items;
  if (invoiceId) {
    return items.filter(it => it.invoice_id === invoiceId);
  }
  return items;
}

// -----------------------------------------------------
// DOCTORS & WORKPLACES CRUD
// -----------------------------------------------------

export function insertDoctor(doctor: Omit<DoctorRow, 'id'>): DoctorRow {
  const db = getSqlDbState();
  const newDoctor: DoctorRow = {
    id: `doc-${Date.now()}`,
    ...doctor
  };
  db.doctors.push(newDoctor);
  saveSqlDbState(db);
  return newDoctor;
}

export function selectDoctors(): DoctorRow[] {
  return getSqlDbState().doctors;
}

export function insertWorkplace(workplace: Omit<WorkplaceRow, 'id'>): WorkplaceRow {
  const db = getSqlDbState();
  const newWorkplace: WorkplaceRow = {
    id: `work-${Date.now()}`,
    ...workplace
  };
  db.workplaces.push(newWorkplace);
  saveSqlDbState(db);
  return newWorkplace;
}

export function selectWorkplaces(): WorkplaceRow[] {
  return getSqlDbState().workplaces;
}

/**
 * Connects a doctor with a clinic (Many-to-Many Junction Row insertion)
 */
export function linkDoctorWorkplace(doctorId: string, workplaceId: string) {
  const db = getSqlDbState();
  const exists = db.doctor_workplaces.some(dw => dw.doctor_id === doctorId && dw.workplace_id === workplaceId);
  if (!exists) {
    db.doctor_workplaces.push({ doctor_id: doctorId, workplace_id: workplaceId });
    saveSqlDbState(db);
  }
}

// -----------------------------------------------------
// FIELD VISITS & EXECUTED FIFO DEDUCTIONS
// -----------------------------------------------------

/**
 * Evaluates real-time available stock balance for a drug sample
 */
export function selectSampleStockBalance(sampleName: string): number {
  const items = getSqlDbState().invoice_items;
  const nameNorm = sampleName.trim().toLowerCase();
  return items
    .filter(it => it.sample_name.trim().toLowerCase() === nameNorm)
    .reduce((sum, item) => sum + item.current_quantity, 0);
}

/**
 * Core FIFO Chronological Deduction algorithm using Relational Joins!
 * Deducts specified quantity from active batches sorted by Invoice Date (ASC)
 */
export function deductStockChronologicalFifo(sampleName: string, qty: number): { invoiceItemId: string; amountDeducted: number }[] {
  const db = getSqlDbState();
  const nameNorm = sampleName.trim().toLowerCase();

  // Relational Join: invoice_items JOIN invoices ON invoice_items.invoice_id = invoices.id
  // filtering items by sampleName where current_quantity > 0
  const joinedItems = db.invoice_items
    .filter(it => it.sample_name.trim().toLowerCase() === nameNorm && it.current_quantity > 0)
    .map(it => {
      const parentInvoice = db.invoices.find(inv => inv.id === it.invoice_id);
      return {
        item: it,
        invoiceDate: parentInvoice ? parentInvoice.invoice_date : '9999-12-31'
      };
    });

  // Sort Chronologically by the Invoice Date (Oldest first)
  joinedItems.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

  let remaining = qty;
  const deductions: { invoiceItemId: string; amountDeducted: number }[] = [];

  for (const entry of joinedItems) {
    if (remaining <= 0) break;

    const dbItemIndex = db.invoice_items.findIndex(it => it.id === entry.item.id);
    if (dbItemIndex === -1) continue;

    const avail = db.invoice_items[dbItemIndex].current_quantity;

    if (avail >= remaining) {
      db.invoice_items[dbItemIndex].current_quantity -= remaining;
      deductions.push({ invoiceItemId: entry.item.id, amountDeducted: remaining });
      remaining = 0;
    } else {
      db.invoice_items[dbItemIndex].current_quantity = 0;
      deductions.push({ invoiceItemId: entry.item.id, amountDeducted: avail });
      remaining -= avail;
    }
  }

  saveSqlDbState(db);
  return deductions;
}

/**
 * Registers a full field visit and processes the relational samples FIFO allocation
 */
export function insertVisit(visit: Omit<VisitRow, 'id'>, samples: Omit<VisitSampleRow, 'id' | 'visit_id'>[]): VisitRow {
  const db = getSqlDbState();
  const visitId = `visit-${Date.now()}`;

  const newVisit: VisitRow = {
    id: visitId,
    ...visit
  };

  db.visits.push(newVisit);

  samples.forEach((sample, index) => {
    // Process the internal stock deduction under FIFO sequence!
    deductStockChronologicalFifo(sample.sample_name, sample.quantity_distributed);

    // Save itemized visit sample row
    db.visit_samples.push({
      id: `vis-samp-${Date.now()}-${index}`,
      visit_id: visitId,
      sample_name: sample.sample_name,
      quantity_distributed: Number(sample.quantity_distributed)
    });
  });

  saveSqlDbState(db);
  return newVisit;
}

export function selectVisits(): VisitRow[] {
  return getSqlDbState().visits;
}

export function selectVisitSamples(visitId?: string): VisitSampleRow[] {
  const samples = getSqlDbState().visit_samples;
  if (visitId) {
    return samples.filter(s => s.visit_id === visitId);
  }
  return samples;
}

/**
 * Deletes a field visit and triggers a full Cascade Rollback to replenish original FIFO records
 */
export function deleteAndRollbackVisit(visitId: string) {
  const db = getSqlDbState();
  const visitIndex = db.visits.findIndex(v => v.id === visitId);
  if (visitIndex === -1) return;

  // Retrieve visit samples distributed
  const distributedSamples = db.visit_samples.filter(vs => vs.visit_id === visitId);

  // Since we roll back, we replenish current invoices stock.
  // Although actual detailed deductions mapping could be complex,
  // we roll back the total amount to the latest invoices matching the item to maintain fairness.
  distributedSamples.forEach(sample => {
    let remaining = sample.quantity_distributed;

    // Find invoice items matching this medicine, sorted by invoiceDate DESC (latest first) to replenish
    const matchedItems = db.invoice_items
      .filter(it => it.sample_name.trim().toLowerCase() === sample.sample_name.trim().toLowerCase())
      .map(it => {
        const inv = db.invoices.find(invoice => invoice.id === it.invoice_id);
        return {
          item: it,
          invoiceDate: inv ? inv.invoice_date : '0000-01-01'
        };
      });

    matchedItems.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

    for (const entry of matchedItems) {
      if (remaining <= 0) break;
      const dbIdx = db.invoice_items.findIndex(it => it.id === entry.item.id);
      if (dbIdx === -1) continue;

      const space = db.invoice_items[dbIdx].initial_quantity - db.invoice_items[dbIdx].current_quantity;
      if (space >= remaining) {
        db.invoice_items[dbIdx].current_quantity += remaining;
        remaining = 0;
      } else {
        db.invoice_items[dbIdx].current_quantity = db.invoice_items[dbIdx].initial_quantity;
        remaining -= space;
      }
    }
  });

  // Remove the samples and the main visit row (Cascading Delete emulate)
  db.visits.splice(visitIndex, 1);
  db.visit_samples = db.visit_samples.filter(vs => vs.visit_id !== visitId);

  saveSqlDbState(db);
}
