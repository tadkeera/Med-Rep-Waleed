/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getInitialState, saveVirtualFile, deleteVirtualFile, saveState } from '../utils/db';
import { VirtualFile } from '../types';
import { Folder, Database, Download, Trash, RefreshCw, Upload, Search, Check, AlertTriangle, FileJson, Clock } from 'lucide-react';
import { motion } from 'motion/react';

interface FileManagerViewProps {
  lang: 'ar' | 'en';
}

export default function FileManagerView({ lang }: FileManagerViewProps) {
  const [db, setDb] = useState(getInitialState());
  const [activeFolder, setActiveFolder] = useState<'BACKUP' | 'DOWNLOAD'>('BACKUP');
  const [searchTerm, setSearchTerm] = useState('');

  // Backup restore interceptor
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackupFile, setSelectedBackupFile] = useState<VirtualFile | null>(null);

  const reloadRegistry = () => {
    setDb(getInitialState());
  };

  useEffect(() => {
    reloadRegistry();
  }, []);

  const t = {
    ar: {
      title: 'إدارة مخزن الملفات والنسخ الاحتياطي (SFA File Manager)',
      backupFolder: 'مجلد النسخ الاحتياطية (BACKUP)',
      downloadFolder: 'مجلد التقارير المصدرة (DOWNLOAD)',
      backupBtn: 'توليد نسخة احتياطية فورية (.json)',
      restoreBtn: 'استرجاع البيانات (Restore Database)',
      downloadAction: 'حفظ للمساعد الميداني',
      deleteAction: 'حذف مسح المستند',
      size: 'الحجم:',
      modified: 'تاريخ التحديث:',
      searchPlaceholder: 'ابحث عن ملف باسمه...',
      backupSuccess: 'تم إنشاء وحفظ ومسح نسخة الأمان الذاتي بنجاح في المسار /Med Rep/BACKUP/ !',
      deleteSuccess: 'تم مسح المستند نهائياً من دليل الملفات المؤرشفة.',
      restoreSuccess: 'تمت مراجعة واستعادة قاعدة البيانات بالكامل بنجاح من النسخة المحددة ومطابقة السجلات!',
      restoreTitle: 'تأكيد استعادة النسخة الاحتياطية ⚠️',
      restoreDesc: 'تنبيـــه: استعادة ملف "[NAME]" سيؤدي لحذف وتخطي أي بيانات حالية واسترجاع السجل المعياري المخزن بالكامل. هل ترغب فعلاً في المتابعة؟',
      yesRestore: 'نعم، استعد السجلات بالكامل',
      cancel: 'تراجع',
      noFiles: 'الدليل فارغ حالياً. لا توجد مستندات مدرجة.',
      dragDropLabel: 'اسحب ملف قاعدة بيانات لاستيراده هنا يدويًا',
    },
    en: {
      title: 'SFA File System & Backups',
      backupFolder: 'BACKUP Folder (/Med Rep/BACKUP/)',
      downloadFolder: 'DOWNLOAD Folder (/Med Rep/DOWNLOAD/)',
      backupBtn: 'Trigger Local Database Backup',
      restoreBtn: 'Restore Database',
      downloadAction: 'Save File',
      deleteAction: 'Delete Doc',
      size: 'Size:',
      modified: 'Modified:',
      searchPlaceholder: 'Search document name...',
      backupSuccess: 'Full system backup written successfully to local folder: /Med Rep/BACKUP/',
      deleteSuccess: 'Virtual document purged successfully.',
      restoreSuccess: 'Local state restored successfully. FIFO chains mapped and synchronized!',
      restoreTitle: 'Approve Restore Request ⚠️',
      restoreDesc: 'Warning: Restoring "[NAME]" will overwrite your ongoing local databases. Do you want to process custom overwrite?',
      yesRestore: 'Yes, overwrite local DB',
      cancel: 'Cancel',
      noFiles: 'Directory is empty. No files generated yet.',
      dragDropLabel: 'Drag and drop database backup here to upload manually',
    },
  }[lang];

  // Backup Trigger - Serialize State to virtual JSON file
  const handleTriggerBackup = () => {
    const currentState = getInitialState();
    const backupDataString = JSON.stringify(currentState, null, 2);
    
    const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').substring(0, 19);
    const fileName = `med_rep_backup_${timestamp}.json`;

    saveVirtualFile({
      name: fileName,
      size: `${(backupDataString.length / 1024).toFixed(2)} KB`,
      dateModified: new Date().toISOString().replace('T', ' ').substring(0, 16),
      folder: 'BACKUP',
      content: backupDataString,
      type: 'backup',
    });

    reloadRegistry();
    alert(t.backupSuccess);
  };

  // Delete document
  const handleDeleteDoc = (doc: VirtualFile) => {
    if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من مسح الملف نهائياً؟' : 'Are you sure you want to delete this file permanently?')) {
      deleteVirtualFile(doc.name, doc.folder);
      reloadRegistry();
      alert(t.deleteSuccess);
    }
  };

  // Restore State Trigger
  const handleRestoreState = () => {
    if (!selectedBackupFile || !selectedBackupFile.content) return;

    try {
      const parsed = JSON.parse(selectedBackupFile.content);
      // Basic schema validation check
      if (parsed.invoices && parsed.visits && parsed.doctors) {
        saveState(parsed);
        setShowRestoreModal(false);
        setSelectedBackupFile(null);
        reloadRegistry();
        alert(t.restoreSuccess);
      } else {
        alert(lang === 'ar' ? 'تعذر التحقق من سلامة البنية؛ الملف لا يطابق بنية Med Rep.' : 'Invalid file schema. Make sure this is a genuine Med Rep backup.');
      }
    } catch (e) {
      alert(lang === 'ar' ? 'فشل قراءة ملف جيسون JSON للبيانات الاحتياطية.' : 'Failed to parse database file content.');
    }
  };

  // Simulated browser file download
  const handleDownloadFile = (doc: VirtualFile) => {
    const blob = new Blob([doc.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Simulate import a backup JSON file from the user's hard drive
  const handleImportBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const fileContent = reader.result as string;
          // Just parse to see if it's a valid JSON before saving it as a backup document
          const parsed = JSON.parse(fileContent);
          if (parsed.invoices && parsed.visits && parsed.doctors) {
            saveVirtualFile({
              name: file.name,
              size: `${(fileContent.length / 1024).toFixed(2)} KB`,
              dateModified: new Date().toISOString().replace('T', ' ').substring(0, 16),
              folder: 'BACKUP',
              content: fileContent,
              type: 'backup',
            });
            reloadRegistry();
            alert(lang === 'ar' ? 'تم استيراد ملف النسخة الاحتياطية بنجاح. يمكنك الآن الضغط على استعادة.' : 'Backup file imported successfully. You can now restore it.');
          } else {
            alert(lang === 'ar' ? 'نمط الملف غير صحيح، تأكد انه ملف نسخة Med Rep' : 'Invalid file format, ensure it is a Med Rep backup');
          }
        } catch (err) {
            alert(lang === 'ar' ? 'حدث خطأ أثناء قراءة الملف.' : 'Error reading file.');
        }
      };
      reader.readAsText(file);
      // reset file input
      e.target.value = '';
    }
  };

  // Filter doc lists
  const filteredDocs = db.files.filter((f) => {
    const matchesFolder = f.folder === activeFolder;
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <div className="space-y-6 fade-in text-slate-800" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Title header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-150 text-indigo-700 rounded-xl border border-indigo-100">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{t.title}</h2>
            <p className="text-xs text-slate-500">
              {lang === 'ar' 
                ? 'حافظ على سلامة عينات فواتير التوريد وسجلات التفويض الميداني في حلقة مغلقة.' 
                : 'Safely maintain client details, invoices, and visit logs offline.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerBackup}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/15 cursor-pointer"
        >
          <Database className="w-4 h-4" />
          {t.backupBtn}
        </button>
      </div>

      {/* Tabs folder block and search bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Nav tabs folder */}
        <div className="flex bg-slate-100 p-1 rounded-xl max-w-sm w-full border border-slate-200 shrink-0">
          <button
            type="button"
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeFolder === 'BACKUP' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => {
              setActiveFolder('BACKUP');
              setSearchTerm('');
            }}
          >
            {lang === 'ar' ? 'النسخ الاحتياطية (BACKUP)' : 'SFA BACKUPS'}
          </button>
          <button
            type="button"
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeFolder === 'DOWNLOAD' ? 'bg-white text-slate-950 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => {
              setActiveFolder('DOWNLOAD');
              setSearchTerm('');
            }}
          >
            {lang === 'ar' ? 'التقارير (DOWNLOAD)' : 'REPORTS DOWN'}
          </button>
        </div>

        {/* Live Search bar */}
        <div className="relative">
          <input
            type="text"
            placeholder={t.searchPlaceholder}
            className="w-full bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs outline-none font-medium transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>
      </div>

      {/* Lists of file grid and metadata summaries */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm min-h-[300px] flex flex-col justify-between">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-50 pb-2 mb-4">
          {activeFolder === 'BACKUP' ? t.backupFolder : t.downloadFolder}
        </h3>

        {filteredDocs.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-4 bg-slate-50 text-slate-400 rounded-full border border-slate-150">
              <Folder className="w-8 h-8" />
            </div>
            <p className="text-xs text-slate-400 font-medium capitalize">{t.noFiles}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
            {filteredDocs.map((doc) => (
              <div 
                key={doc.name}
                className="border border-slate-100 hover:border-slate-200 bg-slate-50/40 hover:bg-slate-50/85 rounded-xl p-4 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${activeFolder === 'BACKUP' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {doc.type === 'backup' ? <FileJson className="w-5 h-5" /> : <Folder className="w-5 h-5" />}
                  </div>
                  
                  <div className="space-y-1 overflow-hidden">
                    <div className="text-xs font-bold text-slate-800 break-all truncate font-mono" title={doc.name}>
                      {doc.name}
                    </div>
                    
                    <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                      <span>{t.size} <strong className="text-slate-600 font-mono">{doc.size}</strong></span>
                    </div>

                    <div className="text-[9px] text-slate-400 font-medium font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-300" />
                      {doc.dateModified}
                    </div>
                  </div>
                </div>

                {/* Operations buttons footer list */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  {/* Restore Action button (Only in BACKUP folder directory) */}
                  {activeFolder === 'BACKUP' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBackupFile(doc);
                        setShowRestoreModal(true);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {lang === 'ar' ? 'استعادة' : 'Restore'}
                    </button>
                  )}

                  {/* Fetch physically block download browser click */}
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(doc)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    {lang === 'ar' ? 'تحميل' : 'Save'}
                  </button>

                  {/* Purge block */}
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(doc)}
                    className="p-1.5 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                    title={t.deleteAction}
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drag and drop manual selector block indicator */}
        <label className="mt-4 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-xl p-6 bg-slate-50/50 hover:bg-slate-50 flex flex-col items-center justify-center text-center space-y-2 cursor-pointer transition-colors block">
          <Upload className="w-5 h-5 text-indigo-500" />
          <span className="text-xs text-slate-600 font-bold">{t.dragDropLabel}</span>
          <input
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportBackupFile}
          />
        </label>
      </div>

      {/* Database state JSON overwrite confirmation popup */}
      {showRestoreModal && selectedBackupFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-100 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <h4 className="font-extrabold text-slate-950 text-base">{t.restoreTitle}</h4>
            </div>

            <p className="text-xs leading-relaxed text-slate-600">
              {t.restoreDesc.replace('[NAME]', selectedBackupFile.name)}
            </p>

            <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-50">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setSelectedBackupFile(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleRestoreState}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
              >
                {t.yesRestore}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
