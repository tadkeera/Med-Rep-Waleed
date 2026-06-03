/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, addInvoice, searchAutocomplete, saveState } from '../utils/db';
import { Invoice, InvoiceItem } from '../types';
import { Plus, Trash, Database, Calendar, PlusCircle, AlertCircle, Check, Search } from 'lucide-react';

interface InvoicesViewProps {
  lang: 'ar' | 'en';
}

export default function InvoicesView({ lang }: InvoicesViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Array item array state
  const [items, setItems] = useState<Omit<InvoiceItem, 'id' | 'invoiceId' | 'currentQuantity' | 'expiryDate'>[]>([
    { sampleName: '', initialQuantity: 10 },
  ]);

  // Autocomplete UI support
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [newSampleCandidate, setNewSampleCandidate] = useState('');

  const reloadDb = () => {
    setDb(getInitialState());
  };

  useEffect(() => {
    reloadDb();
  }, []);

  const t = {
    ar: {
      title: 'إدخال فواتير عينات الأدوية والمستودع',
      newInvoice: 'تسجيل فاتورة توريد جديدة',
      invNumber: 'رقم الفاتورة/الباتش',
      invDate: 'تاريخ استلام الشحنة',
      sampleName: 'اسم الصنف الدوائي',
      qty: 'الكمية المستلمة',
      expiry: 'تاريخ الصلاحية',
      addAction: 'إضافة صنف آخر الفاتورة',
      saveAction: 'حفظ الفاتورة وتجهيز الـ FIFO',
      existingInventory: 'دفتر الأستاذ الحالي وحصص المخزون المتاحة (رتبت للـ FIFO)',
      activeBatches: 'الباتشات النشطة بترتيب أسبقية الصدور التراكمي',
      quantityLeft: 'المتبقي',
      totalInitial: 'الكمية الأصلية',
      isExpired: 'تاريخ انتهاء الصلاحية',
      noInvoices: 'المستودع فارغ كلياً. الرجاء تسجيل فاتورة توريد عينات أدوية أولاً.',
      newSampleAlertTitle: 'صنف دوائي مستحدث جديد 🔍',
      newSampleAlertDesc: 'العنصر الدوائي "[NAME]" غير مسجل مسبقاً في قاعدة بيانات المستودع. هل ترغب فعلاً في اعتماده وإضافته إلى فهارس البحث التلقائي لتلافي حدوث الازدواجية؟',
      yesSave: 'نعم، قم بالاعتماد وحفظ الصنف',
      cancel: 'تراجع وإعادة تصحيح',
      successLogged: 'تم تسجيل شحنة الفاتورة بنجاح في المستندات وتجهيزها للاستقطاع FIFO!',
    },
    en: {
      title: 'Sample Invoices & Warehouse Entry',
      newInvoice: 'Log New Incoming Invoice / Batch',
      invNumber: 'Invoice / Batch Number',
      invDate: 'Invoice Receipt Date',
      sampleName: 'Sample Medicine Name',
      qty: 'Recieved initial Qty',
      expiry: 'Expiry Date',
      addAction: 'Add Another Medicine Block',
      saveAction: 'Commit Invoice & Seed FIFO',
      existingInventory: 'Current Ledger & Available Stock Balance (Sorted for FIFO)',
      activeBatches: 'Active Chronological Batches (Ready for deduction)',
      quantityLeft: 'Balance Left',
      totalInitial: 'Initial Qty',
      isExpired: 'Expiry Date',
      noInvoices: 'Warehouse is empty. Please register or import a sample batch.',
      newSampleAlertTitle: 'New Medicine Detected 🔍',
      newSampleAlertDesc: 'The medicine entry "[NAME]" is brand new. Do you want to approve and register it inside the active database to prevent spelling duplicates?',
      yesSave: 'Yes, register and continue',
      cancel: 'Cancel & Re-edit',
      successLogged: 'Invoice committed successfully. FIFO queues initialized!',
    },
  }[lang];

  // Validate autocomplete on keypress
  const handleSampleNameChange = (rowIdx: number, val: string) => {
    const updated = [...items];
    updated[rowIdx].sampleName = val;
    setItems(updated);

    if (val.length >= 3) {
      const matches = searchAutocomplete('sample', val);
      setAutocompleteResults(matches);
      setActiveRowIdx(rowIdx);
    } else {
      setAutocompleteResults([]);
      setActiveRowIdx(null);
    }
  };

  const selectAutoComplete = (rowIdx: number, name: string) => {
    const updated = [...items];
    updated[rowIdx].sampleName = name;
    setItems(updated);
    setAutocompleteResults([]);
    setActiveRowIdx(null);
  };

  const addAnotherRow = () => {
    setItems([...items, { sampleName: '', initialQuantity: 10 }]);
  };

  const removeRow = (rowIdx: number) => {
    if (items.length === 1) return;
    const filter = items.filter((_, idx) => idx !== rowIdx);
    setItems(filter);
  };

  const handleFieldChange = (rowIdx: number, field: string, val: any) => {
    const updated = [...items];
    (updated[rowIdx] as any)[field] = val;
    setItems(updated);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) return;

    // Check if any sample name is new (not in databases yet)
    // Gather all existing samples in db
    const currentSamples = new Set<string>();
    db.invoices.forEach(inv => inv.items.forEach(it => currentSamples.add(it.sampleName.trim().toLowerCase())));

    let foundNewSampleCandidate = '';
    for (const it of items) {
      if (it.sampleName.trim() && !currentSamples.has(it.sampleName.trim().toLowerCase())) {
        foundNewSampleCandidate = it.sampleName.trim();
        break; // focus on one new sample at a time
      }
    }

    if (foundNewSampleCandidate) {
      setNewSampleCandidate(foundNewSampleCandidate);
      setShowConfirmModal(true);
      return;
    }

    // Save invoice
    saveActiveInvoice();
  };

  const saveActiveInvoice = () => {
    const finalItems = items.map((it) => ({
      sampleName: it.sampleName.trim(),
      initialQuantity: Number(it.initialQuantity),
      currentQuantity: Number(it.initialQuantity),
      expiryDate: '',
    }));

    addInvoice({
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate,
      items: finalItems as any[],
    });

    // Reset Form
    setInvoiceNumber('');
    setItems([{ sampleName: '', initialQuantity: 10 }]);
    reloadDb();
    alert(t.successLogged);
  };

  const confirmNewSampleAndSave = () => {
    setShowConfirmModal(false);
    // Proceed with saving of invoice since the user confirmed adding the new sample item to database
    saveActiveInvoice();
  };

  // Group FIFO Ledger nicely for visualization
  const sortedInvoiceBatches = [...db.invoices].sort(
    (a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
  );

  return (
    <div className="space-y-6 fade-in text-slate-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
          <Database className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.title}</h2>
          <p className="text-xs text-slate-500">
            {lang === 'ar' 
              ? 'تتم تصفية الشحنات بناءً على نظرية الوارد أولاً يصرف أولاً (FIFO) بالتاريخ الأقدم.' 
              : 'Batches are processed using First-In First-Out (FIFO) chronological deduction.'}
          </p>
        </div>
      </div>

      {/* Form Card Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* New Invoice Form */}
        <div className="xl:col-span-2 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-6">
          <div className="border-b border-slate-50 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-500" />
              {t.newInvoice}
            </h3>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">{t.invNumber}</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BATCH-2026-X"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all font-mono"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">{t.invDate}</label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all font-mono"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Repeatable Items Block */}
            <div className="space-y-4">
              <div className="text-xs font-bold text-slate-500 mb-2 border-b border-slate-150 pb-1">
                {lang === 'ar' ? 'أصناف التوريد الطبية' : 'Invoice Medicine Rows'}
              </div>

              {items.map((it, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-4 relative">
                  {/* Delete row */}
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="absolute top-2.5 left-2.5 md:top-4 md:left-4 p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Autocomplete Name Field */}
                    <div className="space-y-1.5 md:col-span-1 relative">
                      <label className="text-xs font-semibold text-slate-600">{t.sampleName}</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          placeholder={lang === 'ar' ? 'مثال: باندول، كونكور...' : 'e.g., Panadol, Augmentin'}
                          className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                          value={it.sampleName}
                          onChange={(e) => handleSampleNameChange(idx, e.target.value)}
                        />
                        <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
                      </div>

                      {/* Dropdown Results Box */}
                      {activeRowIdx === idx && autocompleteResults.length > 0 && (
                        <div className="absolute z-20 w-full bg-white border border-slate-200 rounded-lg mt-1 shadow-lg max-h-40 overflow-y-auto divide-y divide-slate-50">
                          {autocompleteResults.map((name) => (
                            <button
                              key={name}
                              type="button"
                              onClick={() => selectAutoComplete(idx, name)}
                              className="w-full text-right md:text-left px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 font-medium transition-colors"
                            >
                              {name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Numeric Quantity */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-600">{t.qty}</label>
                      <input
                        type="number"
                        required
                        min="1"
                        className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm outline-none font-mono"
                        value={it.initialQuantity}
                        onChange={(e) => handleFieldChange(idx, 'initialQuantity', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 border-t border-slate-50">
              <button
                type="button"
                onClick={addAnotherRow}
                className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {t.addAction}
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-blue-500/15 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {t.saveAction}
              </button>
            </div>
          </form>
        </div>

        {/* Current SFA Chronological FIFO Ledger */}
        <div className="xl:col-span-1 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              {t.existingInventory}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">{t.activeBatches}</p>
          </div>

          <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
            {sortedInvoiceBatches.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                {t.noInvoices}
              </div>
            ) : (
              sortedInvoiceBatches.map((inv) => (
                <div key={inv.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 hover:bg-slate-50 transition-all space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-blue-600 font-mono">{inv.invoiceNumber}</span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {inv.invoiceDate}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {inv.items.map((it) => (
                      <div key={it.id} className="bg-white border border-slate-100 rounded-lg p-2.5 flex justify-between items-center">
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-slate-800">{it.sampleName}</div>
                        </div>

                        <div className="text-left font-mono">
                          <div className="text-xs font-extrabold text-slate-900">
                            {it.currentQuantity} <span className="text-[9px] text-slate-400 font-light font-sans">{t.quantityLeft}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">
                            {it.initialQuantity} {t.totalInitial}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Autocomplete Interceptor Pop-up UI */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 space-y-4 shadow-xl">
            <div className="flex items-center gap-3.5 text-blue-600">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-extrabold text-slate-950 text-base">{t.newSampleAlertTitle}</h4>
            </div>

            <p className="text-xs leading-relaxed text-slate-600 py-1">
              {t.newSampleAlertDesc.replace('[NAME]', newSampleCandidate)}
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-50">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={confirmNewSampleAndSave}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                {t.yesSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
